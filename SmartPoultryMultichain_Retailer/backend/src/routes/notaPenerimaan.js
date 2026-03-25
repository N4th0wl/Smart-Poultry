const express = require('express');
const router = express.Router();
const { NotaPenerimaan, Order, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeNotaPenerimaan, generateKodeBlock } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchain');
const { getKurirConnection } = require('../config/crossChainDatabase');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/nota-penerimaan
router.get('/', authMiddleware, async (req, res) => {
    try {
        // Auto-sync completed deliveries from Kurir
        try {
            const kurirConn = getKurirConnection();
            if (kurirConn) {
                const sql = `
                    SELECT p.KodePengiriman, p.UpstreamCycleId, p.AsalPengirim, n.NamaPenerima, n.TanggalSampai, n.KondisiBarang, n.Keterangan
                    FROM pengiriman p
                    JOIN notapengirimankurir n ON p.KodePengiriman = n.KodePengiriman
                    WHERE p.TipePengiriman = 'PROCESSOR_TO_RETAILER' 
                    AND p.StatusPengiriman = 'TERKIRIM'
                `;
                const [completedDeliveries] = await kurirConn.query(sql);

                for (const delivery of completedDeliveries) {
                    const existing = await NotaPenerimaan.findOne({ 
                        where: { KodeNotaPengirimanProcessor: delivery.KodePengiriman } 
                    });

                    if (!existing) {
                        const { Op } = require('sequelize');
                        const order = await Order.findOne({
                            where: { 
                                IdRetailer: req.user.idRetailer,
                                StatusOrder: { [Op.in]: ['PENDING', 'DIPROSES', 'DIKIRIM'] }
                            },
                            order: [['CreatedAt', 'ASC']]
                        });

                        if (order) {
                            const t = await sequelize.transaction();
                            try {
                                const kodeNota = await generateKodeNotaPenerimaan(sequelize, t);
                                
                                let kondisi = 'BAIK';
                                let jumlahRusak = 0;
                                if (delivery.KondisiBarang === 'RUSAK_SEBAGIAN') {
                                    kondisi = 'CUKUP';
                                    jumlahRusak = 1;
                                } else if (delivery.KondisiBarang === 'RUSAK_TOTAL') {
                                    kondisi = 'BURUK';
                                    jumlahRusak = order.JumlahPesanan;
                                }

                                await NotaPenerimaan.create({
                                    KodeNotaPenerimaan: kodeNota,
                                    IdOrder: order.IdOrder,
                                    IdRetailer: req.user.idRetailer,
                                    KodeNotaPengirimanProcessor: delivery.KodePengiriman,
                                    TanggalPenerimaan: delivery.TanggalSampai || new Date().toISOString().split('T')[0],
                                    NamaPengirim: delivery.AsalPengirim,
                                    NamaPenerima: delivery.NamaPenerima,
                                    JumlahDikirim: order.JumlahPesanan,
                                    JumlahDiterima: order.JumlahPesanan - jumlahRusak,
                                    JumlahRusak: jumlahRusak,
                                    KondisiBarang: kondisi,
                                    CatatanPenerimaan: 'Otomatis tersinkronisasi dari Kurir (' + (delivery.Keterangan || 'Terkirim') + ')'
                                }, { transaction: t });

                                const identity = await BlockchainIdentity.findOne({ where: { IdOrder: order.IdOrder }, transaction: t });
                                if (identity) {
                                    const kodeBlock = await generateKodeBlock(sequelize, t);
                                    await blockchain.createNotaPenerimaanBlock(sequelize, {
                                        idIdentity: identity.IdIdentity,
                                        idOrder: order.IdOrder,
                                        kodeBlock,
                                        kodeNotaPenerimaan: kodeNota,
                                        kodeNotaPengirimanKurir: delivery.KodePengiriman,
                                        namaPengirim: delivery.AsalPengirim,
                                        namaPenerima: delivery.NamaPenerima,
                                        jumlahDikirim: order.JumlahPesanan,
                                        jumlahDiterima: order.JumlahPesanan - jumlahRusak,
                                        jumlahRusak: jumlahRusak,
                                        kondisiBarang: kondisi,
                                        tanggalPenerimaan: delivery.TanggalSampai || new Date().toISOString().split('T')[0],
                                        transaction: t
                                    });
                                }

                                await order.update({ StatusOrder: 'SELESAI' }, { transaction: t });
                                await t.commit();
                            } catch (err) {
                                await t.rollback();
                                console.error('Auto-create nota failed:', err);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Auto-sync kurir delivery failed', e.message);
        }

        const where = req.user.idRetailer ? { IdRetailer: req.user.idRetailer } : {};
        const notes = await NotaPenerimaan.findAll({
            where,
            include: [{ model: Order, as: 'order', attributes: ['KodeOrder', 'NamaProcessor', 'NamaProduk'] }],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: notes });
    } catch (error) {
        console.error('Get nota penerimaan error:', error);
        res.status(500).json({ message: 'Gagal mengambil data nota penerimaan.' });
    }
});

// POST /api/nota-penerimaan
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idOrder, kodeNotaPengirimanKurir,
            namaPengirim, namaPenerima,
            jumlahDikirim, jumlahDiterima, jumlahRusak,
            kondisiBarang, suhuSaatTerima, catatanPenerimaan
        } = req.body;

        if (!idOrder || !namaPenerima || !jumlahDiterima) {
            await t.rollback();
            return res.status(400).json({ message: 'Data nota tidak lengkap.' });
        }

        const order = await Order.findByPk(idOrder);
        if (!order) {
            await t.rollback();
            return res.status(404).json({ message: 'Order tidak ditemukan.' });
        }

        const kodeNota = await generateKodeNotaPenerimaan(sequelize, t);

        const nota = await NotaPenerimaan.create({
            KodeNotaPenerimaan: kodeNota,
            IdOrder: idOrder,
            IdRetailer: req.user.idRetailer,
            KodeNotaPengirimanProcessor: kodeNotaPengirimanKurir || null,
            TanggalPenerimaan: new Date().toISOString().split('T')[0],
            NamaPengirim: namaPengirim || order.NamaProcessor,
            NamaPenerima: namaPenerima,
            JumlahDikirim: jumlahDikirim || order.JumlahPesanan,
            JumlahDiterima: jumlahDiterima,
            JumlahRusak: jumlahRusak || 0,
            KondisiBarang: kondisiBarang || 'BAIK',
            SuhuSaatTerima: suhuSaatTerima || null,
            CatatanPenerimaan: catatanPenerimaan || null,
        }, { transaction: t });

        // Create blockchain block
        const identity = await BlockchainIdentity.findOne({ where: { IdOrder: idOrder } });
        if (identity) {
            const kodeBlock = await generateKodeBlock(sequelize, t);
            await blockchain.createNotaPenerimaanBlock(sequelize, {
                idIdentity: identity.IdIdentity,
                idOrder: idOrder,
                kodeBlock,
                kodeNotaPenerimaan: kodeNota,
                kodeNotaPengirimanKurir: kodeNotaPengirimanKurir || null,
                namaPengirim: namaPengirim || order.NamaProcessor,
                namaPenerima: namaPenerima,
                jumlahDikirim: jumlahDikirim || order.JumlahPesanan,
                jumlahDiterima: jumlahDiterima,
                jumlahRusak: jumlahRusak || 0,
                kondisiBarang: kondisiBarang || 'BAIK',
                suhuSaatTerima: suhuSaatTerima,
                tanggalPenerimaan: new Date().toISOString().split('T')[0],
                transaction: t
            });
        }

        await t.commit();
        res.status(201).json({ message: 'Nota penerimaan berhasil dibuat.', data: nota });
    } catch (error) {
        await t.rollback();
        console.error('Create nota penerimaan error:', error);
        res.status(500).json({ message: 'Gagal membuat nota penerimaan.' });
    }
});

module.exports = router;
