const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Login, PerusahaanKurir } = require('../models');

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, namaPerusahaan, alamatPerusahaan } = req.body;

        if (!email || !password || !namaPerusahaan || !alamatPerusahaan) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const existingUser = await Login.findOne({ where: { Email: email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        // Create PerusahaanKurir first
        const perusahaan = await PerusahaanKurir.create({
            NamaPerusahaan: namaPerusahaan,
            AlamatPerusahaan: alamatPerusahaan
        });

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await Login.create({
            KodePerusahaan: perusahaan.KodePerusahaan,
            Email: email,
            Password: hashedPassword,
            Role: 'user'
        });

        const token = jwt.sign(
            {
                userId: user.UserID,
                email: user.Email,
                kodePerusahaan: user.KodePerusahaan,
                role: user.Role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                userId: user.UserID,
                email: user.Email,
                kodePerusahaan: user.KodePerusahaan,
                namaPerusahaan: perusahaan.NamaPerusahaan,
                role: user.Role
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password required' });
        }

        const user = await Login.findOne({
            where: { Email: email },
            include: [{ model: PerusahaanKurir }]
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValid = await bcrypt.compare(password, user.Password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const token = jwt.sign(
            {
                userId: user.UserID,
                email: user.Email,
                kodePerusahaan: user.KodePerusahaan,
                role: user.Role
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                userId: user.UserID,
                email: user.Email,
                kodePerusahaan: user.KodePerusahaan,
                namaPerusahaan: user.PerusahaanKurir?.NamaPerusahaan,
                role: user.Role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authMiddleware, async (req, res) => {
    try {
        const user = await Login.findByPk(req.user.userId, {
            include: [{ model: PerusahaanKurir }],
            attributes: { exclude: ['Password'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            userId: user.UserID,
            email: user.Email,
            kodePerusahaan: user.KodePerusahaan,
            namaPerusahaan: user.PerusahaanKurir?.NamaPerusahaan,
            alamatPerusahaan: user.PerusahaanKurir?.AlamatPerusahaan,
            role: user.Role
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to get user info' });
    }
});

// PUT /api/auth/profile
router.put('/profile', require('../middleware/auth').authMiddleware, async (req, res) => {
    try {
        const { namaPerusahaan, alamatPerusahaan, kontakPerusahaan } = req.body;

        const user = await Login.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const perusahaan = await PerusahaanKurir.findByPk(user.KodePerusahaan);
        if (perusahaan) {
            perusahaan.NamaPerusahaan = namaPerusahaan || perusahaan.NamaPerusahaan;
            perusahaan.AlamatPerusahaan = alamatPerusahaan || perusahaan.AlamatPerusahaan;
            perusahaan.KontakPerusahaan = kontakPerusahaan || perusahaan.KontakPerusahaan;
            await perusahaan.save();
        }

        res.json({
            message: 'Profile updated successfully',
            user: {
                userId: user.UserID,
                email: user.Email,
                kodePerusahaan: user.KodePerusahaan,
                namaPerusahaan: perusahaan.NamaPerusahaan,
                alamatPerusahaan: perusahaan.AlamatPerusahaan,
                role: user.Role
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// PUT /api/auth/password
router.put('/password', require('../middleware/auth').authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        const user = await Login.findByPk(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isValid = await bcrypt.compare(currentPassword, user.Password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid current password' });
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        user.Password = hashedPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Failed to update password' });
    }
});

module.exports = router;
