const express = require('express');
const router = express.Router();
const { DOC, NotaPenerimaan, Kandang, Orders, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/doc - Get all DOC (only for user's peternakan)
router.get('/', async (req, res) => {
    try {
        // Use raw query to properly filter DOCs belonging to this peternakan
        // DOC → NotaPenerimaan → Orders → KodePeternakan
        // DOC → Kandang → KodePeternakan (if assigned)
        const docs = await sequelize.query(`
            SELECT d.KodeDOC, d.KodePenerimaan, d.KodeKandang, d.BrandDOC, d.TipeAyam,
                   d.TanggalMasukKandang, d.JumlahDipesan, d.JumlahDiterima, 
                   d.JumlahMatiPraKandang, d.KondisiAwal,
                   np.KodeOrder, np.TanggalPenerimaan, np.NamaPenerima,
                   k.KodeCycle, k.PanjangKandang, k.LebarKandang
            FROM DOC d
            JOIN NotaPenerimaan np ON d.KodePenerimaan = np.KodePenerimaan
            JOIN Orders o ON np.KodeOrder = o.KodeOrder
            LEFT JOIN Kandang k ON d.KodeKandang = k.KodeKandang
            WHERE o.KodePeternakan = :kodePeternakan
            ORDER BY d.TanggalMasukKandang DESC
        `, {
            replacements: { kodePeternakan: req.user.kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(docs);
    } catch (error) {
        console.error('Get DOC error:', error);
        res.status(500).json({ error: 'Failed to get DOC' });
    }
});

// GET /api/doc/:id - Get single DOC (with ownership check)
router.get('/:id', async (req, res) => {
    try {
        // Verify DOC belongs to user's peternakan via NotaPenerimaan → Orders
        const [doc] = await sequelize.query(`
            SELECT d.KodeDOC, d.KodePenerimaan, d.KodeKandang, d.BrandDOC, d.TipeAyam,
                   d.TanggalMasukKandang, d.JumlahDipesan, d.JumlahDiterima, 
                   d.JumlahMatiPraKandang, d.KondisiAwal,
                   np.KodeOrder, np.TanggalPenerimaan, np.NamaPenerima,
                   k.KodeCycle
            FROM DOC d
            JOIN NotaPenerimaan np ON d.KodePenerimaan = np.KodePenerimaan
            JOIN Orders o ON np.KodeOrder = o.KodeOrder
            LEFT JOIN Kandang k ON d.KodeKandang = k.KodeKandang
            WHERE d.KodeDOC = :id AND o.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan: req.user.kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!doc) {
            return res.status(404).json({ error: 'DOC not found' });
        }

        res.json(doc);
    } catch (error) {
        console.error('Get DOC error:', error);
        res.status(500).json({ error: 'Failed to get DOC' });
    }
});

// PUT /api/doc/:id - Update DOC (assign to kandang) - with ownership check
router.put('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        // Verify DOC belongs to user's peternakan
        const [ownership] = await sequelize.query(`
            SELECT d.KodeDOC
            FROM DOC d
            JOIN NotaPenerimaan np ON d.KodePenerimaan = np.KodePenerimaan
            JOIN Orders o ON np.KodeOrder = o.KodeOrder
            WHERE d.KodeDOC = :id AND o.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!ownership) {
            return res.status(404).json({ error: 'DOC not found' });
        }

        const {
            kodeKandang,
            tanggalMasukKandang,
            brandDOC,
            tipeAyam,
            kondisiAwal
        } = req.body;

        // If assigning to kandang, verify kandang belongs to same peternakan
        if (kodeKandang) {
            const kandang = await Kandang.findOne({
                where: { KodeKandang: kodeKandang, KodePeternakan: kodePeternakan }
            });
            if (!kandang) {
                return res.status(403).json({ error: 'Kandang not found or unauthorized' });
            }
        }

        const doc = await DOC.findByPk(req.params.id);

        await doc.update({
            KodeKandang: kodeKandang || doc.KodeKandang,
            TanggalMasukKandang: tanggalMasukKandang || doc.TanggalMasukKandang,
            BrandDOC: brandDOC || doc.BrandDOC,
            TipeAyam: tipeAyam || doc.TipeAyam,
            KondisiAwal: kondisiAwal || doc.KondisiAwal
        });

        res.json(doc);
    } catch (error) {
        console.error('Update DOC error:', error);
        res.status(500).json({ error: 'Failed to update DOC' });
    }
});

// GET /api/doc/penerimaan/all - Get all nota penerimaan (filtered by peternakan)
router.get('/penerimaan/all', async (req, res) => {
    try {
        const penerimaan = await NotaPenerimaan.findAll({
            include: [{
                model: Orders,
                where: { KodePeternakan: req.user.kodePeternakan },
                required: true
            }],
            order: [['TanggalPenerimaan', 'DESC']]
        });
        res.json(penerimaan);
    } catch (error) {
        console.error('Get penerimaan error:', error);
        res.status(500).json({ error: 'Failed to get penerimaan' });
    }
});

module.exports = router;
