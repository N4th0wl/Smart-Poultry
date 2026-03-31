const express = require('express');
const router = express.Router();
const { Order, User, sequelize, BlockchainIdentity, LedgerProcessor } = require('../models');
const { generateKodeOrder, generateKodeIdentity, generateKodeBlock } = require('../utils/codeGenerator');
const { createReceiveFromFarmBlock, generateHash, GENESIS_PREV_HASH } = require('../utils/blockchain');
const { authMiddleware, adminOnly } = require('../middlewares/auth');
const { getRetailerConnection, getPeternakanConnection } = require('../config/crossChainDatabase');
const { Sequelize } = require('sequelize');

// GET /api/orders/peternakan - Get list of Peternakan
router.get('/peternakan', authMiddleware, async (req, res) => {
    try {
        const petConn = getPeternakanConnection();
        const farms = await petConn.query(
            `SELECT KodePeternakan, NamaPeternakan, LokasiPeternakan AS AlamatPeternakan
             FROM peternakan`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        res.json({ data: farms });
    } catch (error) {
        console.error('Get peternakan list error:', error);
        res.status(500).json({ message: 'Gagal mengambil data peternakan.' });
    }
});

// GET /api/orders/stock-summary — check available production stock
router.get('/stock-summary', authMiddleware, async (req, res) => {
    try {
        // Find produksi items that are SELESAI or LULUS_QC and haven't been fully shipped
        const stockData = await sequelize.query(`
            SELECT 
                p.JenisAyam,
                SUM(p.JumlahOutput) AS TotalProduksi,
                COALESCE(SUM(pg.JumlahKirim), 0) AS TotalDikirim,
                SUM(p.JumlahOutput) - COALESCE(SUM(pg.JumlahKirim), 0) AS StokTersedia,
                SUM(p.BeratTotal) AS TotalBerat,
                COUNT(DISTINCT p.IdProduksi) AS JumlahBatch
            FROM produksi p
            LEFT JOIN pengiriman pg ON pg.IdProduksi = p.IdProduksi AND pg.StatusPengiriman != 'GAGAL'
            WHERE p.StatusProduksi IN ('SELESAI', 'LULUS_QC')
            GROUP BY p.JenisAyam
        `, { type: Sequelize.QueryTypes.SELECT });

        const totalAvailable = stockData.reduce((sum, s) => sum + (parseInt(s.StokTersedia) || 0), 0);

        res.json({
            data: {
                stockByType: stockData,
                totalAvailable,
                hasStock: totalAvailable > 0
            }
        });
    } catch (error) {
        console.error('Stock summary error:', error);
        res.status(500).json({ message: 'Gagal mengambil ringkasan stok.' });
    }
});

// GET /api/orders
router.get('/', authMiddleware, async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [{ model: User, as: 'pembuat', attributes: ['KodeUser', 'Email'] }],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Gagal mengambil data order.' });
    }
});

