const express = require('express');
const router = express.Router();
const { Cycle, Kandang, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/cycle - Get only cycles that belong to user's peternakan (via Kandang)
router.get('/', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        // Only return cycles that have kandang belonging to this peternakan
        const cycles = await sequelize.query(`
            SELECT DISTINCT c.KodeCycle, c.TanggalMulai, c.DurasiCycle, c.SisaHariPanen
            FROM Cycle c
            INNER JOIN Kandang k ON c.KodeCycle = k.KodeCycle
            WHERE k.KodePeternakan = :kodePeternakan
            ORDER BY c.TanggalMulai DESC
        `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(cycles);
    } catch (error) {
        console.error('Get cycles error:', error);
        res.status(500).json({ error: 'Failed to get cycles' });
    }
});

// GET /api/cycle/:id - Get single cycle (with ownership check)
router.get('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        // Verify cycle belongs to this peternakan via Kandang
        const [cycle] = await sequelize.query(`
            SELECT DISTINCT c.KodeCycle, c.TanggalMulai, c.DurasiCycle, c.SisaHariPanen
            FROM Cycle c
            INNER JOIN Kandang k ON c.KodeCycle = k.KodeCycle
            WHERE c.KodeCycle = :id AND k.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!cycle) {
            return res.status(404).json({ error: 'Cycle not found' });
        }

        res.json(cycle);
    } catch (error) {
        console.error('Get cycle error:', error);
        res.status(500).json({ error: 'Failed to get cycle' });
    }
});

// POST /api/cycle - Create cycle
router.post('/', async (req, res) => {
    try {
        const { tanggalMulai, durasiCycle, sisaHariPanen } = req.body;

        if (!tanggalMulai || !durasiCycle) {
            return res.status(400).json({ error: 'Start date and duration required' });
        }

        const cycle = await Cycle.create({
            TanggalMulai: tanggalMulai,
            DurasiCycle: durasiCycle,
            SisaHariPanen: sisaHariPanen || durasiCycle
        });

        res.status(201).json(cycle);
    } catch (error) {
        console.error('Create cycle error:', error);
        res.status(500).json({ error: 'Failed to create cycle' });
    }
});

// PUT /api/cycle/:id - Update cycle (with ownership check)
router.put('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        // Verify cycle belongs to this peternakan via Kandang
        const [ownership] = await sequelize.query(`
            SELECT c.KodeCycle
            FROM Cycle c
            INNER JOIN Kandang k ON c.KodeCycle = k.KodeCycle
            WHERE c.KodeCycle = :id AND k.KodePeternakan = :kodePeternakan
            LIMIT 1
        `, {
            replacements: { id: req.params.id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!ownership) {
            return res.status(404).json({ error: 'Cycle not found' });
        }

        const cycle = await Cycle.findByPk(req.params.id);
        const { sisaHariPanen } = req.body;

        await cycle.update({
            SisaHariPanen: sisaHariPanen ?? cycle.SisaHariPanen
        });

        res.json(cycle);
    } catch (error) {
        console.error('Update cycle error:', error);
        res.status(500).json({ error: 'Failed to update cycle' });
    }
});

module.exports = router;
