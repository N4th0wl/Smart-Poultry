const express = require('express');
const router = express.Router();
const { NotaPenerimaan, Order, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeNotaPenerimaan, generateKodeBlock } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchain');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/nota-penerimaan
router.get('/', authMiddleware, async (req, res) => {
    try {
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
            idOrder, kodeNotaPengirimanProcessor,
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
            KodeNotaPengirimanProcessor: kodeNotaPengirimanProcessor || null,
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
                kodeNotaPengirimanProcessor: kodeNotaPengirimanProcessor || null,
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
