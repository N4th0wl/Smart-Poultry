const express = require('express');
const router = express.Router();
const { NotaPengiriman, Pengiriman, Produksi, sequelize } = require('../models');
const { generateKodeNota } = require('../utils/codeGenerator');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// GET /api/nota
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notaList = await NotaPengiriman.findAll({
            include: [{
                model: Pengiriman, as: 'pengiriman',
                attributes: ['KodePengiriman', 'TujuanPengiriman', 'NamaPenerima', 'TanggalKirim'],
                include: [{ model: Produksi, as: 'produksi', attributes: ['KodeProduksi', 'JenisAyam'] }],
            }],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: notaList });
    } catch (error) {
        console.error('Get nota error:', error);
        res.status(500).json({ message: 'Gagal mengambil data nota.' });
    }
});

// POST /api/nota
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idPengiriman, tanggalNota, namaBarang, varian,
            jumlah, satuan, hargaSatuan, catatan,
        } = req.body;

        if (!idPengiriman || !tanggalNota || !namaBarang || !jumlah || !hargaSatuan) {
            await t.rollback();
            return res.status(400).json({ message: 'Data nota tidak lengkap.' });
        }

        const kodeNota = await generateKodeNota(sequelize, t);
        const totalHarga = jumlah * hargaSatuan;

        const nota = await NotaPengiriman.create({
            KodeNota: kodeNota,
            IdPengiriman: idPengiriman,
            TanggalNota: tanggalNota,
            NamaBarang: namaBarang,
            Varian: varian || null,
            Jumlah: jumlah,
            Satuan: satuan || 'KG',
            HargaSatuan: hargaSatuan,
            TotalHarga: totalHarga,
            Catatan: catatan || null,
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'Nota berhasil dibuat.', data: nota });
    } catch (error) {
        await t.rollback();
        console.error('Create nota error:', error);
        res.status(500).json({ message: 'Gagal membuat nota.' });
    }
});

// PUT /api/nota/:id
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const nota = await NotaPengiriman.findByPk(req.params.id);
        if (!nota) return res.status(404).json({ message: 'Nota tidak ditemukan.' });

        const { statusNota, catatan } = req.body;
        await nota.update({
            StatusNota: statusNota || nota.StatusNota,
            Catatan: catatan !== undefined ? catatan : nota.Catatan,
        });

        res.json({ message: 'Nota berhasil diperbarui.', data: nota });
    } catch (error) {
        console.error('Update nota error:', error);
        res.status(500).json({ message: 'Gagal memperbarui nota.' });
    }
});

module.exports = router;
