const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { Pengiriman, BuktiTandaTerima, NotaPengirimanKurir, Kurir, sequelize } = require('../models');
const { generateKodePengiriman, generateKodeBukti, generateKodeNota } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchainHelper');
const { getPeternakanConnection } = require('../config/peternakanDatabase');
const { getProcessorConnection, getRetailerConnection } = require('../config/crossChainDatabase');
const { Sequelize } = require('sequelize');

// ============================================
// PENGIRIMAN (Shipment) ROUTES
// ============================================

// GET /api/pengiriman - Get all shipments
router.get('/', authMiddleware, async (req, res) => {
    try {
        const shipments = await Pengiriman.findAll({
            where: { KodePerusahaan: req.user.kodePerusahaan },
            include: [
                { model: Kurir },
                { model: BuktiTandaTerima },
                { model: NotaPengirimanKurir }
            ],
            order: [['TanggalPickup', 'DESC']]
        });
        res.json(shipments);
    } catch (error) {
        console.error('Get pengiriman error:', error);
        res.status(500).json({ error: 'Failed to get shipments' });
    }
});

// ============================================
// INCOMING SHIPMENTS (AUTO-IMPORT)
// ============================================

// GET /api/pengiriman/incoming - Get incoming shipments from Farm and Processor
router.get('/incoming', authMiddleware, async (req, res) => {
    try {
        const incoming = [];
        
        // Get existing downstream KodePengiriman/ReferensiEksternal to filter them out
        const existingPengiriman = await Pengiriman.findAll({
            attributes: ['ReferensiEksternal', 'KodePengiriman'],
            where: { KodePerusahaan: req.user.kodePerusahaan }
        });
        const existingRefs = existingPengiriman.map(p => p.ReferensiEksternal).filter(Boolean);
        const existingKodes = existingPengiriman.map(p => p.KodePengiriman).filter(Boolean);

        // 1. Get from Peternakan (FARM_TO_PROCESSOR)
        try {
            const farmConn = getPeternakanConnection();
            const farmShipments = await farmConn.query(
                `SELECT pg.KodePengiriman, pg.TanggalPengiriman, pg.NamaPerusahaanPengiriman, pg.AlamatTujuan, k.KodeCycle, p.NamaPeternakan
                 FROM Pengiriman pg
                 JOIN Kandang k ON pg.KodeKandang = k.KodeKandang
                 JOIN Peternakan p ON k.KodePeternakan = p.KodePeternakan
                 WHERE pg.StatusPengiriman = 'MENUNGGU_KURIR' COLLATE utf8mb4_unicode_ci`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            for (const ship of farmShipments) {
                if (!existingRefs.includes(ship.KodePengiriman) && !existingKodes.includes(ship.KodePengiriman)) {
                    incoming.push({
                        id: ship.KodePengiriman,
                        tipePengiriman: 'FARM_TO_PROCESSOR',
                        asalPengirim: ship.NamaPeternakan || 'Peternakan',
                        tujuanPenerima: ship.NamaPerusahaanPengiriman || 'Processor',
                        alamatTujuan: ship.AlamatTujuan || '',
                        tanggal: ship.TanggalPengiriman,
                        upstreamCycleId: ship.KodeCycle
                    });
                }
            }
        } catch(e) { console.warn('Farm DB cross connect failed for incoming', e.message); }

        // 2. Get from Processor (PROCESSOR_TO_RETAILER)
        try {
            const procConn = getProcessorConnection();
            const procShipments = await procConn.query(
                `SELECT pg.KodePengiriman, pg.TujuanPengiriman, pg.NamaPenerima, pg.TanggalKirim,
                        pg.JumlahKirim, pg.BeratKirim, pg.StatusPengiriman,
                        pr.IdOrder, pr.KodeProduksi, pr.JenisAyam,
                        o.KodeOrder, proc.NamaProcessor, o.NamaPeternakan,
                        bi.KodeCycleFarm, bi.LatestBlockHash AS ProcessorLastBlockHash
                 FROM pengiriman pg
                 LEFT JOIN produksi pr ON pg.IdProduksi = pr.IdProduksi
                 LEFT JOIN orders o ON pr.IdOrder = o.IdOrder
                 LEFT JOIN processor proc ON o.IdProcessor = proc.IdProcessor
                 LEFT JOIN blockchainidentity bi ON bi.IdOrder = o.IdOrder AND bi.StatusChain IN ('ACTIVE', 'COMPLETED')
                 WHERE pg.StatusPengiriman IN ('DISIAPKAN', 'DIKIRIM')`,
                { type: Sequelize.QueryTypes.SELECT }
            );

            for (const ship of procShipments) {
                if (!existingRefs.includes(ship.KodePengiriman) && !existingKodes.includes(ship.KodePengiriman)) {
                    incoming.push({
                        id: ship.KodePengiriman,
                        tipePengiriman: 'PROCESSOR_TO_RETAILER',
                        asalPengirim: ship.NamaProcessor || 'Processor',
                        tujuanPenerima: ship.NamaPenerima || 'Retailer',
                        alamatTujuan: ship.TujuanPengiriman || '',
                        tanggal: ship.TanggalKirim,
                        referensiEksternal: ship.KodePengiriman,
                        upstreamCycleId: ship.IdOrder,
                        // Additional details for proper blockchain linking
                        jumlahKirim: ship.JumlahKirim,
                        beratKirim: ship.BeratKirim,
                        jenisAyam: ship.JenisAyam,
                        kodeOrder: ship.KodeOrder,
                        kodeCycleFarm: ship.KodeCycleFarm,
                        processorLastBlockHash: ship.ProcessorLastBlockHash,
                        keterangan: `Pengiriman ${ship.JumlahKirim || '?'} ekor ${ship.JenisAyam || 'ayam'} ke ${ship.NamaPenerima || 'Retailer'}`
                    });
                }
            }
        } catch(e) { console.warn('Processor DB cross connect failed for incoming', e.message); }

        res.json(incoming);
    } catch (error) {
        console.error('Get incoming pengiriman error:', error);
        res.status(500).json({ error: 'Failed to get incoming shipments' });
    }
});

// POST /api/pengiriman/import - Import shipment from upstream
router.post('/import', authMiddleware, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { id, tipePengiriman, asalPengirim, tujuanPenerima, alamatTujuan, tanggal, kodeKurir, upstreamCycleId, processorLastBlockHash, kodeCycleFarm, keterangan } = req.body;

        if (!id || !kodeKurir || !tipePengiriman) {
            return res.status(400).json({ error: 'Required fields missing: id, kodeKurir, tipePengiriman' });
        }

        const kurir = await Kurir.findOne({
            where: { KodeKurir: kodeKurir, KodePerusahaan: req.user.kodePerusahaan, StatusKurir: 'AKTIF' }
        });
        if (!kurir) return res.status(400).json({ error: 'Invalid or inactive courier' });

        const newKodePengiriman = await generateKodePengiriman(sequelize, transaction);

        const shipment = await Pengiriman.create({
            KodePengiriman: newKodePengiriman,
            KodePerusahaan: req.user.kodePerusahaan,
            KodeKurir: kodeKurir,
            TipePengiriman: tipePengiriman,
            AsalPengirim: asalPengirim || (tipePengiriman === 'FARM_TO_PROCESSOR' ? 'Peternakan' : 'Processor'),
            TujuanPenerima: tujuanPenerima,
            AlamatAsal: null,
            AlamatTujuan: alamatTujuan,
            TanggalPickup: tanggal || new Date().toISOString().split('T')[0],
            StatusPengiriman: 'PICKUP',
            ReferensiEksternal: id,
            UpstreamCycleId: upstreamCycleId || null,
            KeteranganPengiriman: keterangan || null
        }, { transaction });

        // Create genesis block for this shipment
        // For PROCESSOR_TO_RETAILER, pass processorLastBlockHash for cross-chain hash continuity
        await blockchain.createGenesisBlock(sequelize, {
            kodePerusahaan: req.user.kodePerusahaan,
            kodePengiriman: newKodePengiriman,
            tipePengiriman,
            asalPengirim: shipment.AsalPengirim,
            tujuanPenerima,
            tanggalPickup: shipment.TanggalPickup,
            kodeKurir,
            upstreamCycleId: upstreamCycleId || null,
            processorLastBlockHash: processorLastBlockHash || null,
            kodeCycleFarm: kodeCycleFarm || null,
            transaction
        });

        await transaction.commit();

        // After successful import, cross-DB status updates (best-effort, non-blocking)
        if (tipePengiriman === 'FARM_TO_PROCESSOR' && id) {
            // Update Farm pengiriman status to PICKUP
            try {
                const farmConn = getPeternakanConnection();
                await farmConn.query(
                    `UPDATE Pengiriman SET StatusPengiriman = 'PICKUP' WHERE KodePengiriman = :kodePengiriman`,
                    { type: Sequelize.QueryTypes.UPDATE, replacements: { kodePengiriman: id } }
                );
                console.log(`[Leg1 Import] Updated Farm pengiriman ${id} to PICKUP`);
            } catch (e) {
                console.warn('[Leg1 Import] Failed to update Farm pengiriman status (non-blocking):', e.message);
            }

            // Update Processor order status to DIKIRIM so they know goods are in transit
            try {
                const procConn = getProcessorConnection();
                await procConn.query(
                    `UPDATE orders SET StatusOrder = 'DIKIRIM', UpdatedAt = NOW()
                     WHERE StatusOrder IN ('PENDING', 'CONFIRMED')
                     AND IdOrder IN (
                         SELECT bi.IdOrder FROM blockchainidentity bi
                         WHERE bi.KodeCycleFarm = :cycleFarm
                     )`,
                    { type: Sequelize.QueryTypes.UPDATE, replacements: { cycleFarm: upstreamCycleId || '' } }
                );
                console.log(`[Leg1 Import] Updated Processor order for cycle ${upstreamCycleId} to DIKIRIM`);
            } catch (e) {
                console.warn('[Leg1 Import] Failed to update Processor order (non-blocking):', e.message);
            }
        }

        if (tipePengiriman === 'PROCESSOR_TO_RETAILER' && id) {
            // Update Processor's pengiriman status to DIKIRIM_KURIR
            try {
                const procConn = getProcessorConnection();
                await procConn.query(
                    `UPDATE pengiriman SET StatusPengiriman = 'DIKIRIM_KURIR' WHERE KodePengiriman = :kodePengiriman AND StatusPengiriman IN ('DISIAPKAN', 'DIKIRIM')`,
                    { type: Sequelize.QueryTypes.UPDATE, replacements: { kodePengiriman: id } }
                );
                console.log(`[Leg2 Import] Updated Processor pengiriman ${id} to DIKIRIM_KURIR`);
            } catch (e) {
                console.warn('[Leg2 Import] Failed to update Processor pengiriman status (non-blocking):', e.message);
            }

            // Also update Retailer's order status to DIKIRIM so they know it is in transit
            try {
                const retConn = getRetailerConnection();
                const [retOrder] = await retConn.query(
                    `SELECT o.IdOrder, o.KodeOrder FROM orders o
                     LEFT JOIN retailer r ON o.IdRetailer = r.IdRetailer
                     WHERE r.NamaRetailer = :namaRetailer AND o.StatusOrder IN ('PENDING', 'DIPROSES')
                     ORDER BY o.CreatedAt ASC LIMIT 1`,
                    { type: Sequelize.QueryTypes.SELECT, replacements: { namaRetailer: tujuanPenerima } }
                );

                if (retOrder) {
                    await retConn.query(
                        `UPDATE orders SET StatusOrder = 'DIKIRIM', UpdatedAt = NOW() WHERE IdOrder = :idOrder`,
                        { type: Sequelize.QueryTypes.UPDATE, replacements: { idOrder: retOrder.IdOrder } }
                    );
                    console.log(`[Leg2 Import] Updated Retailer order ${retOrder.KodeOrder} to DIKIRIM`);
                }
            } catch (e) {
                console.warn('[Leg2 Import] Failed to update Retailer order status (non-blocking):', e.message);
            }
        }

        res.status(201).json(shipment);
    } catch (error) {
        await transaction.rollback();
        console.error('Import pengiriman error:', error);
        res.status(500).json({ error: 'Failed to import shipment' });
    }
});

