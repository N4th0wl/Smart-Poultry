const express = require('express');
const router = express.Router();
const { Panen, Pengiriman, NotaPengiriman, Kandang, Staf, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { generateKodePanen, generateKodePengiriman, generateKodeNotaPengiriman } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchainHelper');

router.use(authMiddleware);

// =====================================================
// HELPER: Verify kandang belongs to user's peternakan
// =====================================================
async function verifyKandangOwnership(kodeKandang, kodePeternakan) {
    const kandang = await Kandang.findOne({
        where: { KodeKandang: kodeKandang, KodePeternakan: kodePeternakan }
    });
    return kandang;
}

// =====================================================
// PENGIRIMAN ROUTES (MUST BE BEFORE /:id)
// =====================================================

// GET /api/panen/pengiriman/all - Get all pengiriman
router.get('/pengiriman/all', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const pengirimans = await sequelize.query(`
            SELECT pg.KodePengiriman, pg.KodePanen, pg.KodeKandang, pg.KodeStaf,
                   pg.TanggalPengiriman, pg.NamaPerusahaanPengiriman, pg.AlamatTujuan,
                   p.TanggalPanen, p.TotalBerat, p.TotalHarga,
                   s.NamaStaf,
                   k.KodeKandang AS KandangKode,
                   np.KodeNotaPengiriman, np.TanggalPenerimaan
            FROM Pengiriman pg
            JOIN Kandang k ON pg.KodeKandang = k.KodeKandang
            LEFT JOIN Panen p ON pg.KodePanen = p.KodePanen
            LEFT JOIN Staf s ON pg.KodeStaf = s.KodeStaf
            LEFT JOIN NotaPengiriman np ON pg.KodePengiriman = np.KodePengiriman
            WHERE k.KodePeternakan = :kodePeternakan
            ORDER BY pg.TanggalPengiriman DESC
        `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(pengirimans);
    } catch (error) {
        console.error('Get pengiriman error:', error);
        res.status(500).json({ error: 'Failed to get pengiriman' });
    }
});

// GET /api/panen/pengiriman/:id - Get single pengiriman
router.get('/pengiriman/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const [pengiriman] = await sequelize.query(`
            SELECT pg.KodePengiriman, pg.KodePanen, pg.KodeKandang, pg.KodeStaf,
                   pg.TanggalPengiriman, pg.NamaPerusahaanPengiriman, pg.AlamatTujuan,
                   p.TanggalPanen, p.TotalBerat, p.TotalHarga,
                   s.NamaStaf
            FROM Pengiriman pg
            JOIN Kandang k ON pg.KodeKandang = k.KodeKandang
            LEFT JOIN Panen p ON pg.KodePanen = p.KodePanen
            LEFT JOIN Staf s ON pg.KodeStaf = s.KodeStaf
            WHERE pg.KodePengiriman = :id AND k.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!pengiriman) {
            return res.status(404).json({ error: 'Pengiriman not found' });
        }

        // Get nota pengiriman if exists
        const notaPengiriman = await sequelize.query(`
            SELECT KodeNotaPengiriman, TanggalPenerimaan
            FROM NotaPengiriman
            WHERE KodePengiriman = :id
        `, {
            replacements: { id: req.params.id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ ...pengiriman, NotaPengiriman: notaPengiriman });
    } catch (error) {
        console.error('Get pengiriman error:', error);
        res.status(500).json({ error: 'Failed to get pengiriman' });
    }
});

