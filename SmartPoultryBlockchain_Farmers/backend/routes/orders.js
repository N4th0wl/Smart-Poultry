const express = require('express');
const { Sequelize } = require('sequelize');
const router = express.Router();
const { Orders, DetailOrder, Supplier, NotaPenerimaan, MasterObat, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { generateKodeOrder, generateKodeDetailOrder, generateKodePenerimaan, generateKodeDetailNota, generateKodeDOC, generateKodeWarehouse, generateKodePerlengkapan } = require('../utils/codeGenerator');

// Apply auth middleware to all routes
router.use(authMiddleware);

// =====================================================
// NOTA PENERIMAAN ROUTES (MUST BE BEFORE /:id)
// =====================================================

// GET /api/orders/nota-penerimaan/all - Get all nota penerimaan
router.get('/nota-penerimaan/all', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const notaPenerimaan = await sequelize.query(`
            SELECT np.KodePenerimaan, np.KodeOrder, 
                   np.TanggalPenerimaan, np.NamaPenerima,
                   o.TanggalOrder, o.StatusOrder,
                   s.NamaSupplier, s.KontakSupplier
            FROM NotaPenerimaan np
            JOIN Orders o ON np.KodeOrder = o.KodeOrder
            JOIN Supplier s ON o.KodeSupplier = s.KodeSupplier
            WHERE o.KodePeternakan = :kodePeternakan
            ORDER BY np.TanggalPenerimaan DESC
        `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: notaPenerimaan });
    } catch (error) {
        console.error('Get nota penerimaan error:', error);
        res.status(500).json({ success: false, error: 'Failed to get nota penerimaan' });
    }
});