// GET /api/pengiriman/:id - Get single shipment
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const shipment = await Pengiriman.findOne({
            where: { KodePengiriman: req.params.id, KodePerusahaan: req.user.kodePerusahaan },
            include: [
                { model: Kurir },
                { model: BuktiTandaTerima },
                { model: NotaPengirimanKurir }
            ]
        });

        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        res.json(shipment);
    } catch (error) {
        console.error('Get single pengiriman error:', error);
        res.status(500).json({ error: 'Failed to get shipment' });
    }
});

// POST /api/pengiriman - Create new shipment + genesis block
router.post('/', authMiddleware, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { kodeKurir, tipePengiriman, asalPengirim, tujuanPenerima, alamatAsal, alamatTujuan, tanggalPickup, tanggalEstimasiTiba, keterangan, referensiEksternal, upstreamCycleId } = req.body;

        if (!kodeKurir || !tipePengiriman || !asalPengirim || !tujuanPenerima || !tanggalPickup) {
            return res.status(400).json({ error: 'Required fields: kodeKurir, tipePengiriman, asalPengirim, tujuanPenerima, tanggalPickup' });
        }

        // Validate kurir belongs to company
        const kurir = await Kurir.findOne({
            where: { KodeKurir: kodeKurir, KodePerusahaan: req.user.kodePerusahaan, StatusKurir: 'AKTIF' }
        });
        if (!kurir) {
            return res.status(400).json({ error: 'Invalid or inactive courier' });
        }

        const kodePengiriman = await generateKodePengiriman(sequelize, transaction);

        const shipment = await Pengiriman.create({
            KodePengiriman: kodePengiriman,
            KodePerusahaan: req.user.kodePerusahaan,
            KodeKurir: kodeKurir,
            TipePengiriman: tipePengiriman,
            AsalPengirim: asalPengirim,
            TujuanPenerima: tujuanPenerima,
            AlamatAsal: alamatAsal || null,
            AlamatTujuan: alamatTujuan || null,
            TanggalPickup: tanggalPickup,
            TanggalEstimasiTiba: tanggalEstimasiTiba || null,
            StatusPengiriman: 'PICKUP',
            KeteranganPengiriman: keterangan || null,
            ReferensiEksternal: referensiEksternal || null,
            UpstreamCycleId: upstreamCycleId || null
        }, { transaction });

        // Create genesis block for this shipment (with upstream chain link if provided)
        await blockchain.createGenesisBlock(sequelize, {
            kodePerusahaan: req.user.kodePerusahaan,
            kodePengiriman,
            tipePengiriman,
            asalPengirim,
            tujuanPenerima,
            tanggalPickup,
            kodeKurir,
            upstreamCycleId: upstreamCycleId || null,
            transaction
        });

        await transaction.commit();

        // Refetch with associations
        const result = await Pengiriman.findByPk(kodePengiriman, {
            include: [{ model: Kurir }]
        });
        res.status(201).json(result);
    } catch (error) {
        await transaction.rollback();
        console.error('Create pengiriman error:', error);
        res.status(500).json({ error: 'Failed to create shipment' });
    }
});