// POST /api/panen/pengiriman - Create pengiriman
// Automatically creates NotaPengiriman with estimated reception date (+1 day)
router.post('/pengiriman', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kodePeternakan = req.user.kodePeternakan;
        const {
            kodePanen,
            kodeKandang,
            kodeStaf,
            tanggalPengiriman,
            namaPerusahaanPengiriman,
            alamatTujuan
        } = req.body;

        if (!kodePanen || !kodeKandang || !kodeStaf || !tanggalPengiriman) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Panen, Kandang, Staf dan Tanggal Pengiriman wajib diisi' });
        }

        // Verify kandang belongs to this peternakan
        const kandang = await verifyKandangOwnership(kodeKandang, kodePeternakan);
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Kandang not found or unauthorized' });
        }

        // Verify panen exists and belongs to this kandang
        const panen = await Panen.findOne({
            where: { KodePanen: kodePanen, KodeKandang: kodeKandang }
        });
        if (!panen) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Panen not found for this kandang' });
        }

        // Generate codes for both Pengiriman and NotaPengiriman
        const kodePengiriman = await generateKodePengiriman(sequelize, transaction);
        const kodeNotaPengiriman = await generateKodeNotaPengiriman(sequelize, transaction);

        // Create Pengiriman
        const pengiriman = await Pengiriman.create({
            KodePengiriman: kodePengiriman,
            KodePanen: kodePanen,
            KodeKandang: kodeKandang,
            KodeStaf: kodeStaf,
            TanggalPengiriman: tanggalPengiriman,
            NamaPerusahaanPengiriman: namaPerusahaanPengiriman || null,
            AlamatTujuan: alamatTujuan || null
        }, { transaction });

        // Calculate estimated reception date: TanggalPengiriman + 1 day
        const tanggalKirim = new Date(tanggalPengiriman);
        tanggalKirim.setDate(tanggalKirim.getDate() + 1);
        const tanggalPenerimaan = tanggalKirim.toISOString().split('T')[0];

        // Auto-create NotaPengiriman (delivery note)
        const notaPengiriman = await NotaPengiriman.create({
            KodeNotaPengiriman: kodeNotaPengiriman,
            KodePengiriman: kodePengiriman,
            TanggalPenerimaan: tanggalPenerimaan
        }, { transaction });

        // === BLOCKCHAIN: Create Transfer Block ===
        try {
            await blockchain.createTransferBlock(sequelize, {
                kodePeternakan,
                kodeCycle: kandang.KodeCycle,
                kodeKandang: kodeKandang,
                kodeNotaPengiriman: kodeNotaPengiriman,
                kodePengiriman: kodePengiriman,
                kodePanen: kodePanen,
                tanggalPenerimaan: tanggalPenerimaan,
                perusahaanPengiriman: namaPerusahaanPengiriman,
                alamatTujuan: alamatTujuan,
                transaction
            });
        } catch (bcError) {
            console.error('Blockchain transfer block error (non-fatal):', bcError);
        }

        await transaction.commit();

        res.status(201).json({
            ...pengiriman.toJSON(),
            NotaPengiriman: notaPengiriman.toJSON()
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create pengiriman error:', error);
        res.status(500).json({ error: 'Failed to create pengiriman' });
    }
});

// PUT /api/panen/pengiriman/:id - Update pengiriman
router.put('/pengiriman/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { tanggalPengiriman, namaPerusahaanPengiriman, alamatTujuan, kodeStaf } = req.body;

        // Verify pengiriman belongs to this peternakan
        const [ownership] = await sequelize.query(`
            SELECT pg.KodePengiriman
            FROM Pengiriman pg
            JOIN Kandang k ON pg.KodeKandang = k.KodeKandang
            WHERE pg.KodePengiriman = :id AND k.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!ownership) {
            return res.status(404).json({ error: 'Pengiriman not found' });
        }

        const pengiriman = await Pengiriman.findByPk(req.params.id);

        await pengiriman.update({
            TanggalPengiriman: tanggalPengiriman || pengiriman.TanggalPengiriman,
            NamaPerusahaanPengiriman: namaPerusahaanPengiriman ?? pengiriman.NamaPerusahaanPengiriman,
            AlamatTujuan: alamatTujuan ?? pengiriman.AlamatTujuan,
            KodeStaf: kodeStaf || pengiriman.KodeStaf
        });

        res.json({ success: true, data: pengiriman });
    } catch (error) {
        console.error('Update pengiriman error:', error);
        res.status(500).json({ error: 'Failed to update pengiriman' });
    }
});

// DELETE /api/panen/pengiriman/:id - Delete pengiriman
router.delete('/pengiriman/:id', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kodePeternakan = req.user.kodePeternakan;

        // Verify ownership
        const [ownership] = await sequelize.query(`
            SELECT pg.KodePengiriman
            FROM Pengiriman pg
            JOIN Kandang k ON pg.KodeKandang = k.KodeKandang
            WHERE pg.KodePengiriman = :id AND k.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!ownership) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Pengiriman not found' });
        }

        // Delete related nota pengiriman first
        await NotaPengiriman.destroy({
            where: { KodePengiriman: req.params.id },
            transaction
        });

        const pengiriman = await Pengiriman.findByPk(req.params.id);
        await pengiriman.destroy({ transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Pengiriman deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete pengiriman error:', error);
        res.status(500).json({ error: 'Failed to delete pengiriman' });
    }
});

