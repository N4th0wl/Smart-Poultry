const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Karyawan, sequelize } = require('../models');
const { generateKodeUser, generateKodeKaryawan } = require('../utils/codeGenerator');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// GET /api/karyawan — list all employees
router.get('/', authMiddleware, async (req, res) => {
    try {
        const karyawanList = await Karyawan.findAll({
            include: [{ model: User, as: 'user', attributes: ['Email', 'Role', 'StatusAkun'] }],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: karyawanList });
    } catch (error) {
        console.error('Get karyawan error:', error);
        res.status(500).json({ message: 'Gagal mengambil data karyawan.' });
    }
});

// POST /api/karyawan — admin adds employee
router.post('/', authMiddleware, adminOnly, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { email, namaLengkap, jabatan, noTelp, password } = req.body;

        if (!email || !namaLengkap || !jabatan || !password) {
            await t.rollback();
            return res.status(400).json({ message: 'Email, nama, jabatan, dan password harus diisi.' });
        }

        const existingUser = await User.findOne({ where: { Email: email } });
        if (existingUser) {
            await t.rollback();
            return res.status(409).json({ message: 'Email sudah terdaftar.' });
        }

        const kodeUser = await generateKodeUser(sequelize, t);
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            KodeUser: kodeUser,
            IdProcessor: req.user.idProcessor,
            Email: email,
            Password: hashedPassword,
            Role: 'KARYAWAN',
        }, { transaction: t });

        const kodeKaryawan = await generateKodeKaryawan(sequelize, t);
        const karyawan = await Karyawan.create({
            KodeKaryawan: kodeKaryawan,
            IdUser: user.IdUser,
            IdProcessor: req.user.idProcessor,
            NamaLengkap: namaLengkap,
            Jabatan: jabatan,
            NoTelp: noTelp || null,
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'Karyawan berhasil ditambahkan.', data: karyawan });
    } catch (error) {
        await t.rollback();
        console.error('Create karyawan error:', error);
        res.status(500).json({ message: 'Gagal menambah karyawan.' });
    }
});

// PUT /api/karyawan/:id — update employee
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const karyawan = await Karyawan.findByPk(req.params.id);
        if (!karyawan) return res.status(404).json({ message: 'Karyawan tidak ditemukan.' });

        const { namaLengkap, jabatan, noTelp, statusKaryawan } = req.body;
        await karyawan.update({
            NamaLengkap: namaLengkap || karyawan.NamaLengkap,
            Jabatan: jabatan || karyawan.Jabatan,
            NoTelp: noTelp !== undefined ? noTelp : karyawan.NoTelp,
            StatusKaryawan: statusKaryawan || karyawan.StatusKaryawan,
        });

        res.json({ message: 'Karyawan berhasil diperbarui.', data: karyawan });
    } catch (error) {
        console.error('Update karyawan error:', error);
        res.status(500).json({ message: 'Gagal memperbarui karyawan.' });
    }
});

// DELETE /api/karyawan/:id — deactivate employee
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const karyawan = await Karyawan.findByPk(req.params.id);
        if (!karyawan) return res.status(404).json({ message: 'Karyawan tidak ditemukan.' });

        await karyawan.update({ StatusKaryawan: 'INACTIVE' });
        const user = await User.findByPk(karyawan.IdUser);
        if (user) await user.update({ StatusAkun: 'INACTIVE' });

        res.json({ message: 'Karyawan berhasil dinonaktifkan.' });
    } catch (error) {
        console.error('Delete karyawan error:', error);
        res.status(500).json({ message: 'Gagal menonaktifkan karyawan.' });
    }
});

module.exports = router;
