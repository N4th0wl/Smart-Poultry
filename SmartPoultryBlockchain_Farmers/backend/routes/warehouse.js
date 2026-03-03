const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { generateKodePerlengkapan, generateKodeWarehouse } = require('../utils/codeGenerator');

router.use(authMiddleware);

// =====================================================
// PERLENGKAPAN ROUTES (MUST BE BEFORE /:id)
// =====================================================

// GET /api/warehouse/perlengkapan/all - Get all perlengkapan
router.get('/perlengkapan/all', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const perlengkapan = await sequelize.query(`
      SELECT p.KodePerlengkapan, p.NamaPerlengkapan, 
             p.KategoriPerlengkapan, p.Satuan,
             COALESCE(SUM(sw.Jumlah), 0) AS totalStok
      FROM Perlengkapan p
      LEFT JOIN StokWarehouse sw ON p.KodePerlengkapan = sw.KodePerlengkapan
      WHERE p.KodePeternakan = :kodePeternakan
      GROUP BY p.KodePerlengkapan, p.NamaPerlengkapan, 
               p.KategoriPerlengkapan, p.Satuan
      ORDER BY p.NamaPerlengkapan ASC
    `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: perlengkapan });
    } catch (error) {
        console.error('Get perlengkapan error:', error);
        res.status(500).json({ success: false, error: 'Failed to get perlengkapan' });
    }
});

// GET /api/warehouse/perlengkapan/:id - Get single perlengkapan
router.get('/perlengkapan/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        const [perlengkapan] = await sequelize.query(`
      SELECT p.*, COALESCE(SUM(sw.Jumlah), 0) AS totalStok
      FROM Perlengkapan p
      LEFT JOIN StokWarehouse sw ON p.KodePerlengkapan = sw.KodePerlengkapan
      WHERE p.KodePerlengkapan = :id AND p.KodePeternakan = :kodePeternakan
      GROUP BY p.KodePerlengkapan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!perlengkapan) {
            return res.status(404).json({ success: false, error: 'Perlengkapan not found' });
        }

        res.json({ success: true, data: perlengkapan });
    } catch (error) {
        console.error('Get perlengkapan detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to get perlengkapan detail' });
    }
});

// POST /api/warehouse/perlengkapan - Create perlengkapan
router.post('/perlengkapan', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { namaPerlengkapan, kategoriPerlengkapan, satuan } = req.body;

        if (!namaPerlengkapan || !kategoriPerlengkapan) {
            return res.status(400).json({
                success: false,
                error: 'Name and category are required'
            });
        }

        // Generate KodePerlengkapan BEFORE insert (it's the primary key)
        const kodePerlengkapan = await generateKodePerlengkapan(sequelize);

        await sequelize.query(`
      INSERT INTO Perlengkapan (KodePerlengkapan, KodePeternakan, NamaPerlengkapan, KategoriPerlengkapan, Satuan)
      VALUES (:kodePerlengkapan, :kodePeternakan, :namaPerlengkapan, :kategoriPerlengkapan, :satuan)
    `, {
            replacements: {
                kodePerlengkapan,
                kodePeternakan,
                namaPerlengkapan,
                kategoriPerlengkapan,
                satuan: satuan || 'unit'
            },
            type: sequelize.QueryTypes.INSERT
        });

        const [newPerlengkapan] = await sequelize.query(`
      SELECT * FROM Perlengkapan WHERE KodePerlengkapan = :kodePerlengkapan
    `, {
            replacements: { kodePerlengkapan },
            type: sequelize.QueryTypes.SELECT
        });

        res.status(201).json({ success: true, data: newPerlengkapan });
    } catch (error) {
        console.error('Create perlengkapan error:', error);
        res.status(500).json({ success: false, error: 'Failed to create perlengkapan' });
    }
});

