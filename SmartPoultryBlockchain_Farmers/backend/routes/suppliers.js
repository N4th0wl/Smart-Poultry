const express = require('express');
const router = express.Router();
const { Supplier, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { generateKodeSupplier } = require('../utils/codeGenerator');

router.use(authMiddleware);

// GET /api/suppliers - Get all suppliers
router.get('/', async (req, res) => {
    try {
        const suppliers = await Supplier.findAll({
            where: { KodePeternakan: req.user.kodePeternakan },
            order: [['NamaSupplier', 'ASC']]
        });
        res.json(suppliers);
    } catch (error) {
        console.error('Get suppliers error:', error);
        res.status(500).json({ error: 'Failed to get suppliers' });
    }
});

// POST /api/suppliers - Create supplier
router.post('/', async (req, res) => {
    try {
        const { namaSupplier, kontakSupplier } = req.body;

        if (!namaSupplier || !kontakSupplier) {
            return res.status(400).json({ error: 'Name and contact required' });
        }

        // Generate KodeSupplier BEFORE insert (it's now the primary key)
        const kodeSupplier = await generateKodeSupplier(sequelize);

        const supplier = await Supplier.create({
            KodeSupplier: kodeSupplier,
            KodePeternakan: req.user.kodePeternakan,
            NamaSupplier: namaSupplier,
            KontakSupplier: kontakSupplier
        });

        res.status(201).json(supplier);
    } catch (error) {
        console.error('Create supplier error:', error);
        res.status(500).json({ error: 'Failed to create supplier', details: error.message });
    }
});

// PUT /api/suppliers/:id - Update supplier
router.put('/:id', async (req, res) => {
    try {
        const { namaSupplier, kontakSupplier } = req.body;

        const supplier = await Supplier.findOne({
            where: {
                KodeSupplier: req.params.id,
                KodePeternakan: req.user.kodePeternakan
            }
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        await supplier.update({
            NamaSupplier: namaSupplier || supplier.NamaSupplier,
            KontakSupplier: kontakSupplier || supplier.KontakSupplier
        });

        res.json(supplier);
    } catch (error) {
        console.error('Update supplier error:', error);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
});

// DELETE /api/suppliers/:id
router.delete('/:id', async (req, res) => {
    try {
        const supplier = await Supplier.findOne({
            where: {
                KodeSupplier: req.params.id,
                KodePeternakan: req.user.kodePeternakan
            }
        });

        if (!supplier) {
            return res.status(404).json({ error: 'Supplier not found' });
        }

        await supplier.destroy();
        res.json({ message: 'Supplier deleted successfully' });
    } catch (error) {
        console.error('Delete supplier error:', error);
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
});

module.exports = router;
