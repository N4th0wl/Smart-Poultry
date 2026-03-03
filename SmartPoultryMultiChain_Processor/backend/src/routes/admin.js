const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { authMiddleware, adminOnly } = require('../middlewares/auth');
const {
    sequelize, Processor, User, Karyawan, Order,
    BlockchainIdentity, LedgerProcessor, Produksi, Pengiriman
} = require('../models');
const { generateKodeProcessor, generateKodeUser, generateKodeKaryawan } = require('../utils/codeGenerator');

// All admin routes require auth + admin role
router.use(authMiddleware);
router.use(adminOnly);

// ============================================
// PROCESSOR MANAGEMENT (CRUD)
// ============================================

// GET /api/admin/processors - List all processors
router.get('/processors', async (req, res) => {
    try {
        const { search } = req.query;

        const processors = await Processor.findAll({
            order: [['IdProcessor', 'DESC']],
        });

        let result = processors;
        if (search) {
            const s = search.toLowerCase();
            result = processors.filter(p =>
                (p.KodeProcessor || '').toLowerCase().includes(s) ||
                (p.NamaProcessor || '').toLowerCase().includes(s) ||
                (p.AlamatProcessor || '').toLowerCase().includes(s)
            );
        }

        // Enrich with counts
        const enriched = await Promise.all(result.map(async (p) => {
            const userCount = await User.count({ where: { IdProcessor: p.IdProcessor, Role: 'KARYAWAN' } });
            const orderCount = await Order.count({ where: { IdProcessor: p.IdProcessor } });
            const chainCount = await BlockchainIdentity.count({ where: { IdProcessor: p.IdProcessor } });

            return {
                idProcessor: p.IdProcessor,
                kodeProcessor: p.KodeProcessor,
                namaProcessor: p.NamaProcessor,
                alamatProcessor: p.AlamatProcessor || '-',
                kontakProcessor: p.KontakProcessor || '-',
                totalUsers: userCount,
                totalOrders: orderCount,
                totalChains: chainCount,
                createdAt: p.CreatedAt,
            };
        }));

        res.json(enriched);
    } catch (error) {
        console.error('Get processors error:', error);
        res.status(500).json({ message: 'Gagal memuat data processor' });
    }
});

// GET /api/admin/processors/:id - Get single processor detail
router.get('/processors/:id', async (req, res) => {
    try {
        const processor = await Processor.findByPk(req.params.id);
        if (!processor) {
            return res.status(404).json({ message: 'Processor tidak ditemukan' });
        }

        const users = await User.findAll({
            where: { IdProcessor: processor.IdProcessor, Role: 'KARYAWAN' },
            attributes: { exclude: ['Password'] },
            include: [{ model: Karyawan, as: 'karyawan' }],
        });

        const orderCount = await Order.count({ where: { IdProcessor: processor.IdProcessor } });
        const chainCount = await BlockchainIdentity.count({ where: { IdProcessor: processor.IdProcessor } });
        const blockCount = await LedgerProcessor.count({ where: { IdProcessor: processor.IdProcessor } });

        res.json({
            processor: {
                idProcessor: processor.IdProcessor,
                kodeProcessor: processor.KodeProcessor,
                namaProcessor: processor.NamaProcessor,
                alamatProcessor: processor.AlamatProcessor,
                kontakProcessor: processor.KontakProcessor,
                createdAt: processor.CreatedAt,
            },
            users: users.map(u => ({
                idUser: u.IdUser,
                kodeUser: u.KodeUser,
                email: u.Email,
                role: u.Role,
                statusAkun: u.StatusAkun,
                namaKaryawan: u.karyawan?.NamaLengkap || '-',
                jabatan: u.karyawan?.Jabatan || '-',
            })),
            stats: { orderCount, chainCount, blockCount },
        });
    } catch (error) {
        console.error('Get processor detail error:', error);
        res.status(500).json({ message: 'Gagal memuat detail processor' });
    }
});

