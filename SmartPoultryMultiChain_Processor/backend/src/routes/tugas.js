const express = require('express');
const router = express.Router();
const { TugasProduksi, Order, Karyawan, sequelize } = require('../models');
const { generateKodeTugas } = require('../utils/codeGenerator');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// GET /api/tugas — list all tasks
router.get('/', authMiddleware, async (req, res) => {
    try {
        let whereClause = {};

        // Karyawan only sees their own tasks
        if (req.user.role === 'KARYAWAN') {
            const karyawan = await Karyawan.findOne({ where: { IdUser: req.user.id } });
            if (karyawan) {
                whereClause.IdKaryawan = karyawan.IdKaryawan;
            }
        }

        const tugasList = await TugasProduksi.findAll({
            where: whereClause,
            include: [
                { model: Order, as: 'order', attributes: ['KodeOrder', 'NamaPeternakan', 'JenisAyam'] },
                { model: Karyawan, as: 'karyawan', attributes: ['KodeKaryawan', 'NamaLengkap'] },
            ],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: tugasList });
    } catch (error) {
        console.error('Get tugas error:', error);
        res.status(500).json({ message: 'Gagal mengambil data tugas.' });
    }
});

// POST /api/tugas — admin assigns task
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { idOrder, idKaryawan, namaTugas, deskripsiTugas, jenisTugas, tanggalMulai } = req.body;

        if (!idOrder || !namaTugas || !jenisTugas) {
            await t.rollback();
            return res.status(400).json({ message: 'Order, nama tugas, dan jenis tugas harus diisi.' });
        }

        const kodeTugas = await generateKodeTugas(sequelize, t);
        const tugas = await TugasProduksi.create({
            KodeTugas: kodeTugas,
            IdOrder: idOrder,
            IdKaryawan: idKaryawan || null,
            NamaTugas: namaTugas,
            DeskripsiTugas: deskripsiTugas || null,
            JenisTugas: jenisTugas,
            TanggalMulai: tanggalMulai || null,
            DitugaskanOleh: req.user.id,
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'Tugas berhasil dibuat.', data: tugas });
    } catch (error) {
        await t.rollback();
        console.error('Create tugas error:', error);
        res.status(500).json({ message: 'Gagal membuat tugas.' });
    }
});

// PUT /api/tugas/:id — update task (karyawan can update status)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const tugas = await TugasProduksi.findByPk(req.params.id);
        if (!tugas) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });

        // Karyawan can only update tasks assigned to them
        if (req.user.role === 'KARYAWAN') {
            const karyawan = await Karyawan.findOne({ where: { IdUser: req.user.id } });
            if (!karyawan || tugas.IdKaryawan !== karyawan.IdKaryawan) {
                return res.status(403).json({ message: 'Anda tidak memiliki akses untuk memperbarui tugas ini.' });
            }
            // Karyawan can only update status and catatan
            const { statusTugas, catatan, tanggalSelesai } = req.body;
            await tugas.update({
                StatusTugas: statusTugas || tugas.StatusTugas,
                Catatan: catatan !== undefined ? catatan : tugas.Catatan,
                TanggalSelesai: tanggalSelesai || tugas.TanggalSelesai,
            });
        } else {
            // Admin can update everything
            const { idKaryawan, namaTugas, deskripsiTugas, jenisTugas, statusTugas, tanggalMulai, tanggalSelesai, catatan } = req.body;
            await tugas.update({
                IdKaryawan: idKaryawan !== undefined ? idKaryawan : tugas.IdKaryawan,
                NamaTugas: namaTugas || tugas.NamaTugas,
                DeskripsiTugas: deskripsiTugas !== undefined ? deskripsiTugas : tugas.DeskripsiTugas,
                JenisTugas: jenisTugas || tugas.JenisTugas,
                StatusTugas: statusTugas || tugas.StatusTugas,
                TanggalMulai: tanggalMulai !== undefined ? tanggalMulai : tugas.TanggalMulai,
                TanggalSelesai: tanggalSelesai !== undefined ? tanggalSelesai : tugas.TanggalSelesai,
                Catatan: catatan !== undefined ? catatan : tugas.Catatan,
            });
        }

        res.json({ message: 'Tugas berhasil diperbarui.', data: tugas });
    } catch (error) {
        console.error('Update tugas error:', error);
        res.status(500).json({ message: 'Gagal memperbarui tugas.' });
    }
});

// DELETE /api/tugas/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const tugas = await TugasProduksi.findByPk(req.params.id);
        if (!tugas) return res.status(404).json({ message: 'Tugas tidak ditemukan.' });
        await tugas.destroy();
        res.json({ message: 'Tugas berhasil dihapus.' });
    } catch (error) {
        console.error('Delete tugas error:', error);
        res.status(500).json({ message: 'Gagal menghapus tugas.' });
    }
});

module.exports = router;
