const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { generateKodeTim, generateKodeStaf } = require('../utils/codeGenerator');

router.use(authMiddleware);

// =====================================================
// TIM KERJA ROUTES
// =====================================================

// GET /api/staff/tim - Get all tim with staff count
router.get('/tim', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const tim = await sequelize.query(`
      SELECT 
        t.KodeTim, t.NamaTim, t.JumlahAnggota,
        COUNT(s.KodeStaf) AS jumlahStaf
      FROM TimKerja t
      LEFT JOIN Staf s ON t.KodeTim = s.KodeTim
      WHERE t.KodePeternakan = :kodePeternakan
      GROUP BY t.KodeTim, t.NamaTim, t.JumlahAnggota
      ORDER BY t.KodeTim DESC
    `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: tim });
    } catch (error) {
        console.error('Get tim error:', error);
        res.status(500).json({ success: false, error: 'Failed to get tim' });
    }
});

// GET /api/staff/tim/:id - Get single tim with staff members
router.get('/tim/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        const [tim] = await sequelize.query(`
      SELECT t.KodeTim, t.NamaTim, t.JumlahAnggota
      FROM TimKerja t
      WHERE t.KodePeternakan = :kodePeternakan AND t.KodeTim = :id
    `, {
            replacements: { kodePeternakan, id },
            type: sequelize.QueryTypes.SELECT
        });

        if (!tim) {
            return res.status(404).json({ success: false, error: 'Tim not found' });
        }

        const staf = await sequelize.query(`
      SELECT s.KodeStaf, s.NamaStaf, s.PosisiStaf
      FROM Staf s
      WHERE s.KodeTim = :id
      ORDER BY s.KodeStaf DESC
    `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: { ...tim, staf } });
    } catch (error) {
        console.error('Get tim detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to get tim detail' });
    }
});

// POST /api/staff/tim - Create tim WITH initial staff member (required)
router.post('/tim', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kodePeternakan = req.user.kodePeternakan;
        const { namaTim, stafAwal } = req.body;

        if (!namaTim) {
            await transaction.rollback();
            return res.status(400).json({ success: false, error: 'Nama tim wajib diisi' });
        }

        // Validate: Tim must have at least 1 staff member
        if (!stafAwal || !stafAwal.namaStaf) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Tim harus memiliki minimal 1 anggota staf. Silakan tambahkan data staf awal.'
            });
        }

        // Generate KodeTim
        const kodeTim = await generateKodeTim(sequelize, transaction);

        await sequelize.query(`
      INSERT INTO TimKerja (KodeTim, KodePeternakan, NamaTim, JumlahAnggota)
      VALUES (:kodeTim, :kodePeternakan, :namaTim, 1)
    `, {
            replacements: { kodeTim, kodePeternakan, namaTim },
            type: sequelize.QueryTypes.INSERT,
            transaction
        });

        // Create initial staff member
        const kodeStaf = await generateKodeStaf(sequelize, transaction);

        await sequelize.query(`
      INSERT INTO Staf (KodeStaf, KodeTim, NamaStaf, PosisiStaf)
      VALUES (:kodeStaf, :kodeTim, :namaStaf, :posisiStaf)
    `, {
            replacements: {
                kodeStaf,
                kodeTim,
                namaStaf: stafAwal.namaStaf,
                posisiStaf: stafAwal.posisiStaf || ''
            },
            type: sequelize.QueryTypes.INSERT,
            transaction
        });

        await transaction.commit();

        const [newTim] = await sequelize.query(`
      SELECT t.KodeTim, t.NamaTim, t.JumlahAnggota,
             COUNT(s.KodeStaf) AS jumlahStaf
      FROM TimKerja t
      LEFT JOIN Staf s ON t.KodeTim = s.KodeTim
      WHERE t.KodeTim = :kodeTim
      GROUP BY t.KodeTim, t.NamaTim, t.JumlahAnggota
    `, {
            replacements: { kodeTim },
            type: sequelize.QueryTypes.SELECT
        });

        res.status(201).json({ success: true, data: newTim });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create tim error:', error);
        res.status(500).json({ success: false, error: 'Failed to create tim' });
    }
});

// PUT /api/staff/tim/:id - Update tim name
router.put('/tim/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;
        const { namaTim } = req.body;

        if (!namaTim) {
            return res.status(400).json({ success: false, error: 'Nama tim wajib diisi' });
        }

        await sequelize.query(`
      UPDATE TimKerja SET NamaTim = :namaTim
      WHERE KodeTim = :id AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan, namaTim },
            type: sequelize.QueryTypes.UPDATE
        });

        res.json({ success: true, message: 'Tim updated successfully' });
    } catch (error) {
        console.error('Update tim error:', error);
        res.status(500).json({ success: false, error: 'Failed to update tim' });
    }
});