// ============================================
// BUKTI TANDA TERIMA (Proof of Receipt) ROUTES
// ============================================

// POST /api/pengiriman/:id/bukti - Create proof of receipt
router.post('/:id/bukti', authMiddleware, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const kodePengiriman = req.params.id;
        const { tanggalTerima, namaPengirim, namaPenerima, jumlahBarang, beratTotal, keterangan } = req.body;

        if (!tanggalTerima || !namaPengirim || !namaPenerima) {
            return res.status(400).json({ error: 'Required fields: tanggalTerima, namaPengirim, namaPenerima' });
        }

        // Validate shipment exists and belongs to company
        const shipment = await Pengiriman.findOne({
            where: { KodePengiriman: kodePengiriman, KodePerusahaan: req.user.kodePerusahaan }
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        // Check if bukti already exists
        const existingBukti = await BuktiTandaTerima.findOne({ where: { KodePengiriman: kodePengiriman } });
        if (existingBukti) {
            return res.status(400).json({ error: 'Bukti tanda terima sudah ada untuk pengiriman ini' });
        }

        const kodeBukti = await generateKodeBukti(sequelize, transaction);

        const bukti = await BuktiTandaTerima.create({
            KodeBukti: kodeBukti,
            KodePengiriman: kodePengiriman,
            TanggalTerima: tanggalTerima,
            NamaPengirim: namaPengirim,
            NamaPenerima: namaPenerima,
            JumlahBarang: jumlahBarang || null,
            BeratTotal: beratTotal || null,
            Keterangan: keterangan || null
        }, { transaction });

        // Update shipment status
        shipment.StatusPengiriman = 'DALAM_PERJALANAN';
        await shipment.save({ transaction });

        // Create blockchain event
        const blockEventType = shipment.TipePengiriman === 'FARM_TO_PROCESSOR' ? 'createPickupFarmBlock' : 'createPickupProcessorBlock';

        await blockchain[blockEventType](sequelize, {
            kodePerusahaan: req.user.kodePerusahaan,
            kodePengiriman,
            kodeBukti,
            namaPengirim,
            namaPenerima,
            jumlahBarang: jumlahBarang || 0,
            beratTotal: beratTotal || 0,
            tanggalTerima,
            keterangan: keterangan || '',
            transaction
        });

        await transaction.commit();

        // Update Farm DB if Farm-to-Processor
        if (shipment.TipePengiriman === 'FARM_TO_PROCESSOR' && shipment.ReferensiEksternal) {
            try {
                const farmConn = getPeternakanConnection();
                await farmConn.query(
                    `UPDATE Pengiriman SET StatusPengiriman = 'DALAM_PERJALANAN' WHERE KodePengiriman = :kodePengiriman`,
                    { type: Sequelize.QueryTypes.UPDATE, replacements: { kodePengiriman: shipment.ReferensiEksternal } }
                );
                console.log(`[Leg1 Bukti] Updated Farm pengiriman ${shipment.ReferensiEksternal} to DALAM_PERJALANAN`);
            } catch (e) {
                console.warn('[Leg1 Bukti] Failed to update Farm pengiriman status:', e.message);
            }
        }

        // Update Processor DB if Processor-to-Retailer
        if (shipment.TipePengiriman === 'PROCESSOR_TO_RETAILER' && shipment.ReferensiEksternal) {
            try {
                const procConn = getProcessorConnection();
                await procConn.query(
                    `UPDATE pengiriman SET StatusPengiriman = 'DALAM_PERJALANAN' WHERE KodePengiriman = :kodePengiriman`,
                    { type: Sequelize.QueryTypes.UPDATE, replacements: { kodePengiriman: shipment.ReferensiEksternal } }
                );
                console.log(`[Leg2 Bukti] Updated Processor pengiriman ${shipment.ReferensiEksternal} to DALAM_PERJALANAN`);
            } catch (e) {
                console.warn('[Leg2 Bukti] Failed to update Processor pengiriman status:', e.message);
            }
        }

        res.status(201).json(bukti);
    } catch (error) {
        await transaction.rollback();
        console.error('Create bukti error:', error);
        res.status(500).json({ error: 'Failed to create proof of receipt' });
    }
});