// POST /api/admin/processors - Create new processor with initial admin user
router.post('/processors', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { namaProcessor, alamatProcessor, kontakProcessor, email, password } = req.body;

        if (!namaProcessor || !email || !password) {
            await t.rollback();
            return res.status(400).json({ message: 'Nama processor, email, dan password wajib diisi' });
        }

        // Check duplicate email
        const existingUser = await User.findOne({ where: { Email: email } });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ message: 'Email sudah terdaftar' });
        }

        // Create processor
        const kodeProcessor = await generateKodeProcessor(sequelize, t);
        const processor = await Processor.create({
            KodeProcessor: kodeProcessor,
            NamaProcessor: namaProcessor,
            AlamatProcessor: alamatProcessor || null,
            KontakProcessor: kontakProcessor || null,
        }, { transaction: t });

        // Create KARYAWAN user for this processor
        const kodeUser = await generateKodeUser(sequelize, t);
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            KodeUser: kodeUser,
            IdProcessor: processor.IdProcessor,
            Email: email,
            Password: hashedPassword,
            Role: 'KARYAWAN',
        }, { transaction: t });

        // Create karyawan profile
        const kodeKaryawan = await generateKodeKaryawan(sequelize, t);
        await Karyawan.create({
            KodeKaryawan: kodeKaryawan,
            IdUser: user.IdUser,
            IdProcessor: processor.IdProcessor,
            NamaLengkap: namaProcessor,
            Jabatan: 'Manager',
        }, { transaction: t });

        await t.commit();

        res.status(201).json({
            message: 'Processor berhasil dibuat',
            processor: {
                idProcessor: processor.IdProcessor,
                kodeProcessor: processor.KodeProcessor,
                namaProcessor: processor.NamaProcessor,
            },
        });
    } catch (error) {
        await t.rollback();
        console.error('Create processor error:', error);
        res.status(500).json({ message: 'Gagal membuat processor' });
    }
});

// PUT /api/admin/processors/:id - Update processor info
router.put('/processors/:id', async (req, res) => {
    try {
        const { namaProcessor, alamatProcessor, kontakProcessor } = req.body;

        const processor = await Processor.findByPk(req.params.id);
        if (!processor) {
            return res.status(404).json({ message: 'Processor tidak ditemukan' });
        }

        if (namaProcessor) processor.NamaProcessor = namaProcessor;
        if (alamatProcessor !== undefined) processor.AlamatProcessor = alamatProcessor;
        if (kontakProcessor !== undefined) processor.KontakProcessor = kontakProcessor;
        await processor.save();

        res.json({
            message: 'Processor berhasil diperbarui',
            processor: {
                idProcessor: processor.IdProcessor,
                kodeProcessor: processor.KodeProcessor,
                namaProcessor: processor.NamaProcessor,
                alamatProcessor: processor.AlamatProcessor,
                kontakProcessor: processor.KontakProcessor,
            },
        });
    } catch (error) {
        console.error('Update processor error:', error);
        res.status(500).json({ message: 'Gagal memperbarui processor' });
    }
});

// DELETE /api/admin/processors/:id - Delete processor (cascade)
router.delete('/processors/:id', async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const processor = await Processor.findByPk(req.params.id);
        if (!processor) {
            await t.rollback();
            return res.status(404).json({ message: 'Processor tidak ditemukan' });
        }

        // Check if there's any data — warn if so
        const orderCount = await Order.count({ where: { IdProcessor: processor.IdProcessor } });
        if (orderCount > 0) {
            await t.rollback();
            return res.status(400).json({
                message: `Tidak dapat menghapus processor yang memiliki ${orderCount} order. Hapus data terkait terlebih dahulu.`
            });
        }

        // Delete associated karyawan and users
        await Karyawan.destroy({ where: { IdProcessor: processor.IdProcessor }, transaction: t });
        await User.destroy({ where: { IdProcessor: processor.IdProcessor }, transaction: t });
        await processor.destroy({ transaction: t });

        await t.commit();
        res.json({ message: 'Processor berhasil dihapus' });
    } catch (error) {
        await t.rollback();
        console.error('Delete processor error:', error);
        res.status(500).json({ message: 'Gagal menghapus processor' });
    }
});

// ============================================
// BLOCKCHAIN MONITORING (All processors)
// ============================================