// GET /api/orders/nota-penerimaan/:id - Get single nota with details
router.get('/nota-penerimaan/:id', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;
        const { id } = req.params;

        const [nota] = await sequelize.query(`
            SELECT np.KodePenerimaan, np.KodeOrder, 
                   np.TanggalPenerimaan, np.NamaPenerima,
                   o.TanggalOrder, s.NamaSupplier, s.KontakSupplier
            FROM NotaPenerimaan np
            JOIN Orders o ON np.KodeOrder = o.KodeOrder
            JOIN Supplier s ON o.KodeSupplier = s.KodeSupplier
            WHERE np.KodePenerimaan = :id AND o.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!nota) {
            return res.status(404).json({ success: false, error: 'Nota penerimaan not found' });
        }

        const details = await sequelize.query(`
            SELECT dnp.KodeDetailNota, dnp.JenisBarang, dnp.NamaBarang, dnp.Jumlah
            FROM DetailNotaPenerimaan dnp
            WHERE dnp.KodePenerimaan = :id
        `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: { ...nota, details } });
    } catch (error) {
        console.error('Get nota detail error:', error);
        res.status(500).json({ success: false, error: 'Failed to get nota detail' });
    }
});

// =====================================================
// ORDER ROUTES
// =====================================================

// GET /api/orders - Get all orders for user's peternakan
router.get('/', async (req, res) => {
    try {
        const orders = await Orders.findAll({
            where: { KodePeternakan: req.user.kodePeternakan },
            include: [
                { model: Supplier, attributes: ['NamaSupplier', 'KontakSupplier'] },
                { model: DetailOrder }
            ],
            order: [['TanggalOrder', 'DESC']]
        });

        res.json(orders);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ error: 'Failed to get orders' });
    }
});

// GET /api/orders/:id - Get single order
router.get('/:id', async (req, res) => {
    try {
        const order = await Orders.findOne({
            where: {
                KodeOrder: req.params.id,
                KodePeternakan: req.user.kodePeternakan
            },
            include: [
                { model: Supplier },
                { model: DetailOrder }
            ]
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({ error: 'Failed to get order' });
    }
});

// POST /api/orders - Create new order
// POST /api/orders - Create new order
router.post('/', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { kodeSupplier, tanggalOrder, statusOrder, details } = req.body;
        const kodePeternakan = req.user.kodePeternakan;

        if (!kodeSupplier || !tanggalOrder) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Supplier and date required' });
        }

        // Verify supplier belongs to this peternakan
        const supplier = await Supplier.findOne({
            where: { KodeSupplier: kodeSupplier, KodePeternakan: kodePeternakan },
            transaction
        });

        if (!supplier) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Supplier not found or unauthorized' });
        }

        // Generate KodeOrder using application code generator
        const kodeOrder = await generateKodeOrder(sequelize, transaction);

        const order = await Orders.create({
            KodeOrder: kodeOrder,
            KodePeternakan: kodePeternakan,
            KodeSupplier: kodeSupplier,
            TanggalOrder: tanggalOrder,
            StatusOrder: statusOrder || 'PROSES'
        }, { transaction });

        // Create detail orders if provided
        if (details && Array.isArray(details)) {
            for (const detail of details) {
                // Generate KodeDetailOrder using application code generator
                const kodeDetailOrder = await generateKodeDetailOrder(sequelize, transaction);

                await DetailOrder.create({
                    KodeDetailOrder: kodeDetailOrder,
                    KodeOrder: order.KodeOrder,
                    JenisBarang: detail.jenisBarang,
                    NamaBarang: detail.namaBarang,
                    JumlahBarang: detail.jumlahBarang,
                    HargaSatuan: detail.hargaSatuan
                }, { transaction });
            }
        }

        await transaction.commit();

        // Fetch complete order with details
        const completeOrder = await Orders.findByPk(order.KodeOrder, {
            include: [{ model: DetailOrder }]
        });

        res.status(201).json(completeOrder);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order', details: error.message });
    }
});

// PUT /api/orders/:id - Update order
router.put('/:id', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { tanggalOrder, statusOrder, kodeWarehouse: selectedWarehouse, namaPenerima, docDetails, obatDetails } = req.body;
        const kodePeternakan = req.user.kodePeternakan;

        const order = await Orders.findOne({
            where: {
                KodeOrder: req.params.id,
                KodePeternakan: kodePeternakan
            },
            include: [{ model: DetailOrder }],
            transaction
        });

        if (!order) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Order not found' });
        }

        const oldStatus = order.StatusOrder;

        await order.update({
            TanggalOrder: tanggalOrder || order.TanggalOrder,
            StatusOrder: statusOrder || order.StatusOrder
        }, { transaction });

        // LOGIC: If status changed to SUDAH DITERIMA, trigger automation
        if (oldStatus !== 'SUDAH DITERIMA' && statusOrder === 'SUDAH DITERIMA') {

            // Generate KodePenerimaan using application code generator
            const kodePenerimaan = await generateKodePenerimaan(sequelize, transaction);

            // 1. Create NotaPenerimaan
            await NotaPenerimaan.create({
                KodePenerimaan: kodePenerimaan,
                KodeOrder: order.KodeOrder,
                TanggalPenerimaan: new Date(),
                NamaPenerima: namaPenerima || req.user.nama || 'SYSTEM'
            }, { transaction });

            // 2. Process Details
            if (order.DetailOrders && order.DetailOrders.length > 0) {
                // Use selected warehouse, or find/create default
                let warehouse;
                if (selectedWarehouse) {
                    warehouse = await require('../models').Warehouse.findOne({
                        where: { KodeWarehouse: selectedWarehouse, KodePeternakan: kodePeternakan },
                        transaction
                    });
                }
                if (!warehouse) {
                    warehouse = await require('../models').Warehouse.findOne({
                        where: { KodePeternakan: kodePeternakan },
                        transaction
                    });
                }

                // Auto-create warehouse if none exists
                if (!warehouse) {
                    const kodeWarehouse = await generateKodeWarehouse(sequelize, transaction);
                    warehouse = await require('../models').Warehouse.create({
                        KodeWarehouse: kodeWarehouse,
                        KodePeternakan: kodePeternakan,
                        LokasiWarehouse: 'Warehouse Utama'
                    }, { transaction });
                }

                // Fix legacy warehouse with empty KodeWarehouse
                if (!warehouse.KodeWarehouse) {
                    const kodeWarehouse = await generateKodeWarehouse(sequelize, transaction);
                    await warehouse.update({ KodeWarehouse: kodeWarehouse }, { transaction });
                }

                // Build a map of docDetails by KodeDetailOrder for easy lookup
                const docDetailsMap = {};
                if (docDetails && Array.isArray(docDetails)) {
                    docDetails.forEach(dd => {
                        if (dd.kodeDetailOrder) {
                            docDetailsMap[dd.kodeDetailOrder] = dd;
                        }
                    });
                }

                // Build a map of obatDetails by KodeDetailOrder for easy lookup
                const obatDetailsMap = {};
                if (obatDetails && Array.isArray(obatDetails)) {
                    obatDetails.forEach(od => {
                        if (od.kodeDetailOrder) {
                            obatDetailsMap[od.kodeDetailOrder] = od;
                        }
                    });
                }

                for (const detail of order.DetailOrders) {
                    // Generate KodeDetailNota using application code generator
                    const kodeDetailNota = await generateKodeDetailNota(sequelize, transaction);

                    // Create DetailNotaPenerimaan
                    await require('../models').DetailNotaPenerimaan.create({
                        KodeDetailNota: kodeDetailNota,
                        KodePenerimaan: kodePenerimaan,
                        JenisBarang: detail.JenisBarang,
                        NamaBarang: detail.NamaBarang,
                        Jumlah: detail.JumlahBarang
                    }, { transaction });

                    // 3. Update Stock if PERLENGKAPAN
                    if (detail.JenisBarang === 'PERLENGKAPAN') {
                        // Try to find perlengkapan by name within the same peternakan
                        let perlengkapan = await require('../models').Perlengkapan.findOne({
                            where: {
                                KodePeternakan: kodePeternakan,
                                [Sequelize.Op.and]: Sequelize.where(
                                    Sequelize.fn('LOWER', Sequelize.col('NamaPerlengkapan')),
                                    Sequelize.fn('LOWER', detail.NamaBarang)
                                )
                            },
                            transaction
                        });

                        // Auto-create perlengkapan if not found
                        if (!perlengkapan) {
                            const newKode = await generateKodePerlengkapan(sequelize, transaction);
                            // Detect category from name
                            const namaLower = detail.NamaBarang.toLowerCase();
                            let kategori = 'PERALATAN';
                            if (namaLower.includes('pakan') || namaLower.includes('feed') || namaLower.includes('starter') || namaLower.includes('finisher') || namaLower.includes('grower')) {
                                kategori = 'PAKAN';
                            } else if (namaLower.includes('obat') || namaLower.includes('vitamin') || namaLower.includes('vaksin')) {
                                kategori = 'OBAT';
                            }
                            perlengkapan = await require('../models').Perlengkapan.create({
                                KodePerlengkapan: newKode,
                                KodePeternakan: kodePeternakan,
                                NamaPerlengkapan: detail.NamaBarang,
                                KategoriPerlengkapan: kategori,
                                Satuan: kategori === 'PAKAN' ? 'kg' : 'unit'
                            }, { transaction });
                        }

                        const kodeItem = perlengkapan.KodePerlengkapan;

                        // Check if stock exists in warehouse
                        const existingStock = await require('../models').StokWarehouse.findOne({
                            where: {
                                KodeWarehouse: warehouse.KodeWarehouse,
                                KodePerlengkapan: kodeItem
                            },
                            transaction
                        });

                        if (existingStock) {
                            await existingStock.increment('Jumlah', { by: detail.JumlahBarang, transaction });
                        } else {
                            await require('../models').StokWarehouse.create({
                                KodeWarehouse: warehouse.KodeWarehouse,
                                KodePerlengkapan: kodeItem,
                                Jumlah: detail.JumlahBarang,
                                TanggalMasukPerlengkapan: new Date()
                            }, { transaction });
                        }

                        // 3b. If this PERLENGKAPAN is categorized as OBAT, create MasterObat record
                        if (perlengkapan.KategoriPerlengkapan === 'OBAT') {
                            const obatDetail = obatDetailsMap[detail.KodeDetailOrder] || {};

                            // Check if MasterObat record already exists for this perlengkapan
                            const existingObat = await MasterObat.findOne({
                                where: { KodePerlengkapan: kodeItem },
                                transaction
                            });

                            if (!existingObat) {
                                await MasterObat.create({
                                    KodePerlengkapan: kodeItem,
                                    KodePeternakan: kodePeternakan,
                                    JenisObat: obatDetail.jenisObat || 'Lainnya',
                                    Dosis: obatDetail.dosis || '-',
                                    TanggalKadaluarsa: obatDetail.tanggalKadaluarsa || new Date(),
                                    HargaObat: detail.HargaSatuan || 0
                                }, { transaction });
                            } else {
                                // Update existing record if obat details provided
                                if (obatDetail.jenisObat || obatDetail.dosis || obatDetail.tanggalKadaluarsa) {
                                    await existingObat.update({
                                        JenisObat: obatDetail.jenisObat || existingObat.JenisObat,
                                        Dosis: obatDetail.dosis || existingObat.Dosis,
                                        TanggalKadaluarsa: obatDetail.tanggalKadaluarsa || existingObat.TanggalKadaluarsa,
                                        HargaObat: detail.HargaSatuan || existingObat.HargaObat
                                    }, { transaction });
                                }
                            }
                        }
                    }

                    // 4. Create DOC record if DOC — with full reception details
                    if (detail.JenisBarang === 'DOC') {
                        const kodeDOC = await generateKodeDOC(sequelize, transaction);

                        // Get DOC reception details from the docDetails sent by frontend
                        const docDetail = docDetailsMap[detail.KodeDetailOrder] || {};

                        const jumlahDiterima = parseInt(docDetail.jumlahDiterima) || detail.JumlahBarang;
                        const jumlahMati = parseInt(docDetail.jumlahMatiPraKandang) || 0;

                        await require('../models').DOC.create({
                            KodeDOC: kodeDOC,
                            KodePenerimaan: kodePenerimaan,
                            BrandDOC: docDetail.brandDOC || detail.NamaBarang || null,
                            TipeAyam: docDetail.tipeAyam || null,
                            JumlahDipesan: detail.JumlahBarang,
                            JumlahDiterima: jumlahDiterima,
                            JumlahMatiPraKandang: jumlahMati,
                            KondisiAwal: docDetail.kondisiAwal || null
                        }, { transaction });
                    }
                }
            }
        }

        await transaction.commit();
        res.json(order);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Update order error:', error);
        res.status(500).json({ error: 'Failed to update order', details: error.message });
    }
});

// DELETE /api/orders/:id - Delete order
router.delete('/:id', async (req, res) => {
    try {
        const order = await Orders.findOne({
            where: {
                KodeOrder: req.params.id,
                KodePeternakan: req.user.kodePeternakan
            }
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Delete related detail orders first
        await DetailOrder.destroy({ where: { KodeOrder: order.KodeOrder } });
        await order.destroy();

        res.json({ message: 'Order deleted successfully' });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ error: 'Failed to delete order' });
    }
});

module.exports = router;
