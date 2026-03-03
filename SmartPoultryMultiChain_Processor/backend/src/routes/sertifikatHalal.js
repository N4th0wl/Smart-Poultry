const express = require('express');
const router = express.Router();
const { SertifikatHalal, Produksi, Karyawan, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeSertifikat, generateKodeBlock } = require('../utils/codeGenerator');
const { createHalalCheckBlock } = require('../utils/blockchain');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// GET /api/sertifikat-halal
router.get('/', authMiddleware, async (req, res) => {
    try {
        const list = await SertifikatHalal.findAll({
            include: [
                { model: Produksi, as: 'produksi', attributes: ['KodeProduksi', 'JenisAyam', 'IdOrder'] },
                { model: Karyawan, as: 'karyawan', attributes: ['KodeKaryawan', 'NamaLengkap'] },
            ],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: list });
    } catch (error) {
        console.error('Get sertifikat halal error:', error);
        res.status(500).json({ message: 'Gagal mengambil data sertifikat halal.' });
    }
});

// POST /api/sertifikat-halal — create halal check (creates HALAL_CHECK block)
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idProduksi, idKaryawan, tanggalPengecekan,
            nomorSertifikat, lembagaPenerbit,
            tanggalTerbit, tanggalExpired,
            statusHalal, metodePenyembelihan, hasilVerifikasi,
            catatan,
        } = req.body;

        if (!idProduksi || !tanggalPengecekan || !hasilVerifikasi) {
            await t.rollback();
            return res.status(400).json({ message: 'Data sertifikat halal tidak lengkap.' });
        }

        const kodeSertifikat = await generateKodeSertifikat(sequelize, t);
        const sertifikat = await SertifikatHalal.create({
            KodeSertifikat: kodeSertifikat,
            IdProduksi: idProduksi,
            IdKaryawan: idKaryawan || null,
            TanggalPengecekan: tanggalPengecekan,
            NomorSertifikat: nomorSertifikat || null,
            LembagaPenerbit: lembagaPenerbit || null,
            TanggalTerbit: tanggalTerbit || null,
            TanggalExpired: tanggalExpired || null,
            StatusHalal: statusHalal || 'DALAM_PROSES',
            MetodePenyembelihan: metodePenyembelihan || null,
            HasilVerifikasi: hasilVerifikasi,
            Catatan: catatan || null,
        }, { transaction: t });

        // Update produksi SertifikatHalal status
        const produksi = await Produksi.findByPk(idProduksi, { transaction: t });
        if (produksi) {
            if (hasilVerifikasi === 'LOLOS') {
                await produksi.update({ SertifikatHalal: 'ADA' }, { transaction: t });
            }

            // Create HALAL_CHECK blockchain block
            const identity = await BlockchainIdentity.findOne({
                where: { IdOrder: produksi.IdOrder, StatusChain: 'ACTIVE' },
                transaction: t,
            });

            if (identity) {
                const kodeBlock = await generateKodeBlock(sequelize, t);
                await createHalalCheckBlock(sequelize, {
                    idIdentity: identity.IdIdentity,
                    idOrder: produksi.IdOrder,
                    idProduksi: idProduksi,
                    kodeBlock,
                    kodeSertifikat,
                    kodeProduksi: produksi.KodeProduksi,
                    nomorSertifikat: nomorSertifikat || null,
                    lembagaPenerbit: lembagaPenerbit || null,
                    tanggalTerbit: tanggalTerbit || null,
                    tanggalExpired: tanggalExpired || null,
                    statusHalal: statusHalal || 'DALAM_PROSES',
                    metodePenyembelihan: metodePenyembelihan || null,
                    hasilVerifikasi,
                    tanggalPengecekan,
                    transaction: t,
                });
            }
        }

        await t.commit();
        res.status(201).json({ message: 'Pengecekan sertifikat halal berhasil dicatat.', data: sertifikat });
    } catch (error) {
        await t.rollback();
        console.error('Create sertifikat halal error:', error);
        res.status(500).json({ message: 'Gagal mencatat sertifikat halal.' });
    }
});

// PUT /api/sertifikat-halal/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const sertifikat = await SertifikatHalal.findByPk(req.params.id);
        if (!sertifikat) return res.status(404).json({ message: 'Sertifikat tidak ditemukan.' });

        const { statusHalal, hasilVerifikasi, catatan } = req.body;
        await sertifikat.update({
            StatusHalal: statusHalal || sertifikat.StatusHalal,
            HasilVerifikasi: hasilVerifikasi || sertifikat.HasilVerifikasi,
            Catatan: catatan !== undefined ? catatan : sertifikat.Catatan,
        });

        res.json({ message: 'Sertifikat halal berhasil diperbarui.', data: sertifikat });
    } catch (error) {
        console.error('Update sertifikat halal error:', error);
        res.status(500).json({ message: 'Gagal memperbarui sertifikat halal.' });
    }
});

// DELETE /api/sertifikat-halal/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const sertifikat = await SertifikatHalal.findByPk(req.params.id);
        if (!sertifikat) return res.status(404).json({ message: 'Sertifikat tidak ditemukan.' });
        await sertifikat.destroy();
        res.json({ message: 'Sertifikat halal berhasil dihapus.' });
    } catch (error) {
        console.error('Delete sertifikat halal error:', error);
        res.status(500).json({ message: 'Gagal menghapus sertifikat halal.' });
    }
});

module.exports = router;