// GET /api/admin/blockchain/overview
router.get('/blockchain/overview', async (req, res) => {
    try {
        const { search } = req.query;

        const allChains = await BlockchainIdentity.findAll({
            include: [
                { model: Processor, as: 'processor' },
                { model: Order, as: 'order' },
            ],
            order: [['CreatedAt', 'DESC']],
        });

        let filteredChains = allChains;
        if (search) {
            const s = search.toLowerCase();
            filteredChains = allChains.filter(c =>
                (c.KodeIdentity || '').toLowerCase().includes(s) ||
                (c.processor?.NamaProcessor || '').toLowerCase().includes(s) ||
                (c.StatusChain || '').toLowerCase().includes(s) ||
                (c.order?.KodeOrder || '').toLowerCase().includes(s)
            );
        }

        const totalBlocks = await LedgerProcessor.count();
        const totalChains = allChains.length;
        const activeChains = allChains.filter(c => c.StatusChain === 'ACTIVE').length;
        const completedChains = allChains.filter(c => c.StatusChain === 'COMPLETED').length;
        const transferredChains = allChains.filter(c => c.StatusChain === 'TRANSFERRED').length;

        const chainsData = await Promise.all(filteredChains.map(async (chain) => {
            const actualBlockCount = await LedgerProcessor.count({
                where: { IdIdentity: chain.IdIdentity }
            });

            return {
                IdIdentity: chain.IdIdentity,
                KodeIdentity: chain.KodeIdentity,
                IdProcessor: chain.IdProcessor,
                NamaProcessor: chain.processor?.NamaProcessor || '-',
                KodeOrder: chain.order?.KodeOrder || '-',
                NamaPeternakan: chain.order?.NamaPeternakan || '-',
                GenesisHash: chain.GenesisHash,
                LatestBlockHash: chain.LatestBlockHash,
                TotalBlocks: chain.TotalBlocks,
                ActualBlockCount: actualBlockCount,
                StatusChain: chain.StatusChain,
                CreatedAt: chain.CreatedAt,
                CompletedAt: chain.CompletedAt,
            };
        }));

        res.json({
            totalChains,
            activeChains,
            completedChains,
            transferredChains,
            totalBlocks,
            chains: chainsData,
        });
    } catch (error) {
        console.error('Admin blockchain overview error:', error);
        res.status(500).json({ message: 'Gagal memuat blockchain overview' });
    }
});

// GET /api/admin/blockchain/blocks/:identityId
router.get('/blockchain/blocks/:identityId', async (req, res) => {
    try {
        const blocks = await LedgerProcessor.findAll({
            where: { IdIdentity: req.params.identityId },
            order: [['BlockIndex', 'ASC']],
        });

        res.json(blocks);
    } catch (error) {
        console.error('Admin get blocks error:', error);
        res.status(500).json({ message: 'Gagal memuat blocks' });
    }
});

// GET /api/admin/blockchain/validate/:identityId
router.get('/blockchain/validate/:identityId', async (req, res) => {
    try {
        const blocks = await LedgerProcessor.findAll({
            where: { IdIdentity: req.params.identityId },
            order: [['BlockIndex', 'ASC']],
        });

        if (blocks.length === 0) {
            return res.json({ valid: false, message: 'Tidak ada blocks ditemukan', totalBlocks: 0 });
        }

        for (let i = 1; i < blocks.length; i++) {
            if (blocks[i].PreviousHash !== blocks[i - 1].CurrentHash) {
                return res.json({
                    valid: false,
                    message: `Hash mismatch pada block #${blocks[i].BlockIndex}`,
                    totalBlocks: blocks.length,
                    brokenAt: blocks[i].BlockIndex,
                });
            }
        }

        res.json({
            valid: true,
            message: 'Integritas chain terverifikasi',
            totalBlocks: blocks.length,
        });
    } catch (error) {
        console.error('Admin validate chain error:', error);
        res.status(500).json({ message: 'Gagal memvalidasi chain' });
    }
});

// ============================================
// DASHBOARD STATS (Admin — All Processors)
// ============================================

// GET /api/admin/stats
router.get('/stats', async (req, res) => {
    try {
        const totalProcessors = await Processor.count();
        const totalUsers = await User.count({ where: { Role: 'KARYAWAN' } });
        const totalOrders = await Order.count();
        const totalProduksi = await Produksi.count();
        const totalPengiriman = await Pengiriman.count();
        const totalChains = await BlockchainIdentity.count();
        const totalBlocks = await LedgerProcessor.count();

        res.json({
            totalProcessors,
            totalUsers,
            totalOrders,
            totalProduksi,
            totalPengiriman,
            totalChains,
            totalBlocks,
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ message: 'Gagal memuat statistik admin' });
    }
});

module.exports = router;
