const express = require('express');
const router = express.Router();
const { Pengiriman, NotaPengiriman, Produksi, Order, BlockchainIdentity, sequelize } = require('../models');
const { generateKodePengiriman, generateKodeBlock } = require('../utils/codeGenerator');
const { createTransferToRetailBlock } = require('../utils/blockchain');
const { authMiddleware, adminOnly } = require('../middlewares/auth');
const { getRetailerConnection, getKurirConnection } = require('../config/crossChainDatabase');
const { Sequelize } = require('sequelize');

// GET /api/pengiriman
router.get('/', authMiddleware, async (req, res) => {
    try {
        const pengirimanList = await Pengiriman.findAll({
            include: [
                { model: Produksi, as: 'produksi', attributes: ['KodeProduksi', 'JenisAyam', 'IdOrder'] },
                { model: NotaPengiriman, as: 'nota' },
            ],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: pengirimanList });
    } catch (error) {
        console.error('Get pengiriman error:', error);
        res.status(500).json({ message: 'Gagal mengambil data pengiriman.' });
    }
});

// GET /api/pengiriman/retailers — fetch retailers from retailer database (cross-chain)
router.get('/retailers', authMiddleware, async (req, res) => {
    try {
        const retailerConn = getRetailerConnection();
        if (!retailerConn) {
            return res.json({ data: [] });
        }
        const [retailers] = await retailerConn.query(
            'SELECT IdRetailer, KodeRetailer, NamaRetailer, AlamatRetailer, KontakRetailer FROM retailer ORDER BY NamaRetailer'
        );
        res.json({ data: retailers });
    } catch (error) {
        console.error('Get retailers error:', error);
        res.json({ data: [] });
    }
});

