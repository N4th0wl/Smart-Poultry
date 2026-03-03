const express = require('express');
const router = express.Router();
const { Gudang, BlockchainIdentity, Order, sequelize } = require('../models');
const { generateKodeGudang, generateKodeBlock } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchain');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/gudang — list all stock
router.get('/', authMiddleware, async (req, res) => {
    try {
        const where = req.user.idRetailer ? { IdRetailer: req.user.idRetailer } : {};
        const items = await Gudang.findAll({
            where,
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: items });
    } catch (error) {
        console.error('Get gudang error:', error);
        res.status(500).json({ message: 'Gagal mengambil data gudang.' });
    }
});

// POST /api/gudang — add stock (usually from received order)
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idOrder, namaProduk, jenisProduk, jumlahMasuk,
            satuan, hargaJual, lokasiGudang, tanggalKadaluarsa
        } = req.body;

        if (!namaProduk || !jenisProduk || !jumlahMasuk) {
            await t.rollback();
            return res.status(400).json({ message: 'Data gudang tidak lengkap.' });
        }

        const kodeGudang = await generateKodeGudang(sequelize, t);

        const gudang = await Gudang.create({
            KodeGudang: kodeGudang,
            IdRetailer: req.user.idRetailer,
            NamaProduk: namaProduk,
            JenisProduk: jenisProduk,
            StokMasuk: jumlahMasuk,
            StokKeluar: 0,
            StokSaatIni: jumlahMasuk,
            Satuan: satuan || 'KG',
            HargaJual: hargaJual || 0,
            LokasiGudang: lokasiGudang || null,
            TanggalMasuk: new Date().toISOString().split('T')[0],
            TanggalKadaluarsa: tanggalKadaluarsa || null,
            StatusStok: jumlahMasuk > 10 ? 'TERSEDIA' : jumlahMasuk > 0 ? 'HAMPIR_HABIS' : 'HABIS',
        }, { transaction: t });

        // Create blockchain block if linked to an order
        if (idOrder) {
            const identity = await BlockchainIdentity.findOne({ where: { IdOrder: idOrder } });
            if (identity) {
                const kodeBlock = await generateKodeBlock(sequelize, t);
                await blockchain.createStockInBlock(sequelize, {
                    idIdentity: identity.IdIdentity,
                    idOrder: idOrder,
                    idGudang: gudang.IdGudang,
                    kodeBlock,
                    kodeGudang: kodeGudang,
                    namaProduk: namaProduk,
                    jenisProduk: jenisProduk,
                    jumlahMasuk: jumlahMasuk,
                    satuan: satuan || 'KG',
                    tanggalMasuk: new Date().toISOString().split('T')[0],
                    transaction: t
                });
            }
        }

        await t.commit();
        res.status(201).json({ message: 'Stok berhasil ditambahkan.', data: gudang });
    } catch (error) {
        await t.rollback();
        console.error('Create gudang error:', error);
        res.status(500).json({ message: 'Gagal menambahkan stok.' });
    }
});

// PUT /api/gudang/:id — update stock info
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const gudang = await Gudang.findByPk(req.params.id);
        if (!gudang) return res.status(404).json({ message: 'Stok tidak ditemukan.' });

        const { hargaJual, lokasiGudang, tanggalKadaluarsa } = req.body;
        await gudang.update({
            HargaJual: hargaJual !== undefined ? hargaJual : gudang.HargaJual,
            LokasiGudang: lokasiGudang || gudang.LokasiGudang,
            TanggalKadaluarsa: tanggalKadaluarsa || gudang.TanggalKadaluarsa,
        });

        res.json({ message: 'Stok berhasil diperbarui.', data: gudang });
    } catch (error) {
        console.error('Update gudang error:', error);
        res.status(500).json({ message: 'Gagal memperbarui stok.' });
    }
});

module.exports = router;