// GET /api/orders/retailer-orders - Fetch incoming orders from Retailer database
router.get('/retailer-orders', authMiddleware, async (req, res) => {
    try {
        const retConn = getRetailerConnection();
        const orders = await retConn.query(
            `SELECT o.IdOrder, o.KodeOrder, o.NamaProduk, o.JenisProduk, o.JumlahPesanan, 
                    o.Satuan, o.TanggalDibutuhkan, o.StatusOrder, o.Catatan,
                    r.NamaRetailer, r.AlamatRetailer, r.KontakRetailer, r.KodeRetailer
             FROM orders o
             LEFT JOIN retailer r ON o.IdRetailer = r.IdRetailer
             ORDER BY o.CreatedAt DESC`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        res.json({ data: orders });
    } catch (error) {
        console.error('Get retailer orders error:', error);
        res.status(500).json({ message: 'Gagal mengambil data pesanan dari Retailer.' });
    }
});

// PUT /api/orders/retailer-orders/:id/confirm - Confirm a Retailer order (updates Retailer DB)
router.put('/retailer-orders/:id/confirm', authMiddleware, adminOnly, async (req, res) => {
    try {
        const retConn = getRetailerConnection();
        const { id } = req.params;

        await retConn.query(
            `UPDATE orders SET StatusOrder = 'DIPROSES', UpdatedAt = NOW() WHERE IdOrder = :id AND StatusOrder = 'PENDING'`,
            { type: Sequelize.QueryTypes.UPDATE, replacements: { id } }
        );

        res.json({ message: 'Pesanan Retailer dikonfirmasi. Status diubah ke DIPROSES.' });
    } catch (error) {
        console.error('Confirm retailer order error:', error);
        res.status(500).json({ message: 'Gagal mengkonfirmasi pesanan retailer.' });
    }
});

// PUT /api/orders/retailer-orders/:id/dikirim - Mark Retailer order as shipped (updates Retailer DB)
router.put('/retailer-orders/:id/dikirim', authMiddleware, adminOnly, async (req, res) => {
    try {
        const retConn = getRetailerConnection();
        const { id } = req.params;

        await retConn.query(
            `UPDATE orders SET StatusOrder = 'DIKIRIM', UpdatedAt = NOW() WHERE IdOrder = :id AND StatusOrder IN ('PENDING', 'DIPROSES')`,
            { type: Sequelize.QueryTypes.UPDATE, replacements: { id } }
        );

        res.json({ message: 'Pesanan Retailer ditandai sebagai DIKIRIM.' });
    } catch (error) {
        console.error('Mark retailer order as dikirim error:', error);
        res.status(500).json({ message: 'Gagal mengupdate status pesanan retailer.' });
    }
});

// GET /api/orders/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id, {
            include: [{ model: User, as: 'pembuat', attributes: ['KodeUser', 'Email'] }],
        });
        if (!order) return res.status(404).json({ message: 'Order tidak ditemukan.' });
        res.json({ data: order });
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ message: 'Gagal mengambil data order.' });
    }
});

// POST /api/orders — admin creates order
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            kodePeternakan, namaPeternakan, alamatPeternakan, kontakPeternakan,
            jenisAyam, jumlahPesanan, satuan,
            tanggalOrder, tanggalDibutuhkan, hargaSatuan, catatan,
        } = req.body;

        if (!namaPeternakan || !jenisAyam || !jumlahPesanan || !tanggalOrder || !tanggalDibutuhkan) {
            await t.rollback();
            return res.status(400).json({ message: 'Data order tidak lengkap.' });
        }

        const kodeOrder = await generateKodeOrder(sequelize, t);
        const totalHarga = (hargaSatuan || 0) * jumlahPesanan;

        const order = await Order.create({
            KodeOrder: kodeOrder,
            IdProcessor: req.user.idProcessor,
            KodePeternakan: kodePeternakan || null,
            NamaPeternakan: namaPeternakan,
            AlamatPeternakan: alamatPeternakan || null,
            KontakPeternakan: kontakPeternakan || null,
            JenisAyam: jenisAyam,
            JumlahPesanan: jumlahPesanan,
            Satuan: satuan || 'EKOR',
            TanggalOrder: tanggalOrder,
            TanggalDibutuhkan: tanggalDibutuhkan,
            HargaSatuan: hargaSatuan || 0,
            TotalHarga: totalHarga,
            Catatan: catatan || null,
            DibuatOleh: req.user.id,
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'Order berhasil dibuat.', data: order });
    } catch (error) {
        await t.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Gagal membuat order.' });
    }
});

// PUT /api/orders/:id — update order
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order tidak ditemukan.' });

        const updateData = {};
        const fields = [
            'namaPeternakan', 'alamatPeternakan', 'kontakPeternakan',
            'jenisAyam', 'jumlahPesanan', 'satuan',
            'tanggalDibutuhkan', 'hargaSatuan', 'statusOrder', 'catatan',
        ];

        const dbFieldMap = {
            kodePeternakan: 'KodePeternakan',
            namaPeternakan: 'NamaPeternakan',
            alamatPeternakan: 'AlamatPeternakan',
            kontakPeternakan: 'KontakPeternakan',
            jenisAyam: 'JenisAyam',
            jumlahPesanan: 'JumlahPesanan',
            satuan: 'Satuan',
            tanggalDibutuhkan: 'TanggalDibutuhkan',
            hargaSatuan: 'HargaSatuan',
            statusOrder: 'StatusOrder',
            catatan: 'Catatan',
        };

        if (req.body.kodePeternakan !== undefined) updateData.KodePeternakan = req.body.kodePeternakan;
        
        fields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updateData[dbFieldMap[field]] = req.body[field];
            }
        });

        if (updateData.HargaSatuan !== undefined || updateData.JumlahPesanan !== undefined) {
            const harga = updateData.HargaSatuan !== undefined ? updateData.HargaSatuan : order.HargaSatuan;
            const jumlah = updateData.JumlahPesanan !== undefined ? updateData.JumlahPesanan : order.JumlahPesanan;
            updateData.TotalHarga = harga * jumlah;
        }

        await order.update(updateData);
        res.json({ message: 'Order berhasil diperbarui.', data: order });
    } catch (error) {
        console.error('Update order error:', error);
        res.status(500).json({ message: 'Gagal memperbarui order.' });
    }
});