// PUT /api/warehouse/perlengkapan/:id - Update perlengkapan
router.put('/perlengkapan/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;
        const { namaPerlengkapan, kategoriPerlengkapan, satuan } = req.body;

        await sequelize.query(`
      UPDATE Perlengkapan 
      SET NamaPerlengkapan = :namaPerlengkapan, 
          KategoriPerlengkapan = :kategoriPerlengkapan, 
          Satuan = :satuan
      WHERE KodePerlengkapan = :id AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan, namaPerlengkapan, kategoriPerlengkapan, satuan },
            type: sequelize.QueryTypes.UPDATE
        });

        res.json({ success: true, message: 'Perlengkapan updated successfully' });
    } catch (error) {
        console.error('Update perlengkapan error:', error);
        res.status(500).json({ success: false, error: 'Failed to update perlengkapan' });
    }
});

// DELETE /api/warehouse/perlengkapan/:id - Delete perlengkapan
router.delete('/perlengkapan/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        await sequelize.query(`
      DELETE FROM Perlengkapan 
      WHERE KodePerlengkapan = :id AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.DELETE
        });

        res.json({ success: true, message: 'Perlengkapan deleted successfully' });
    } catch (error) {
        console.error('Delete perlengkapan error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete perlengkapan' });
    }
});

// PUT /api/warehouse/stok/:id - Update stock (MUST BE BEFORE /:id)
router.put('/stok/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;
        const { jumlahStok, kodePerlengkapan } = req.body;

        // Verify warehouse belongs to this peternakan
        const [warehouseOwnership] = await sequelize.query(`
      SELECT KodeWarehouse FROM Warehouse WHERE KodeWarehouse = :id AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!warehouseOwnership) {
            return res.status(404).json({ success: false, error: 'Warehouse not found' });
        }

        await sequelize.query(`
      UPDATE StokWarehouse SET Jumlah = :jumlahStok WHERE KodeWarehouse = :kodeWarehouse AND KodePerlengkapan = :kodePerlengkapan
    `, {
            replacements: { kodeWarehouse: id, jumlahStok, kodePerlengkapan },
            type: sequelize.QueryTypes.UPDATE
        });

        res.json({ success: true, message: 'Stock updated successfully' });
    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ success: false, error: 'Failed to update stock' });
    }
});

// =====================================================
// WAREHOUSE ROUTES
// =====================================================

// GET /api/warehouse - Get all warehouses
router.get('/', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const warehouses = await sequelize.query(`
      SELECT 
        w.KodeWarehouse, w.LokasiWarehouse,
        COUNT(DISTINCT sw.KodePerlengkapan) AS jumlahItem,
        COALESCE(SUM(sw.Jumlah), 0) AS totalStok
      FROM Warehouse w
      LEFT JOIN StokWarehouse sw ON w.KodeWarehouse = sw.KodeWarehouse
      WHERE w.KodePeternakan = :kodePeternakan
      GROUP BY w.KodeWarehouse, w.LokasiWarehouse
      ORDER BY w.KodeWarehouse DESC
    `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: warehouses });
    } catch (error) {
        console.error('Get warehouses error:', error);
        res.status(500).json({ success: false, error: 'Failed to get warehouses' });
    }
});

// GET /api/warehouse/:id - Get single warehouse with stok
router.get('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        const [warehouse] = await sequelize.query(`
      SELECT w.KodeWarehouse, w.LokasiWarehouse
      FROM Warehouse w
      WHERE w.KodeWarehouse = :id AND w.KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!warehouse) {
            return res.status(404).json({ success: false, error: 'Warehouse not found' });
        }

        const stok = await sequelize.query(`
      SELECT sw.KodeWarehouse, sw.KodePerlengkapan, sw.Jumlah AS JumlahStok, sw.TanggalMasukPerlengkapan,
             p.NamaPerlengkapan, p.KategoriPerlengkapan, p.Satuan
      FROM StokWarehouse sw
      JOIN Perlengkapan p ON sw.KodePerlengkapan = p.KodePerlengkapan
      WHERE sw.KodeWarehouse = :id
      ORDER BY sw.TanggalMasukPerlengkapan DESC
    `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: { ...warehouse, stok } });
    } catch (error) {
        console.error('Get warehouse detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to get warehouse detail' });
    }
});

