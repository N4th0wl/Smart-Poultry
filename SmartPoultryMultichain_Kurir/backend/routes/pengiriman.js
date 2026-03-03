const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { Pengiriman, BuktiTandaTerima, NotaPengirimanKurir, Kurir, sequelize } = require('../models');
const { generateKodePengiriman, generateKodeBukti, generateKodeNota } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchainHelper');

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
        res.status(201).json(nota);
    } catch (error) {
        await transaction.rollback();
        console.error('Create nota error:', error);
        res.status(500).json({ error: 'Failed to create delivery note' });
    }
});

module.exports = router;