// PUT /api/orders/:id/terima — receive order (creates blockchain RECEIVE_FROM_FARM block)
router.put('/:id/terima', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            await t.rollback();
            return res.status(404).json({ message: 'Order tidak ditemukan.' });
        }

        const {
            penerimaOrder, jumlahDiterima, kondisiTerima, tanggalDiterima,
            kodeCycleFarm, farmLastBlockHash, kodePeternakan
        } = req.body;

        const tglDiterima = tanggalDiterima || new Date().toISOString().split('T')[0];

        await order.update({
            StatusOrder: 'DITERIMA',
            PenerimaOrder: penerimaOrder || req.user.nama,
            JumlahDiterima: jumlahDiterima || order.JumlahPesanan,
            KondisiTerima: kondisiTerima || null,
            TanggalDiterima: tglDiterima,
        }, { transaction: t });

        // Create blockchain identity & RECEIVE_FROM_FARM block
        const kodeIdentity = await generateKodeIdentity(sequelize, t);

        // Use Farm's last block hash as genesis PreviousHash for cross-chain continuity
        // Only the very first node (Peternakan) starts from 000...000
        const genesisPrevHash = farmLastBlockHash || GENESIS_PREV_HASH;

        // Generate genesis hash using the upstream hash for continuity
        const genesisHash = generateHash(
            0,
            genesisPrevHash,
            'RECEIVE_FROM_FARM',
            JSON.stringify({
                kode_order: order.KodeOrder,
                nama_peternakan: order.NamaPeternakan,
                tanggal_diterima: tglDiterima,
            }),
            new Date().toISOString().replace('T', ' ').substring(0, 19),
            0
        );

        const identity = await BlockchainIdentity.create({
            KodeIdentity: kodeIdentity,
            IdOrder: order.IdOrder,
            IdProcessor: req.user.idProcessor,
            KodePeternakan: kodePeternakan || null,
            KodeCycleFarm: kodeCycleFarm || null,
            FarmLastBlockHash: farmLastBlockHash || null,
            GenesisHash: genesisHash,
            LatestBlockHash: genesisHash,
            TotalBlocks: 0,
            StatusChain: 'ACTIVE',
        }, { transaction: t });

        const kodeBlock = await generateKodeBlock(sequelize, t);
        await createReceiveFromFarmBlock(sequelize, {
            idIdentity: identity.IdIdentity,
            idOrder: order.IdOrder,
            kodeBlock,
            kodeOrder: order.KodeOrder,
            namaPeternakan: order.NamaPeternakan,
            jenisAyam: order.JenisAyam,
            jumlahDiterima: jumlahDiterima || order.JumlahPesanan,
            penerimaOrder: penerimaOrder || req.user.nama,
            tanggalDiterima: tglDiterima,
            kondisiTerima: kondisiTerima || 'Baik',
            kodeCycleFarm: kodeCycleFarm || null,
            farmLastBlockHash: farmLastBlockHash || null,
            transaction: t,
        });

        await t.commit();
        res.json({ message: 'Order diterima dan blockchain RECEIVE_FROM_FARM block dibuat.', data: order });
    } catch (error) {
        await t.rollback();
        console.error('Terima order error:', error);
        res.status(500).json({ message: 'Gagal menerima order.' });
    }
});

// DELETE /api/orders/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order tidak ditemukan.' });
        if (order.StatusOrder !== 'PENDING') {
            return res.status(400).json({ message: 'Hanya order PENDING yang bisa dihapus.' });
        }
        await order.destroy();
        res.json({ message: 'Order berhasil dihapus.' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ message: 'Gagal menghapus order.' });
    }
});

module.exports = router;
