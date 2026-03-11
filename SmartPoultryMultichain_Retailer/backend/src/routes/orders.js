const express = require('express');
const router = express.Router();
const { Order, NotaPenerimaan, Retailer, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeOrder, generateKodeIdentity, generateKodeBlock } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchain');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/orders — list all orders for user's retailer
router.get('/', authMiddleware, async (req, res) => {
    try {
        const where = req.user.idRetailer ? { IdRetailer: req.user.idRetailer } : {};
        const orders = await Order.findAll({
            where,
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: orders });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Gagal mengambil data order.' });
    }
});

// GET /api/orders/processor-info — get single processor info
router.get('/processor-info', authMiddleware, (req, res) => {
    res.json({
        data: {
            namaProcessor: process.env.PROCESSOR_NAME || 'PT Ayam Potong SmartPoultry',
            alamatProcessor: process.env.PROCESSOR_ADDRESS || 'Jl. Industri No. 1, Jakarta',
            kontakProcessor: process.env.PROCESSOR_CONTACT || '',
        }
    });
});

// POST /api/orders — create new order to the single processor
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            namaProduk, jenisProduk, jumlahPesanan, satuan,
            tanggalDibutuhkan, hargaSatuan, catatan
        } = req.body;

        if (!namaProduk || !jenisProduk || !jumlahPesanan || !tanggalDibutuhkan) {
            await t.rollback();
            return res.status(400).json({ message: 'Data order tidak lengkap.' });
        }

        // Use single processor from environment variables
        const namaProcessor = process.env.PROCESSOR_NAME || 'PT Ayam Potong SmartPoultry';
        const alamatProcessor = process.env.PROCESSOR_ADDRESS || 'Jl. Industri No. 1, Jakarta';
        const kontakProcessor = process.env.PROCESSOR_CONTACT || '';

        const kodeOrder = await generateKodeOrder(sequelize, t);
        const totalHarga = (jumlahPesanan || 0) * (hargaSatuan || 0);

        const order = await Order.create({
            KodeOrder: kodeOrder,
            IdRetailer: req.user.idRetailer,
            NamaProcessor: namaProcessor,
            AlamatProcessor: alamatProcessor,
            KontakProcessor: kontakProcessor,
            NamaProduk: namaProduk,
            JenisProduk: jenisProduk,
            JumlahPesanan: jumlahPesanan,
            Satuan: satuan || 'KG',
            TanggalOrder: new Date().toISOString().split('T')[0],
            TanggalDibutuhkan: tanggalDibutuhkan,
            HargaSatuan: hargaSatuan || 0,
            TotalHarga: totalHarga,
            StatusOrder: 'PENDING',
            Catatan: catatan || null,
            DibuatOleh: req.user.id,
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'Order berhasil dibuat.', data: order });
    } catch (error) {
        await t.rollback();
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Gagal membuat order.' });
    }
});

// PUT /api/orders/:id/terima — mark order as received, create blockchain
router.put('/:id/terima', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) {
            await t.rollback();
            return res.status(404).json({ message: 'Order tidak ditemukan.' });
        }

        const {
            penerimaOrder, jumlahDiterima, kondisiTerima,
            kodeOrderProcessor, processorLastBlockHash
        } = req.body;

        await order.update({
            StatusOrder: 'DITERIMA',
            PenerimaOrder: penerimaOrder || req.user.nama,
            TanggalDiterima: new Date().toISOString().split('T')[0],
            JumlahDiterima: jumlahDiterima || order.JumlahPesanan,
            KondisiTerima: kondisiTerima || 'Baik',
        }, { transaction: t });

        // Create blockchain identity
        const kodeIdentity = await generateKodeIdentity(sequelize, t);
        const genesisHash = blockchain.generateHash(0, blockchain.GENESIS_PREV_HASH, 'RECEIVE_FROM_PROCESSOR', {}, new Date().toISOString(), 0);

        const identity = await BlockchainIdentity.create({
            KodeIdentity: kodeIdentity,
            IdOrder: order.IdOrder,
            IdRetailer: req.user.idRetailer,
            KodeProcessor: null,
            KodeOrderProcessor: kodeOrderProcessor || null,
            ProcessorLastBlockHash: processorLastBlockHash || null,
            GenesisHash: genesisHash,
            LatestBlockHash: null,
            TotalBlocks: 0,
            StatusChain: 'ACTIVE',
        }, { transaction: t });

        // Create genesis block
        const kodeBlock = await generateKodeBlock(sequelize, t);
        await blockchain.createReceiveFromProcessorBlock(sequelize, {
            idIdentity: identity.IdIdentity,
            idOrder: order.IdOrder,
            kodeBlock,
            kodeOrder: order.KodeOrder,
            namaProcessor: order.NamaProcessor,
            namaProduk: order.NamaProduk,
            jumlahDiterima: jumlahDiterima || order.JumlahPesanan,
            penerimaOrder: penerimaOrder || req.user.nama,
            tanggalDiterima: new Date().toISOString().split('T')[0],
            kondisiTerima: kondisiTerima || 'Baik',
            kodeOrderProcessor: kodeOrderProcessor || null,
            processorLastBlockHash: processorLastBlockHash || null,
            transaction: t
        });

        await t.commit();
        res.json({ message: 'Order berhasil diterima dan blockchain dibuat.', data: order });
    } catch (error) {
        await t.rollback();
        console.error('Terima order error:', error);
        res.status(500).json({ message: 'Gagal menerima order.' });
    }
});

// PUT /api/orders/:id/status — update order status
router.put('/:id/status', authMiddleware, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order tidak ditemukan.' });

        const { status } = req.body;
        await order.update({ StatusOrder: status });
        res.json({ message: 'Status order diperbarui.', data: order });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Gagal memperbarui status.' });
    }
});

module.exports = router;