// DELETE /api/staff/tim/:id - Delete tim (only if no staff or references)
router.delete('/tim/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        // Check if tim has staff
        const [staffCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Staf WHERE KodeTim = :id
    `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        if (staffCount.count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Tidak dapat menghapus tim yang masih memiliki anggota staf. Pindahkan atau hapus semua staf terlebih dahulu.'
            });
        }

        // Check if tim is assigned to a kandang
        const [kandangCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Kandang WHERE KodeTim = :id
    `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        if (kandangCount.count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Tidak dapat menghapus tim yang sedang ditugaskan ke kandang aktif.'
            });
        }

        await sequelize.query(`
      DELETE FROM TimKerja 
      WHERE KodeTim = :id AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.DELETE
        });

        res.json({ success: true, message: 'Tim deleted successfully' });
    } catch (error) {
        console.error('Delete tim error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete tim' });
    }
});

// =====================================================
// STAF ROUTES
// =====================================================

// GET /api/staff - Get all staff
router.get('/', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const staf = await sequelize.query(`
      SELECT s.KodeStaf, s.KodeTim, s.NamaStaf, s.PosisiStaf,
             t.NamaTim
      FROM Staf s
      JOIN TimKerja t ON s.KodeTim = t.KodeTim
      WHERE t.KodePeternakan = :kodePeternakan
      ORDER BY s.KodeStaf DESC
    `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: staf });
    } catch (error) {
        console.error('Get staf error:', error);
        res.status(500).json({ success: false, error: 'Failed to get staf' });
    }
});

// GET /api/staff/unassigned - Get staff not in any team (for reassignment)
router.get('/unassigned', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const staf = await sequelize.query(`
      SELECT s.KodeStaf, s.NamaStaf, s.PosisiStaf
      FROM Staf s
      JOIN TimKerja t ON s.KodeTim = t.KodeTim
      WHERE t.KodePeternakan = :kodePeternakan
      ORDER BY s.NamaStaf ASC
    `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: staf });
    } catch (error) {
        console.error('Get unassigned staf error:', error);
        res.status(500).json({ success: false, error: 'Failed to get staf' });
    }
});

// GET /api/staff/:id - Get single staff
router.get('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        const [staf] = await sequelize.query(`
      SELECT s.KodeStaf, s.KodeTim, s.NamaStaf, s.PosisiStaf,
             t.NamaTim
      FROM Staf s
      JOIN TimKerja t ON s.KodeTim = t.KodeTim
      WHERE s.KodeStaf = :id AND t.KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!staf) {
            return res.status(404).json({ success: false, error: 'Staf not found' });
        }

        res.json({ success: true, data: staf });
    } catch (error) {
        console.error('Get staf detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to get staf detail' });
    }
});

