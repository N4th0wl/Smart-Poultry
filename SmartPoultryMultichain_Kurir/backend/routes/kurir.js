const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { Kurir, Pengiriman, sequelize } = require('../models');
const { generateKodeKurir } = require('../utils/codeGenerator');

// GET /api/kurir - Get all couriers for user's company
router.get('/', authMiddleware, async (req, res) => {
    try {
        const kurirList = await Kurir.findAll({
            where: { KodePerusahaan: req.user.kodePerusahaan },
            order: [['NamaKurir', 'ASC']]
        });
        res.json(kurirList);
    } catch (error) {
        console.error('Get kurir error:', error);
        res.status(500).json({ error: 'Failed to get couriers' });
    }
});

// POST /api/kurir - Create new courier
router.post('/', authMiddleware, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { namaKurir, noTelp } = req.body;

        if (!namaKurir) {
            return res.status(400).json({ error: 'Nama kurir is required' });
        }

        const kodeKurir = await generateKodeKurir(sequelize, transaction);

        const kurir = await Kurir.create({
            KodeKurir: kodeKurir,
            KodePerusahaan: req.user.kodePerusahaan,
            NamaKurir: namaKurir,
            NoTelp: noTelp || null,
            StatusKurir: 'AKTIF'
        }, { transaction });

        await transaction.commit();
        res.status(201).json(kurir);
    } catch (error) {
        await transaction.rollback();
        console.error('Create kurir error:', error);
        res.status(500).json({ error: 'Failed to create courier' });
    }
});

// PUT /api/kurir/:id - Update courier
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { namaKurir, noTelp, statusKurir } = req.body;

        const kurir = await Kurir.findOne({
            where: { KodeKurir: req.params.id, KodePerusahaan: req.user.kodePerusahaan }
        });

        if (!kurir) {
            return res.status(404).json({ error: 'Courier not found' });
        }

        kurir.NamaKurir = namaKurir || kurir.NamaKurir;
        kurir.NoTelp = noTelp !== undefined ? noTelp : kurir.NoTelp;
        kurir.StatusKurir = statusKurir || kurir.StatusKurir;
        await kurir.save();

        res.json(kurir);
    } catch (error) {
        console.error('Update kurir error:', error);
        res.status(500).json({ error: 'Failed to update courier' });
    }
});

// DELETE /api/kurir/:id - Delete courier (soft: set NONAKTIF)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const kurir = await Kurir.findOne({
            where: { KodeKurir: req.params.id, KodePerusahaan: req.user.kodePerusahaan }
        });

        if (!kurir) {
            return res.status(404).json({ error: 'Courier not found' });
        }

        // Check if courier has active shipments
        const activeShipments = await Pengiriman.count({
            where: { KodeKurir: req.params.id, StatusPengiriman: ['PICKUP', 'DALAM_PERJALANAN'] }
        });

        if (activeShipments > 0) {
            return res.status(400).json({ error: 'Kurir masih memiliki pengiriman aktif' });
        }

        kurir.StatusKurir = 'NONAKTIF';
        await kurir.save();

        res.json({ message: 'Courier deactivated' });
    } catch (error) {
        console.error('Delete kurir error:', error);
        res.status(500).json({ error: 'Failed to deactivate courier' });
    }
});

module.exports = router;