// =====================================================
// NOTA PENGIRIMAN ROUTES
// =====================================================

// POST /api/panen/pengiriman/:id/nota - Create nota pengiriman
router.post('/pengiriman/:id/nota', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { tanggalPenerimaan } = req.body;

        // Verify pengiriman exists
        const [ownership] = await sequelize.query(`
            SELECT pg.KodePengiriman
            FROM Pengiriman pg
            JOIN Kandang k ON pg.KodeKandang = k.KodeKandang
            WHERE pg.KodePengiriman = :id AND k.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!ownership) {
            return res.status(404).json({ error: 'Pengiriman not found' });
        }

        const kodeNotaPengiriman = await generateKodeNotaPengiriman(sequelize);
        const nota = await NotaPengiriman.create({
            KodeNotaPengiriman: kodeNotaPengiriman,
            KodePengiriman: req.params.id,
            TanggalPenerimaan: tanggalPenerimaan || new Date()
        });

        res.status(201).json(nota);
        // NOTE: TRANSFER_PROCESSOR blockchain block is already created in POST /pengiriman
        // No need to create again here to avoid duplicate blocks in the chain
    } catch (error) {
        console.error('Create nota error:', error);
        res.status(500).json({ error: 'Failed to create nota pengiriman' });
    }
});

// =====================================================
// PANEN ROUTES
// =====================================================

// GET /api/panen - Get all panen
router.get('/', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const panens = await sequelize.query(`
            SELECT p.KodePanen, p.KodeKandang, p.TanggalPanen, p.TotalBerat, p.TotalHarga,
                   k.KodeTim, t.NamaTim,
                   d.BrandDOC, d.TipeAyam,
                   (SELECT COUNT(*) FROM Pengiriman pg WHERE pg.KodePanen = p.KodePanen) AS JumlahPengiriman
            FROM Panen p
            JOIN Kandang k ON p.KodeKandang = k.KodeKandang
            LEFT JOIN TimKerja t ON k.KodeTim = t.KodeTim
            LEFT JOIN DOC d ON d.KodeKandang = k.KodeKandang
            WHERE k.KodePeternakan = :kodePeternakan
            ORDER BY p.TanggalPanen DESC
        `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(panens);
    } catch (error) {
        console.error('Get panen error:', error);
        res.status(500).json({ error: 'Failed to get panen' });
    }
});

// GET /api/panen/:id - Get single panen with pengiriman
router.get('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const [panen] = await sequelize.query(`
            SELECT p.KodePanen, p.KodeKandang, p.TanggalPanen, p.TotalBerat, p.TotalHarga
            FROM Panen p
            JOIN Kandang k ON p.KodeKandang = k.KodeKandang
            WHERE p.KodePanen = :id AND k.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!panen) {
            return res.status(404).json({ error: 'Panen not found' });
        }

        // Get related pengiriman
        const pengirimans = await sequelize.query(`
            SELECT pg.KodePengiriman, pg.TanggalPengiriman, pg.NamaPerusahaanPengiriman,
                   pg.AlamatTujuan, pg.KodeStaf, s.NamaStaf,
                   np.KodeNotaPengiriman, np.TanggalPenerimaan
            FROM Pengiriman pg
            LEFT JOIN Staf s ON pg.KodeStaf = s.KodeStaf
            LEFT JOIN NotaPengiriman np ON pg.KodePengiriman = np.KodePengiriman
            WHERE pg.KodePanen = :id
            ORDER BY pg.TanggalPengiriman DESC
        `, {
            replacements: { id: req.params.id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ ...panen, Pengirimans: pengirimans });
    } catch (error) {
        console.error('Get panen error:', error);
        res.status(500).json({ error: 'Failed to get panen' });
    }
});