// ============================================
// NOTA PENGIRIMAN (Delivery Note) ROUTES
// ============================================

// POST /api/pengiriman/:id/nota - Create delivery note (completes the shipment)
router.post('/:id/nota', authMiddleware, async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const kodePengiriman = req.params.id;
        const { tanggalSampai, namaPenerima, kondisiBarang, keterangan } = req.body;

        if (!tanggalSampai || !namaPenerima) {
            return res.status(400).json({ error: 'Required fields: tanggalSampai, namaPenerima' });
        }

        // Validate shipment
        const shipment = await Pengiriman.findOne({
            where: { KodePengiriman: kodePengiriman, KodePerusahaan: req.user.kodePerusahaan }
        });
        if (!shipment) {
            return res.status(404).json({ error: 'Shipment not found' });
        }

        // Check bukti exists first
        const bukti = await BuktiTandaTerima.findOne({ where: { KodePengiriman: kodePengiriman } });
        if (!bukti) {
            return res.status(400).json({ error: 'Bukti tanda terima belum dibuat' });
        }

        // Check if nota already exists
        const existingNota = await NotaPengirimanKurir.findOne({ where: { KodePengiriman: kodePengiriman } });
        if (existingNota) {
            return res.status(400).json({ error: 'Nota pengiriman sudah ada untuk pengiriman ini' });
        }

        const kodeNota = await generateKodeNota(sequelize, transaction);

        const nota = await NotaPengirimanKurir.create({
            KodeNota: kodeNota,
            KodePengiriman: kodePengiriman,
            TanggalSampai: tanggalSampai,
            NamaPenerima: namaPenerima,
            KondisiBarang: kondisiBarang || 'BAIK',
            Keterangan: keterangan || null
        }, { transaction });

        // Update shipment status
        const finalKondisi = kondisiBarang || 'BAIK';
        shipment.StatusPengiriman = finalKondisi === 'RUSAK_TOTAL' ? 'GAGAL' : 'TERKIRIM';
        await shipment.save({ transaction });

        // Create blockchain event
        const blockEventType = shipment.TipePengiriman === 'FARM_TO_PROCESSOR' ? 'createDeliveryProcessorBlock' : 'createDeliveryRetailerBlock';

        await blockchain[blockEventType](sequelize, {
            kodePerusahaan: req.user.kodePerusahaan,
            kodePengiriman,
            kodeNota,
            namaPenerima,
            kondisiBarang: finalKondisi,
            tanggalSampai,
            keterangan: keterangan || '',
            transaction
        });

        await transaction.commit();

        // ====================================================================
        // CROSS-DB STATUS SYNC: Automatically update all upstream/downstream
        // systems when a delivery is completed by the courier.
        // These are best-effort, non-blocking updates.
        // ====================================================================

        if (shipment.TipePengiriman === 'FARM_TO_PROCESSOR') {
            // --- LEG 1 COMPLETED: Farm → Processor ---
            // 1. Update Farm's Pengiriman status so Farm sees delivery is complete
            if (shipment.ReferensiEksternal) {
                try {
                    const farmConn = getPeternakanConnection();
                    // NotaPengiriman in Farm stores TanggalPenerimaan. Update it.
                    await farmConn.query(
                        `UPDATE NotaPengiriman np
                         JOIN Pengiriman pg ON np.KodePengiriman = pg.KodePengiriman
                         SET np.TanggalPenerimaan = :tanggalSampai
                         WHERE pg.KodePengiriman = :kodePengiriman`,
                        {
                            type: Sequelize.QueryTypes.UPDATE,
                            replacements: { tanggalSampai, kodePengiriman: shipment.ReferensiEksternal }
                        }
                    );
                    
                    // Update StatusPengiriman in Farm
                    await farmConn.query(
                        `UPDATE Pengiriman SET StatusPengiriman = :statusPengiriman WHERE KodePengiriman = :kodePengiriman`,
                        {
                            type: Sequelize.QueryTypes.UPDATE,
                            replacements: { statusPengiriman: finalKondisi === 'RUSAK_TOTAL' ? 'GAGAL' : 'TERKIRIM', kodePengiriman: shipment.ReferensiEksternal }
                        }
                    );
                    console.log(`[Leg1 Complete] Updated Farm tracking status and NotaPengiriman for ${shipment.ReferensiEksternal}`);
                } catch (e) {
                    console.warn('[Leg1] Failed to update Farm pengiriman status (non-blocking):', e.message);
                }

                // 1b. Also update the Farm's processor-order status in Processor DB to DITERIMA
                // so Farm's "Pesanan Processor" page shows the order is completed
                try {
                    const procConn = getProcessorConnection();
                    // Find processor order that was DIKIRIM and update to DITERIMA
                    if (shipment.UpstreamCycleId) {
                        await procConn.query(
                            `UPDATE orders o
                             LEFT JOIN blockchainidentity bi ON o.IdOrder = bi.IdOrder
                             SET o.StatusOrder = 'DITERIMA', o.TanggalDiterima = :tanggalSampai, o.UpdatedAt = NOW()
                             WHERE (bi.KodeCycleFarm = :kodeCycleFarm OR o.StatusOrder = 'DIKIRIM')
                               AND o.StatusOrder IN ('PENDING', 'CONFIRMED', 'DIKIRIM')
                             ORDER BY o.CreatedAt ASC LIMIT 1`,
                            {
                                type: Sequelize.QueryTypes.UPDATE,
                                replacements: { tanggalSampai, kodeCycleFarm: shipment.UpstreamCycleId }
                            }
                        );
                        console.log(`[Leg1 Complete] Updated Processor order for cycle ${shipment.UpstreamCycleId} to DITERIMA`);
                    } else {
                        // Fallback: just update the first DIKIRIM order
                        await procConn.query(
                            `UPDATE orders SET StatusOrder = 'DITERIMA', TanggalDiterima = :tanggalSampai, UpdatedAt = NOW()
                             WHERE StatusOrder = 'DIKIRIM'
                             ORDER BY CreatedAt ASC LIMIT 1`,
                            {
                                type: Sequelize.QueryTypes.UPDATE,
                                replacements: { tanggalSampai }
                            }
                        );
                        console.log(`[Leg1 Complete] Updated first DIKIRIM Processor order to DITERIMA (fallback)`);
                    }
                } catch (e) {
                    console.warn('[Leg1] Failed to update Processor order status (non-blocking):', e.message);
                }
            }
        }

        if (shipment.TipePengiriman === 'PROCESSOR_TO_RETAILER') {
            // --- LEG 2 COMPLETED: Processor → Retailer ---
            // 1. Update Processor's pengiriman status
            if (shipment.ReferensiEksternal) {
                try {
                    const procConn = getProcessorConnection();
                    const newStatus = shipment.StatusPengiriman === 'GAGAL' ? 'GAGAL' : 'TERKIRIM';
                    await procConn.query(
                        `UPDATE pengiriman SET StatusPengiriman = :newStatus, TanggalSampai = :tanggalSampai WHERE KodePengiriman = :kodePengiriman`,
                        {
                            type: Sequelize.QueryTypes.UPDATE,
                            replacements: { newStatus, tanggalSampai, kodePengiriman: shipment.ReferensiEksternal }
                        }
                    );
                    console.log(`[Leg2 Complete] Updated Processor pengiriman ${shipment.ReferensiEksternal} to ${newStatus}`);

                    // 1b. Also update the Processor's internal order to SELESAI
                    // so the Processor panel shows the order is fully completed.
                    try {
                        const [procPeng] = await procConn.query(
                            `SELECT pg.IdProduksi, pr.IdOrder
                             FROM pengiriman pg
                             LEFT JOIN produksi pr ON pg.IdProduksi = pr.IdProduksi
                             WHERE pg.KodePengiriman = :kodePengiriman`,
                            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman: shipment.ReferensiEksternal } }
                        );
                        if (procPeng && procPeng.IdOrder) {
                            await procConn.query(
                                `UPDATE orders SET StatusOrder = 'SELESAI', UpdatedAt = NOW() WHERE IdOrder = :idOrder AND StatusOrder NOT IN ('SELESAI')`,
                                { type: Sequelize.QueryTypes.UPDATE, replacements: { idOrder: procPeng.IdOrder } }
                            );
                            console.log(`[Leg2 Complete] Updated Processor order ${procPeng.IdOrder} to SELESAI`);
                        }
                    } catch (innerErr) {
                        console.warn('[Leg2] Failed to update Processor internal order status:', innerErr.message);
                    }
                } catch (e) {
                    console.warn('[Leg2] Failed to update Processor pengiriman status (non-blocking):', e.message);
                }
            }

            // 2. Auto-update Retailer's order status to DITERIMA (fully completed)
            //    so Retailer can immediately manage the received goods.
            if (shipment.ReferensiEksternal) {
                try {
                    const retConn = getRetailerConnection();
                    // Find the Retailer's order linked to this delivery
                    const [retOrder] = await retConn.query(
                        `SELECT o.IdOrder, o.KodeOrder, o.StatusOrder
                         FROM orders o
                         LEFT JOIN retailer r ON o.IdRetailer = r.IdRetailer
                         WHERE r.NamaRetailer = :namaRetailer
                           AND o.StatusOrder IN ('PENDING', 'DIPROSES', 'DIKIRIM')
                         ORDER BY o.CreatedAt ASC LIMIT 1`,
                        { type: Sequelize.QueryTypes.SELECT, replacements: { namaRetailer: shipment.TujuanPenerima } }
                    );

                    if (retOrder) {
                        const retStatus = shipment.StatusPengiriman === 'GAGAL' ? 'GAGAL' : 'DITERIMA';
                        await retConn.query(
                            `UPDATE orders SET StatusOrder = :retStatus, TanggalDiterima = :tanggalSampai, UpdatedAt = NOW()
                             WHERE IdOrder = :idOrder`,
                            { type: Sequelize.QueryTypes.UPDATE, replacements: { retStatus, tanggalSampai, idOrder: retOrder.IdOrder } }
                        );
                        console.log(`[Leg2 Complete] Updated Retailer order ${retOrder.KodeOrder} to ${retStatus}`);
                    }
                } catch (e) {
                    console.warn('[Leg2] Failed to update Retailer order status (non-blocking):', e.message);
                }
            }
        }

        res.status(201).json(nota);
    } catch (error) {
        await transaction.rollback();
        console.error('Create nota error:', error);
        res.status(500).json({ error: 'Failed to create delivery note' });
    }
});

module.exports = router;