// POST /api/warehouse - Create warehouse
router.post('/', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { lokasiWarehouse } = req.body;

        if (!lokasiWarehouse) {
            return res.status(400).json({ success: false, error: 'Lokasi warehouse is required' });
        }

        // Generate KodeWarehouse BEFORE insert (it's the primary key)
        const kodeWarehouse = await generateKodeWarehouse(sequelize);

        await sequelize.query(`
      INSERT INTO Warehouse (KodeWarehouse, KodePeternakan, LokasiWarehouse)
      VALUES (:kodeWarehouse, :kodePeternakan, :lokasiWarehouse)
    `, {
            replacements: { kodeWarehouse, kodePeternakan, lokasiWarehouse },
            type: sequelize.QueryTypes.INSERT
        });

        const [newWarehouse] = await sequelize.query(`
      SELECT * FROM Warehouse WHERE KodeWarehouse = :kodeWarehouse
    `, {
            replacements: { kodeWarehouse },
            type: sequelize.QueryTypes.SELECT
        });

        res.status(201).json({ success: true, data: newWarehouse });
    } catch (error) {
        console.error('Create warehouse error:', error);
        res.status(500).json({ success: false, error: 'Failed to create warehouse' });
    }
});

// PUT /api/warehouse/:id - Update warehouse
router.put('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;
        const { lokasiWarehouse } = req.body;

        await sequelize.query(`
      UPDATE Warehouse 
      SET LokasiWarehouse = :lokasiWarehouse
      WHERE KodeWarehouse = :id AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan, lokasiWarehouse },
            type: sequelize.QueryTypes.UPDATE
        });

        res.json({ success: true, message: 'Warehouse updated successfully' });
    } catch (error) {
        console.error('Update warehouse error:', error);
        res.status(500).json({ success: false, error: 'Failed to update warehouse' });
    }
});

// DELETE /api/warehouse/:id - Delete warehouse
router.delete('/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        // Check if warehouse has stock
        const [stockCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM StokWarehouse WHERE KodeWarehouse = :id
    `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        if (stockCount.count > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete warehouse with existing stock'
            });
        }

        await sequelize.query(`
      DELETE FROM Warehouse 
      WHERE KodeWarehouse = :id AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.DELETE
        });

        res.json({ success: true, message: 'Warehouse deleted successfully' });
    } catch (error) {
        console.error('Delete warehouse error:', error);
        res.status(500).json({ success: false, error: 'Failed to delete warehouse' });
    }
});

// POST /api/warehouse/:id/stok - Add stock to warehouse (with ownership check)
router.post('/:id/stok', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;
        const { kodePerlengkapan, jumlahStok } = req.body;

        if (!kodePerlengkapan || !jumlahStok) {
            return res.status(400).json({
                success: false,
                error: 'Perlengkapan and jumlah are required'
            });
        }

        // Verify warehouse belongs to this peternakan
        const [warehouseOwnership] = await sequelize.query(`
      SELECT KodeWarehouse FROM Warehouse WHERE KodeWarehouse = :id AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!warehouseOwnership) {
            return res.status(404).json({ success: false, error: 'Warehouse not found' });
        }

        // Verify perlengkapan belongs to this peternakan
        const [perlengkapanOwnership] = await sequelize.query(`
      SELECT KodePerlengkapan FROM Perlengkapan WHERE KodePerlengkapan = :kodePerlengkapan AND KodePeternakan = :kodePeternakan
    `, {
            replacements: { kodePerlengkapan, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!perlengkapanOwnership) {
            return res.status(403).json({ success: false, error: 'Perlengkapan not found or unauthorized' });
        }

        await sequelize.query(`
      INSERT INTO StokWarehouse (KodeWarehouse, KodePerlengkapan, Jumlah, TanggalMasukPerlengkapan)
      VALUES (:kodeWarehouse, :kodePerlengkapan, :jumlahStok, CURDATE())
    `, {
            replacements: {
                kodeWarehouse: id,
                kodePerlengkapan,
                jumlahStok
            },
            type: sequelize.QueryTypes.INSERT
        });

        res.status(201).json({ success: true, message: 'Stock added successfully' });
    } catch (error) {
        console.error('Add stock error:', error);
        res.status(500).json({ success: false, error: 'Failed to add stock' });
    }
});

