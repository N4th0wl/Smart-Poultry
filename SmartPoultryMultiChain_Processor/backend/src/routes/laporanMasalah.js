const express = require('express');
const router = express.Router();
const { LaporanMasalah, Produksi, Karyawan, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeLaporan, generateKodeBlock } = require('../utils/codeGenerator');
const { createLaporanMasalahBlock } = require('../utils/blockchain');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// GET /api/laporan-masalah
router.get('/', authMiddleware, async (req, res) => {
    try {
        const list = await LaporanMasalah.findAll({
            include: [
                { model: Produksi, as: 'produksi', attributes: ['KodeProduksi', 'JenisAyam', 'IdOrder'] },
                { model: Karyawan, as: 'karyawan', attributes: ['KodeKaryawan', 'NamaLengkap'] },
            ],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: list });
    } catch (error) {
        console.error('Get laporan masalah error:', error);
        res.status(500).json({ message: 'Gagal mengambil data laporan masalah.' });
    }
});

// POST /api/laporan-masalah — create problem report (creates LAPORAN_MASALAH block)
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idProduksi, idKaryawan, tanggalLaporan,
            jenisMasalah, tingkat, deskripsiMasalah,
            tindakanKorektif, catatan,
        } = req.body;

        if (!idProduksi || !tanggalLaporan || !jenisMasalah || !deskripsiMasalah) {
            await t.rollback();
            return res.status(400).json({ message: 'Data laporan masalah tidak lengkap.' });
        }

        const kodeLaporan = await generateKodeLaporan(sequelize, t);
        const laporan = await LaporanMasalah.create({
            KodeLaporan: kodeLaporan,
            IdProduksi: idProduksi,
            IdKaryawan: idKaryawan || null,
            TanggalLaporan: tanggalLaporan,
            JenisMasalah: jenisMasalah,
            Tingkat: tingkat || 'SEDANG',
            DeskripsiMasalah: deskripsiMasalah,
            TindakanKorektif: tindakanKorektif || null,
            Catatan: catatan || null,
        }, { transaction: t });

        // Create LAPORAN_MASALAH blockchain block
        const produksi = await Produksi.findByPk(idProduksi, { transaction: t });
        if (produksi) {
            const identity = await BlockchainIdentity.findOne({
                where: { IdOrder: produksi.IdOrder, StatusChain: 'ACTIVE' },
                transaction: t,
            });

            if (identity) {
                const kodeBlock = await generateKodeBlock(sequelize, t);
                await createLaporanMasalahBlock(sequelize, {
                    idIdentity: identity.IdIdentity,
                    idOrder: produksi.IdOrder,
                    idProduksi: idProduksi,
                    kodeBlock,
                    kodeLaporan,
                    kodeProduksi: produksi.KodeProduksi,
                    jenisMasalah,
                    tingkat: tingkat || 'SEDANG',
                    deskripsiMasalah,
                    tindakanKorektif: tindakanKorektif || null,
                    tanggalLaporan,
                    transaction: t,
                });
            }
        }

        await t.commit();
        res.status(201).json({ message: 'Laporan masalah berhasil dicatat.', data: laporan });
    } catch (error) {
        await t.rollback();
        console.error('Create laporan masalah error:', error);
        res.status(500).json({ message: 'Gagal mencatat laporan masalah.' });
    }
});

// PUT /api/laporan-masalah/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const laporan = await LaporanMasalah.findByPk(req.params.id);
        if (!laporan) return res.status(404).json({ message: 'Laporan tidak ditemukan.' });

        const { statusLaporan, tindakanKorektif, catatan } = req.body;
        await laporan.update({
            StatusLaporan: statusLaporan || laporan.StatusLaporan,
            TindakanKorektif: tindakanKorektif !== undefined ? tindakanKorektif : laporan.TindakanKorektif,
            Catatan: catatan !== undefined ? catatan : laporan.Catatan,
        });

        res.json({ message: 'Laporan masalah berhasil diperbarui.', data: laporan });
    } catch (error) {
        console.error('Update laporan masalah error:', error);
        res.status(500).json({ message: 'Gagal memperbarui laporan masalah.' });
    }
});

// DELETE /api/laporan-masalah/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const laporan = await LaporanMasalah.findByPk(req.params.id);
        if (!laporan) return res.status(404).json({ message: 'Laporan tidak ditemukan.' });
        await laporan.destroy();
        res.json({ message: 'Laporan masalah berhasil dihapus.' });
    } catch (error) {
        console.error('Delete laporan masalah error:', error);
        res.status(500).json({ message: 'Gagal menghapus laporan masalah.' });
    }
});

module.exports = router;
