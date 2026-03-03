const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Retailer, sequelize } = require('../models');
const { generateKodeUser, generateKodeRetailer } = require('../utils/codeGenerator');
const { authMiddleware } = require('../middlewares/auth');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret';

// POST /api/auth/register
// 1 login = 1 retailer. First user is ADMIN, subsequent are RETAILER.
router.post('/register', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { email, namaRetailer, alamatRetailer, kontakRetailer, password, confirmPassword } = req.body;

        if (!email || !namaRetailer || !password || !confirmPassword) {
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

        // First registered user is ADMIN, others are RETAILER
        const userCount = await User.count();
        const role = userCount === 0 ? 'ADMIN' : 'RETAILER';

        // Create retailer entity
        const kodeRetailer = await generateKodeRetailer(sequelize, t);
        const retailer = await Retailer.create({
            KodeRetailer: kodeRetailer,
            NamaRetailer: namaRetailer,
            AlamatRetailer: alamatRetailer || null,
            KontakRetailer: kontakRetailer || null,
        }, { transaction: t });

        const user = await User.create({
            KodeUser: kodeUser,
            IdRetailer: retailer.IdRetailer,
            Email: email,
            Password: hashedPassword,
            NamaLengkap: namaRetailer,
            Role: role,
        }, { transaction: t });

        await t.commit();

        const token = jwt.sign(
            {
                id: user.IdUser,
                kodeUser: user.KodeUser,
                email: user.Email,
                nama: namaRetailer,
                role: user.Role,
                idRetailer: retailer.IdRetailer,
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
                nama: namaRetailer,
                role: user.Role,
                idRetailer: retailer.IdRetailer,
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
            include: [{ model: Retailer, as: 'retailer' }],
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

        const retailerName = user.retailer?.NamaRetailer || user.NamaLengkap || 'User';

        const token = jwt.sign(
            {
                id: user.IdUser,
                kodeUser: user.KodeUser,
                email: user.Email,
                nama: retailerName,
                role: user.Role,
                idRetailer: user.IdRetailer,
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
                nama: retailerName,
                role: user.Role,
                idRetailer: user.IdRetailer,
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
            include: [{ model: Retailer, as: 'retailer' }],
        });
        if (!user) return res.status(404).json({ message: 'User tidak ditemukan.' });

        res.json({
            user: {
                IdUser: user.IdUser,
                KodeUser: user.KodeUser,
                Email: user.Email,
                NamaLengkap: user.NamaLengkap,
                Role: user.Role,
                StatusAkun: user.StatusAkun,
                IdRetailer: user.IdRetailer,
                namaRetailer: user.retailer?.NamaRetailer || user.NamaLengkap,
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
        const { namaRetailer, alamatRetailer, kontakRetailer } = req.body;
        if (!namaRetailer) {
            await t.rollback();
            return res.status(400).json({ message: 'Nama tidak boleh kosong.' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            await t.rollback();
            return res.status(404).json({ message: 'User tidak ditemukan.' });
        }

        await user.update({ NamaLengkap: namaRetailer }, { transaction: t });

        if (user.IdRetailer) {
            const retailer = await Retailer.findByPk(user.IdRetailer);
            if (retailer) {
                await retailer.update({
                    NamaRetailer: namaRetailer,
                    AlamatRetailer: alamatRetailer || retailer.AlamatRetailer,
                    KontakRetailer: kontakRetailer || retailer.KontakRetailer,
                }, { transaction: t });
            }
        }

        await t.commit();
        res.json({ message: 'Profil berhasil diperbarui.', nama: namaRetailer });
    } catch (error) {
        await t.rollback();
        console.error('Update me error:', error);
        res.status(500).json({ message: 'Gagal memperbarui profil.' });
    }
});

module.exports = router;