// POST /api/warehouse/transfer - Transfer stock between warehouses
router.post('/transfer', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kodePeternakan = req.user.kodePeternakan;
        const { fromWarehouse, toWarehouse, kodePerlengkapan, jumlah } = req.body;

        if (!fromWarehouse || !toWarehouse || !kodePerlengkapan || !jumlah || jumlah <= 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Warehouse asal, tujuan, perlengkapan, dan jumlah wajib diisi'
            });
        }

        if (fromWarehouse === toWarehouse) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'Warehouse asal dan tujuan tidak boleh sama'
            });
        }

        // Verify both warehouses belong to this peternakan
        const warehouses = await sequelize.query(`
            SELECT KodeWarehouse FROM Warehouse 
            WHERE KodePeternakan = :kodePeternakan AND KodeWarehouse IN (:fromWarehouse, :toWarehouse)
        `, {
            replacements: { kodePeternakan, fromWarehouse, toWarehouse },
            type: sequelize.QueryTypes.SELECT,
            transaction
        });

        if (warehouses.length < 2) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Satu atau kedua warehouse tidak ditemukan'
            });
        }

        // Check source stock
        const [sourceStock] = await sequelize.query(`
            SELECT Jumlah FROM StokWarehouse 
            WHERE KodeWarehouse = :fromWarehouse AND KodePerlengkapan = :kodePerlengkapan
        `, {
            replacements: { fromWarehouse, kodePerlengkapan },
            type: sequelize.QueryTypes.SELECT,
            transaction
        });

        if (!sourceStock || sourceStock.Jumlah < jumlah) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: `Stok tidak mencukupi. Stok tersedia: ${sourceStock?.Jumlah || 0}`
            });
        }

        // Decrease source stock
        const newSourceAmount = sourceStock.Jumlah - jumlah;
        if (newSourceAmount === 0) {
            await sequelize.query(`
                DELETE FROM StokWarehouse 
                WHERE KodeWarehouse = :fromWarehouse AND KodePerlengkapan = :kodePerlengkapan
            `, {
                replacements: { fromWarehouse, kodePerlengkapan },
                type: sequelize.QueryTypes.DELETE,
                transaction
            });
        } else {
            await sequelize.query(`
                UPDATE StokWarehouse SET Jumlah = :newAmount 
                WHERE KodeWarehouse = :fromWarehouse AND KodePerlengkapan = :kodePerlengkapan
            `, {
                replacements: { newAmount: newSourceAmount, fromWarehouse, kodePerlengkapan },
                type: sequelize.QueryTypes.UPDATE,
                transaction
            });
        }

        // Increase destination stock
        const [destStock] = await sequelize.query(`
            SELECT Jumlah FROM StokWarehouse 
            WHERE KodeWarehouse = :toWarehouse AND KodePerlengkapan = :kodePerlengkapan
        `, {
            replacements: { toWarehouse, kodePerlengkapan },
            type: sequelize.QueryTypes.SELECT,
            transaction
        });

        if (destStock) {
            await sequelize.query(`
                UPDATE StokWarehouse SET Jumlah = Jumlah + :jumlah 
                WHERE KodeWarehouse = :toWarehouse AND KodePerlengkapan = :kodePerlengkapan
            `, {
                replacements: { jumlah, toWarehouse, kodePerlengkapan },
                type: sequelize.QueryTypes.UPDATE,
                transaction
            });
        } else {
            await sequelize.query(`
                INSERT INTO StokWarehouse (KodeWarehouse, KodePerlengkapan, Jumlah, TanggalMasukPerlengkapan)
                VALUES (:toWarehouse, :kodePerlengkapan, :jumlah, CURDATE())
            `, {
                replacements: { toWarehouse, kodePerlengkapan, jumlah },
                type: sequelize.QueryTypes.INSERT,
                transaction
            });
        }

        await transaction.commit();
        res.json({ success: true, message: `Berhasil memindahkan ${jumlah} item` });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Transfer stock error:', error);
        res.status(500).json({ success: false, error: 'Gagal memindahkan stok' });
    }
});

module.exports = router;