// GET /api/pengiriman/kurir-tracking — get Kurir Leg 2 tracking info (cross-chain)
router.get('/kurir-tracking', authMiddleware, async (req, res) => {
    try {
        const kurirConn = getKurirConnection();
        if (!kurirConn) {
            return res.json({ data: [] });
        }

        // Find all Kurir shipments that reference Processor's KodePengiriman
        const trackingData = await kurirConn.query(
            `SELECT p.KodePengiriman AS KodePengirimanKurir,
                    p.ReferensiEksternal AS KodePengirimanProcessor,
                    p.StatusPengiriman AS StatusKurir,
                    p.TanggalPickup,
                    p.AsalPengirim,
                    p.TujuanPenerima AS TujuanKurir,
                    p.AlamatTujuan,
                    p.KeteranganPengiriman,
                    k.NamaKurir,
                    k.NoTelp AS KontakKurir,
                    btt.KodeBukti,
                    btt.TanggalTerima AS TanggalPickupBukti,
                    btt.NamaPengirim AS NamaPengirimBukti,
                    btt.NamaPenerima AS NamaPenerimaBukti,
                    btt.JumlahBarang,
                    btt.BeratTotal,
                    npk.KodeNota AS KodeNotaKurir,
                    npk.TanggalSampai,
                    npk.NamaPenerima AS PenerimaAkhir,
                    npk.KondisiBarang,
                    npk.Keterangan AS KeteranganNota
             FROM Pengiriman p
             LEFT JOIN Kurir k ON p.KodeKurir = k.KodeKurir
             LEFT JOIN BuktiTandaTerima btt ON btt.KodePengiriman = p.KodePengiriman
             LEFT JOIN NotaPengirimanKurir npk ON npk.KodePengiriman = p.KodePengiriman
             WHERE p.TipePengiriman = 'PROCESSOR_TO_RETAILER'
               AND p.ReferensiEksternal IS NOT NULL
             ORDER BY p.createdAt DESC`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        res.json({ data: trackingData });
    } catch (error) {
        console.error('Get kurir tracking error:', error);
        res.json({ data: [] });
    }
});

// POST /api/pengiriman — create shipment (creates TRANSFER_TO_RETAIL block)
// The blockchain data goes to Kurir Leg 2 first, then to Retailer
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idProduksi, tujuanPengiriman, namaPenerima, kontakPenerima,
            tanggalKirim, jumlahKirim, beratKirim, metodePengiriman, namaEkspedisi, catatan,
            kodeRetailer, namaRetailer, alamatRetailer,
        } = req.body;

        if (!idProduksi || !tujuanPengiriman || !namaPenerima || !tanggalKirim || !jumlahKirim) {
            await t.rollback();
            return res.status(400).json({ message: 'Data pengiriman tidak lengkap.' });
        }

        const kodePengiriman = await generateKodePengiriman(sequelize, t);
        const pengiriman = await Pengiriman.create({
            KodePengiriman: kodePengiriman,
            IdProduksi: idProduksi,
            TujuanPengiriman: tujuanPengiriman,
            NamaPenerima: namaPenerima,
            KontakPenerima: kontakPenerima || null,
            TanggalKirim: tanggalKirim,
            JumlahKirim: jumlahKirim,
            BeratKirim: beratKirim || 0,
            MetodePengiriman: metodePengiriman || 'DIANTAR',
            NamaEkspedisi: namaEkspedisi || null,
            StatusPengiriman: 'DIKIRIM',
            Catatan: catatan || null,
        }, { transaction: t });

        // Create TRANSFER_TO_RETAIL blockchain block
        const produksi = await Produksi.findByPk(idProduksi, { transaction: t });
        let processorLastHash = null;

        if (produksi) {
            const identity = await BlockchainIdentity.findOne({
                where: { IdOrder: produksi.IdOrder, StatusChain: 'ACTIVE' },
                transaction: t,
            });

            if (identity) {
                const kodeBlock = await generateKodeBlock(sequelize, t);
                const block = await createTransferToRetailBlock(sequelize, {
                    idIdentity: identity.IdIdentity,
                    idOrder: produksi.IdOrder,
                    idProduksi: idProduksi,
                    kodeBlock,
                    kodePengiriman,
                    kodeProduksi: produksi.KodeProduksi,
                    tujuanPengiriman,
                    namaPenerima,
                    jumlahKirim,
                    beratKirim: beratKirim || 0,
                    metodePengiriman: metodePengiriman || 'DIANTAR',
                    tanggalKirim,
                    transaction: t,
                });

                processorLastHash = block.currentHash;

                // NOTE: Kurir Leg 2 will be created when the Kurir platform
                // discovers this shipment via "Permintaan Masuk" (incoming requests).
                // The Kurir reads from Processor DB and the admin accepts + assigns a courier.
                // This ensures proper separation of concerns between nodes.
            }

            // Update produksi & order status
            await produksi.update({ StatusProduksi: 'SELESAI' }, { transaction: t });
            await Order.update(
                { StatusOrder: 'SELESAI' },
                { where: { IdOrder: produksi.IdOrder }, transaction: t }
            );
        }

        await t.commit();

        // ====================================================================
        // CROSS-DB AUTO SYNC: Update Retailer order to DIKIRIM
        // so Retailer can see the shipment is being prepared and sent.
        // Best-effort, non-blocking.
        // ====================================================================
        try {
            const retailerConn = getRetailerConnection();
            if (retailerConn) {
                // Find the matching Retailer order and update status
                const recipientName = namaPenerima || namaRetailer || '';
                const [retOrder] = await retailerConn.query(
                    `SELECT o.IdOrder, o.KodeOrder FROM orders o
                     LEFT JOIN retailer r ON o.IdRetailer = r.IdRetailer
                     WHERE r.NamaRetailer = :namaRetailer
                       AND o.StatusOrder IN ('PENDING', 'DIPROSES')
                     ORDER BY o.CreatedAt ASC LIMIT 1`,
                    { type: Sequelize.QueryTypes.SELECT, replacements: { namaRetailer: recipientName } }
                );

                if (retOrder) {
                    await retailerConn.query(
                        `UPDATE orders SET StatusOrder = 'DIKIRIM', UpdatedAt = NOW() WHERE IdOrder = :idOrder`,
                        { type: Sequelize.QueryTypes.UPDATE, replacements: { idOrder: retOrder.IdOrder } }
                    );
                    console.log(`[Processor Pengiriman] Auto-updated Retailer order ${retOrder.KodeOrder} to DIKIRIM`);
                }
            }
        } catch (syncErr) {
            console.warn('[Processor Pengiriman] Cross-DB Retailer update failed (non-blocking):', syncErr.message);
        }

        res.status(201).json({ message: 'Pengiriman berhasil dicatat. Menunggu kurir menerima permintaan pengiriman.', data: pengiriman });
    } catch (error) {
        await t.rollback();
        console.error('Create pengiriman error:', error);
        res.status(500).json({ message: 'Gagal mencatat pengiriman.' });
    }
});

// PUT /api/pengiriman/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const pengiriman = await Pengiriman.findByPk(req.params.id);
        if (!pengiriman) return res.status(404).json({ message: 'Pengiriman tidak ditemukan.' });

        const { statusPengiriman, tanggalSampai, catatan } = req.body;
        await pengiriman.update({
            StatusPengiriman: statusPengiriman || pengiriman.StatusPengiriman,
            TanggalSampai: tanggalSampai || pengiriman.TanggalSampai,
            Catatan: catatan !== undefined ? catatan : pengiriman.Catatan,
        });

        res.json({ message: 'Pengiriman berhasil diperbarui.', data: pengiriman });
    } catch (error) {
        console.error('Update pengiriman error:', error);
        res.status(500).json({ message: 'Gagal memperbarui pengiriman.' });
    }
});

module.exports = router;
