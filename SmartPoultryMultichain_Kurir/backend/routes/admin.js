const express = require('express');
const router = express.Router();
const { adminMiddleware } = require('../middleware/auth');
const { Login, PerusahaanKurir, Kurir, Pengiriman, LedgerKurir, BlockchainIdentity, sequelize } = require('../models');
const bcrypt = require('bcrypt');

// GET /api/admin/users - Get all users
router.get('/users', adminMiddleware, async (req, res) => {
    try {
        const users = await Login.findAll({
            include: [{ model: PerusahaanKurir }],
            attributes: { exclude: ['Password'] },
            order: [['UserID', 'ASC']]
        });
        res.json(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// POST /api/admin/users - Create user
router.post('/users', adminMiddleware, async (req, res) => {
    try {
        const { email, password, kodePerusahaan, role } = req.body;

        if (!email || !password || !kodePerusahaan) {
            return res.status(400).json({ error: 'Email, password, and company required' });
        }

        const existing = await Login.findOne({ where: { Email: email } });
        if (existing) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const user = await Login.create({
            KodePerusahaan: kodePerusahaan,
            Email: email,
            Password: hashedPassword,
            Role: role || 'user'
        });

        res.status(201).json({
            userId: user.UserID,
            email: user.Email,
            kodePerusahaan: user.KodePerusahaan,
            role: user.Role
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// PUT /api/admin/users/:id/role - Update user role
router.put('/users/:id/role', adminMiddleware, async (req, res) => {
    try {
        const { role } = req.body;
        const user = await Login.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        user.Role = role;
        await user.save();

        res.json({ message: 'Role updated', userId: user.UserID, role: user.Role });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// DELETE /api/admin/users/:id - Delete user
router.delete('/users/:id', adminMiddleware, async (req, res) => {
    try {
        const user = await Login.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Prevent deleting yourself
        if (user.UserID === req.user.userId) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        await user.destroy();
        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// GET /api/admin/companies - Get all companies
router.get('/companies', adminMiddleware, async (req, res) => {
    try {
        const companies = await PerusahaanKurir.findAll({
            order: [['NamaPerusahaan', 'ASC']]
        });
        res.json(companies);
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ error: 'Failed to get companies' });
    }
});

module.exports = router;