// POST /api/staff - Create staff and assign to tim
router.post('/', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kodePeternakan = req.user.kodePeternakan;
        const { kodeTim, namaStaf, posisiStaf } = req.body;

        if (!kodeTim || !namaStaf) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Tim dan nama staf wajib diisi'
            });
        }

        // Verify tim belongs to this peternakan
        const [timOwnership] = await sequelize.query(`
      SELECT KodeTim FROM TimKerja WHERE KodeTim = :kodeTim AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { kodeTim, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!timOwnership) {
            await transaction.rollback();
            return res.status(403).json({ success: false, error: 'Tim not found or unauthorized' });
        }

        // Generate KodeStaf
        const kodeStaf = await generateKodeStaf(sequelize, transaction);

        await sequelize.query(`
      INSERT INTO Staf (KodeStaf, KodeTim, NamaStaf, PosisiStaf)
      VALUES (:kodeStaf, :kodeTim, :namaStaf, :posisiStaf)
    `, {
            replacements: { kodeStaf, kodeTim, namaStaf, posisiStaf: posisiStaf || '' },
            type: sequelize.QueryTypes.INSERT,
            transaction
        });

        // Update JumlahAnggota in TimKerja
        await sequelize.query(`
      UPDATE TimKerja SET JumlahAnggota = (SELECT COUNT(*) FROM Staf WHERE KodeTim = :kodeTim)
      WHERE KodeTim = :kodeTim
    `, {
            replacements: { kodeTim },
            type: sequelize.QueryTypes.UPDATE,
            transaction
        });

        await transaction.commit();

        const [newStaf] = await sequelize.query(`
      SELECT s.*, t.NamaTim FROM Staf s 
      JOIN TimKerja t ON s.KodeTim = t.KodeTim
      WHERE s.KodeStaf = :kodeStaf
    `, {
            replacements: { kodeStaf },
            type: sequelize.QueryTypes.SELECT
        });

        res.status(201).json({ success: true, data: newStaf });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create staf error:', error);
        res.status(500).json({ success: false, error: 'Failed to create staf' });
    }
});

// PUT /api/staff/:id - Update staff (with team reassignment support)
router.put('/:id', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;
        const { kodeTim, namaStaf, posisiStaf } = req.body;

        // Verify staff exists and belongs to this peternakan
        const [ownership] = await sequelize.query(`
      SELECT s.KodeStaf, s.KodeTim AS oldKodeTim FROM Staf s
      JOIN TimKerja t ON s.KodeTim = t.KodeTim
      WHERE s.KodeStaf = :id AND t.KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!ownership) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Staf not found' });
        }

        const oldKodeTim = ownership.oldKodeTim;

        // If changing tim, validate
        if (kodeTim && kodeTim !== oldKodeTim) {
            const [timOwnership] = await sequelize.query(`
          SELECT KodeTim FROM TimKerja WHERE KodeTim = :kodeTim AND KodePeternakan = :kodePeternakan
        `, {
                replacements: { kodeTim, kodePeternakan },
                type: sequelize.QueryTypes.SELECT
            });
            if (!timOwnership) {
                await transaction.rollback();
                return res.status(403).json({ success: false, error: 'Tim tujuan tidak ditemukan' });
            }

            // Check if removing from old team would leave it empty
            const [oldTimCount] = await sequelize.query(`
          SELECT COUNT(*) as count FROM Staf WHERE KodeTim = :oldKodeTim
        `, {
                replacements: { oldKodeTim },
                type: sequelize.QueryTypes.SELECT
            });

            if (oldTimCount.count <= 1) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    error: 'Tidak dapat memindahkan staf terakhir dari tim. Tim harus memiliki minimal 1 anggota.'
                });
            }
        }

        const finalKodeTim = kodeTim || oldKodeTim;

        await sequelize.query(`
      UPDATE Staf 
      SET KodeTim = :kodeTim, NamaStaf = :namaStaf, PosisiStaf = :posisiStaf
      WHERE KodeStaf = :id
    `, {
            replacements: { id, kodeTim: finalKodeTim, namaStaf, posisiStaf },
            type: sequelize.QueryTypes.UPDATE,
            transaction
        });

        // Update JumlahAnggota for old and new tim
        if (kodeTim && kodeTim !== oldKodeTim) {
            await sequelize.query(`
          UPDATE TimKerja SET JumlahAnggota = (SELECT COUNT(*) FROM Staf WHERE KodeTim = :oldKodeTim)
          WHERE KodeTim = :oldKodeTim
        `, { replacements: { oldKodeTim }, type: sequelize.QueryTypes.UPDATE, transaction });

            await sequelize.query(`
          UPDATE TimKerja SET JumlahAnggota = (SELECT COUNT(*) FROM Staf WHERE KodeTim = :kodeTim)
          WHERE KodeTim = :kodeTim
        `, { replacements: { kodeTim }, type: sequelize.QueryTypes.UPDATE, transaction });
        }

        await transaction.commit();
        res.json({ success: true, message: 'Staf updated successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Update staf error:', error);
        res.status(500).json({ success: false, error: 'Failed to update staf' });
    }
});

// DELETE /api/staff/:id - Delete staff (must not be last member of the team)
router.delete('/:id', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        // Verify staff belongs to this peternakan via TimKerja
        const [ownership] = await sequelize.query(`
      SELECT s.KodeStaf, s.KodeTim FROM Staf s
      JOIN TimKerja t ON s.KodeTim = t.KodeTim
      WHERE s.KodeStaf = :id AND t.KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!ownership) {
            await transaction.rollback();
            return res.status(404).json({ success: false, error: 'Staf not found' });
        }

        // Check if this is the last staff in the team
        const [teamCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Staf WHERE KodeTim = :kodeTim
    `, {
            replacements: { kodeTim: ownership.KodeTim },
            type: sequelize.QueryTypes.SELECT
        });

        if (teamCount.count <= 1) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Tidak dapat menghapus staf terakhir dalam tim. Tim harus memiliki minimal 1 anggota. Hapus tim jika ingin menghilangkan semuanya.'
            });
        }

        // Check if staff is assigned to any pengiriman
        const [pengirimanCheck] = await sequelize.query(`
      SELECT COUNT(*) as count FROM Pengiriman WHERE KodeStaf = :id
    `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        if (pengirimanCheck.count > 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Tidak dapat menghapus staf yang memiliki data pengiriman terkait.'
            });
        }

        const kodeTim = ownership.KodeTim;

        await sequelize.query(`
      DELETE FROM Staf WHERE KodeStaf = :id
    `, {
            replacements: { id },
            type: sequelize.QueryTypes.DELETE,
            transaction
        });

        // Update JumlahAnggota
        await sequelize.query(`
      UPDATE TimKerja SET JumlahAnggota = (SELECT COUNT(*) FROM Staf WHERE KodeTim = :kodeTim)
      WHERE KodeTim = :kodeTim
    `, {
            replacements: { kodeTim },
            type: sequelize.QueryTypes.UPDATE,
            transaction
        });

        await transaction.commit();
        res.json({ success: true, message: 'Staf deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete staf error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete staf' });
    }
});

module.exports = router;