// POST /api/panen - Create panen
router.post('/', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { kodeKandang, tanggalPanen, totalBerat, totalHarga } = req.body;

        if (!kodeKandang || !tanggalPanen) {
            return res.status(400).json({ error: 'Kandang dan tanggal panen wajib diisi' });
        }

        // Verify kandang
        const kandang = await verifyKandangOwnership(kodeKandang, kodePeternakan);
        if (!kandang) {
            return res.status(403).json({ error: 'Kandang not found or unauthorized' });
        }

        const kodePanen = await generateKodePanen(sequelize);

        const panen = await Panen.create({
            KodePanen: kodePanen,
            KodeKandang: kodeKandang,
            TanggalPanen: tanggalPanen,
            TotalBerat: totalBerat || 0,
            TotalHarga: totalHarga || 0
        });

        // === BLOCKCHAIN: Create Panen Block ===
        try {
            await blockchain.createPanenBlock(sequelize, {
                kodePeternakan,
                kodeCycle: kandang.KodeCycle,
                kodeKandang: kodeKandang,
                kodePanen: kodePanen,
                tanggalPanen: tanggalPanen,
                totalBerat: totalBerat || 0,
                totalHarga: totalHarga || 0
            });
        } catch (bcError) {
            console.error('Blockchain panen block error (non-fatal):', bcError);
        }

        res.status(201).json(panen);
    } catch (error) {
        console.error('Create panen error:', error);
        res.status(500).json({ error: 'Failed to create panen' });
    }
});

// PUT /api/panen/:id - Update panen
router.put('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { tanggalPanen, totalBerat, totalHarga } = req.body;

        const panen = await Panen.findOne({
            where: { KodePanen: req.params.id },
            include: [{
                model: Kandang,
                where: { KodePeternakan: kodePeternakan },
                required: true
            }]
        });

        if (!panen) {
            return res.status(404).json({ error: 'Panen not found' });
        }

        await panen.update({
            TanggalPanen: tanggalPanen || panen.TanggalPanen,
            TotalBerat: totalBerat ?? panen.TotalBerat,
            TotalHarga: totalHarga ?? panen.TotalHarga
        });

        res.json({ success: true, data: panen });
    } catch (error) {
        console.error('Update panen error:', error);
        res.status(500).json({ error: 'Failed to update panen' });
    }
});

// DELETE /api/panen/:id - Delete panen
router.delete('/:id', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kodePeternakan = req.user.kodePeternakan;

        const panen = await Panen.findOne({
            where: { KodePanen: req.params.id },
            include: [{
                model: Kandang,
                where: { KodePeternakan: kodePeternakan },
                required: true
            }]
        });

        if (!panen) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Panen not found' });
        }

        // Delete related nota pengiriman and pengiriman first
        await sequelize.query(`
            DELETE np FROM NotaPengiriman np
            JOIN Pengiriman pg ON np.KodePengiriman = pg.KodePengiriman
            WHERE pg.KodePanen = :kodePanen
        `, { replacements: { kodePanen: req.params.id }, transaction });

        await Pengiriman.destroy({
            where: { KodePanen: req.params.id },
            transaction
        });

        await panen.destroy({ transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Panen deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete panen error:', error);
        res.status(500).json({ error: 'Failed to delete panen' });
    }
});

module.exports = router;
