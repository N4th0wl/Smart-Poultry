const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Karyawan, Processor, sequelize } = require('../models');
const { generateKodeUser, generateKodeKaryawan, generateKodeProcessor } = require('../utils/codeGenerator');
const { authMiddleware } = require('../middlewares/auth');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// POST /api/auth/register
// First user becomes ADMIN (platform-level), subsequent users need an admin to create them
router.post('/register', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { email, namaProcessor, password, confirmPassword } = req.body;

        if (!email || !namaProcessor || !password || !confirmPassword) {
            await t.rollback();
            return res.status(400).json({ message: 'Semua field harus diisi.' });
        }

        if (password !== confirmPassword) {
            await t.rollback();
            return res.status(400).json({ message: 'Password dan konfirmasi password tidak cocok.' });
        }

        if (password.length < 6) {
            await t.rollback();
            return res.status(400).json({ message: 'Password minimal 6 karakter.' });
        }

        const existingUser = await User.findOne({ where: { Email: email } });
        if (existingUser) {
            await t.rollback();
            return res.status(409).json({ message: 'Email sudah terdaftar.' });
        }

        const kodeUser = await generateKodeUser(sequelize, t);
        const hashedPassword = await bcrypt.hash(password, 10);

        // First registered user is ADMIN (platform admin), others are KARYAWAN
        const userCount = await User.count();
        const role = userCount === 0 ? 'ADMIN' : 'KARYAWAN';

        let processorId = null;
        let processorName = namaProcessor;

        if (role === 'KARYAWAN') {
            // Non-admin users: create a new processor for them
            const kodeProcessor = await generateKodeProcessor(sequelize, t);
            const processor = await Processor.create({
                KodeProcessor: kodeProcessor,
                NamaProcessor: namaProcessor,
            }, { transaction: t });
            processorId = processor.IdProcessor;
        }

        const user = await User.create({
            KodeUser: kodeUser,
            IdProcessor: processorId,
            Email: email,
            Password: hashedPassword,
            Role: role,
        }, { transaction: t });

        // Auto-create karyawan profile
        const kodeKaryawan = await generateKodeKaryawan(sequelize, t);
        await Karyawan.create({
            KodeKaryawan: kodeKaryawan,
            IdUser: user.IdUser,
            IdProcessor: processorId,
            NamaLengkap: namaProcessor,
            Jabatan: role === 'ADMIN' ? 'Platform Administrator' : 'Manager',
        }, { transaction: t });

        await t.commit();

        const token = jwt.sign(
            {
                id: user.IdUser,
                kodeUser: user.KodeUser,
                email: user.Email,
                nama: processorName,
                role: user.Role,
                idProcessor: processorId,
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Registrasi berhasil!',
            token,
            user: {
                id: user.IdUser,
                kodeUser: user.KodeUser,
                email: user.Email,
                nama: processorName,
                role: user.Role,
                idProcessor: processorId,
            },
        });
    } catch (error) {
        await t.rollback();
        console.error('Register error:', error);
        res.status(500).json({ message: 'Gagal mendaftar. Coba lagi nanti.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email dan password harus diisi.' });
        }

        const user = await User.findOne({
            where: { Email: email },
            include: [{ model: Processor, as: 'processor' }],
        });

        if (!user) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        if (user.StatusAkun === 'INACTIVE') {
            return res.status(403).json({ message: 'Akun Anda sudah dinonaktifkan. Hubungi admin.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.Password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Email atau password salah.' });
        }

        const processorName = user.processor?.NamaProcessor || 'Platform Admin';

        const token = jwt.sign(
            {
                id: user.IdUser,
                kodeUser: user.KodeUser,
                email: user.Email,
                nama: processorName,
                role: user.Role,
                idProcessor: user.IdProcessor,
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login berhasil!',
            token,
            user: {
                id: user.IdUser,
                kodeUser: user.KodeUser,
                email: user.Email,
                nama: processorName,
                role: user.Role,
                idProcessor: user.IdProcessor,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Gagal login. Coba lagi nanti.' });
    }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['Password'] },
            include: [
                { model: Karyawan, as: 'karyawan' },
                { model: Processor, as: 'processor' },
            ],
        });
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

        res.json({
            user: {
                IdUser: user.IdUser,
                KodeUser: user.KodeUser,
                Email: user.Email,
                Role: user.Role,
                StatusAkun: user.StatusAkun,
                IdProcessor: user.IdProcessor,
                namaProcessor: user.processor?.NamaProcessor || 'Platform Admin',
                karyawan: user.karyawan,
            },
        });
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ message: 'Gagal mengambil data user.' });
    }
});

// PUT /api/auth/me
router.put('/me', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { namaProcessor } = req.body;
        if (!namaProcessor) {
            await t.rollback();
            return res.status(400).json({ message: 'Nama tidak boleh kosong.' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        // Update Karyawan record if it exists
        const karyawan = await Karyawan.findOne({ where: { IdUser: user.IdUser } });
        if (karyawan) {
            await karyawan.update({ NamaLengkap: namaProcessor }, { transaction: t });
        }

        // Update Processor record if applicable and user is ADMIN
        if (user.Role === 'ADMIN' && user.IdProcessor) {
            const processor = await Processor.findByPk(user.IdProcessor);
            if (processor) {
                await processor.update({ NamaProcessor: namaProcessor }, { transaction: t });
            }
        }

        await t.commit();
        res.json({ message: 'Profil berhasil diperbarui.', nama: namaProcessor });
    } catch (error) {
        await t.rollback();
        console.error('Update me error:', error);
        res.status(500).json({ message: 'Gagal memperbarui profil.' });
    }
});

module.exports = router;
