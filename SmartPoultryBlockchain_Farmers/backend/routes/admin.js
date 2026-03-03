const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { Login, Peternakan, LedgerPeternakan, BlockchainIdentity, Cycle, Kandang, DOC } = require('../models');
const { adminMiddleware } = require('../middleware/auth');
const { Op } = require('sequelize');

// All routes require admin authentication
router.use(adminMiddleware);

// ============================================
// USER MANAGEMENT
// ============================================

// GET /api/admin/users - Get all user accounts with peternakan info
router.get('/users', async (req, res) => {
    try {
        const { search } = req.query;

        const whereClause = { Role: 'user' };

        if (search) {
            whereClause[Op.or] = [
                { Email: { [Op.like]: `%${search}%` } }
            ];
        }

        const users = await Login.findAll({
            where: whereClause,
            include: [{ model: Peternakan }],
            attributes: { exclude: ['Password'] },
            order: [['UserID', 'DESC']]
        });

        // Also search by peternakan name/location if search query
        let filteredUsers = users;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUsers = users.filter(u =>
                u.Email.toLowerCase().includes(searchLower) ||
                (u.Peternakan?.NamaPeternakan || '').toLowerCase().includes(searchLower) ||
                (u.Peternakan?.LokasiPeternakan || '').toLowerCase().includes(searchLower)
            );
        }

        const result = filteredUsers.map(user => ({
            userId: user.UserID,
            email: user.Email,
            kodePeternakan: user.KodePeternakan,
            namaPeternakan: user.Peternakan?.NamaPeternakan || '-',
            lokasiPeternakan: user.Peternakan?.LokasiPeternakan || '-',
            role: user.Role,
            createdAt: user.createdAt
        }));

        res.json(result);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// GET /api/admin/users/:id - Get single user
router.get('/users/:id', async (req, res) => {
    try {
        const user = await Login.findByPk(req.params.id, {
            include: [{ model: Peternakan }],
            attributes: { exclude: ['Password'] }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            userId: user.UserID,
            email: user.Email,
            kodePeternakan: user.KodePeternakan,
            namaPeternakan: user.Peternakan?.NamaPeternakan || '-',
            lokasiPeternakan: user.Peternakan?.LokasiPeternakan || '-',
            role: user.Role,
            createdAt: user.createdAt
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// PUT /api/admin/users/:id - Update user account (email, farm name, farm location)
router.put('/users/:id', async (req, res) => {
    try {
        const { email, namaPeternakan, lokasiPeternakan } = req.body;

        const user = await Login.findByPk(req.params.id, {
            include: [{ model: Peternakan }]
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Check if new email conflicts with another user
        if (email && email !== user.Email) {
            const existingUser = await Login.findOne({ where: { Email: email, UserID: { [Op.ne]: user.UserID } } });
            if (existingUser) {
                return res.status(400).json({ error: 'Email sudah digunakan oleh akun lain' });
            }
            user.Email = email;
            await user.save();
        }

        // Update peternakan info
        if (user.Peternakan) {
            if (namaPeternakan) user.Peternakan.NamaPeternakan = namaPeternakan;
            if (lokasiPeternakan) user.Peternakan.LokasiPeternakan = lokasiPeternakan;
            await user.Peternakan.save();
        }

        res.json({
            message: 'User berhasil diperbarui',
            user: {
                userId: user.UserID,
                email: user.Email,
                kodePeternakan: user.KodePeternakan,
                namaPeternakan: user.Peternakan?.NamaPeternakan,
                lokasiPeternakan: user.Peternakan?.LokasiPeternakan,
                role: user.Role
            }
        });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Gagal memperbarui user' });
    }
});

// DELETE /api/admin/users/:id - Delete user account and associated peternakan
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await Login.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.Role === 'admin') {
            return res.status(403).json({ error: 'Tidak dapat menghapus akun admin' });
        }

        await user.destroy();

        res.json({ message: 'User berhasil dihapus' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Gagal menghapus user' });
    }
});

// POST /api/admin/users - Create a new user account
router.post('/users', async (req, res) => {
    try {
        const { email, password, namaPeternakan, lokasiPeternakan } = req.body;

        if (!email || !password || !namaPeternakan || !lokasiPeternakan) {
            return res.status(400).json({ error: 'Semua field wajib diisi' });
        }

        // Check if email exists
        const existingUser = await Login.findOne({ where: { Email: email } });
        if (existingUser) {
            return res.status(400).json({ error: 'Email sudah terdaftar' });
        }

        // Create Peternakan
        const peternakan = await Peternakan.create({
            NamaPeternakan: namaPeternakan,
            LokasiPeternakan: lokasiPeternakan
        });

        // Hash password
        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await Login.create({
            KodePeternakan: peternakan.KodePeternakan,
            Email: email,
            Password: hashedPassword,
            Role: 'user'
        });

        res.status(201).json({
            message: 'User berhasil dibuat',
            user: {
                userId: user.UserID,
                email: user.Email,
                kodePeternakan: user.KodePeternakan,
                namaPeternakan: peternakan.NamaPeternakan,
                lokasiPeternakan: peternakan.LokasiPeternakan,
                role: user.Role
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'Gagal membuat user' });
    }
});

// ============================================
// BLOCKCHAIN MONITORING (Admin can see ALL blockchain data across all farms)
// ============================================

// GET /api/admin/blockchain/overview - Get blockchain overview across all farms
router.get('/blockchain/overview', async (req, res) => {
    try {
        const { search } = req.query;

        const allChains = await BlockchainIdentity.findAll({
            include: [
                { model: Peternakan },
                { model: Cycle }
            ],
            order: [['CreatedAt', 'DESC']]
        });

        // Filter by search if provided
        let filteredChains = allChains;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredChains = allChains.filter(c =>
                (c.KodeIdentity || '').toLowerCase().includes(searchLower) ||
                (c.Peternakan?.NamaPeternakan || '').toLowerCase().includes(searchLower) ||
                (c.StatusChain || '').toLowerCase().includes(searchLower) ||
                String(c.KodeCycle).includes(searchLower)
            );
        }

        const totalBlocks = await LedgerPeternakan.count();
        const totalChains = allChains.length;
        const activeChains = allChains.filter(c => c.StatusChain === 'ACTIVE').length;
        const completedChains = allChains.filter(c => c.StatusChain === 'COMPLETED').length;
        const transferredChains = allChains.filter(c => c.StatusChain === 'TRANSFERRED').length;

        // Enrich chains with extra info
        const chainsData = await Promise.all(filteredChains.map(async (chain) => {
            const actualBlockCount = await LedgerPeternakan.count({
                where: { KodePeternakan: chain.KodePeternakan, KodeCycle: chain.KodeCycle }
            });

            // Get kandang info
            let kandangInfo = null;
            const kandang = await Kandang.findOne({ where: { KodeCycle: chain.KodeCycle } });
            if (kandang) {
                kandangInfo = kandang.KodeKandang;
                const doc = await DOC.findOne({ where: { KodeKandang: kandang.KodeKandang } });
                if (doc) {
                    kandangInfo = {
                        kodeKandang: kandang.KodeKandang,
                        brandDOC: doc.BrandDOC,
                        tipeAyam: doc.TipeAyam
                    };
                }
            }

            return {
                KodeIdentity: chain.KodeIdentity,
                KodePeternakan: chain.KodePeternakan,
                NamaPeternakan: chain.Peternakan?.NamaPeternakan || '-',
                KodeCycle: chain.KodeCycle,
                GenesisHash: chain.GenesisHash,
                LatestBlockHash: chain.LatestBlockHash,
                TotalBlocks: chain.TotalBlocks,
                ActualBlockCount: actualBlockCount,
                StatusChain: chain.StatusChain,
                CreatedAt: chain.CreatedAt,
                CompletedAt: chain.CompletedAt,
                TanggalMulai: chain.Cycle?.TanggalMulai,
                DurasiCycle: chain.Cycle?.DurasiCycle,
                KodeKandang: typeof kandangInfo === 'object' ? kandangInfo.kodeKandang : kandangInfo,
                BrandDOC: typeof kandangInfo === 'object' ? kandangInfo.brandDOC : null,
                TipeAyam: typeof kandangInfo === 'object' ? kandangInfo.tipeAyam : null,
            };
        }));

        res.json({
            totalChains,
            activeChains,
            completedChains,
            transferredChains,
            totalBlocks,
            chains: chainsData
        });
    } catch (error) {
        console.error('Admin blockchain overview error:', error);
        res.status(500).json({ error: 'Failed to fetch blockchain overview' });
    }
});

// GET /api/admin/blockchain/blocks/:cycleId - Get blocks for a specific cycle
router.get('/blockchain/blocks/:cycleId', async (req, res) => {
    try {
        const blocks = await LedgerPeternakan.findAll({
            where: { KodeCycle: req.params.cycleId },
            order: [['BlockIndex', 'ASC']]
        });

        res.json(blocks);
    } catch (error) {
        console.error('Admin get blocks error:', error);
        res.status(500).json({ error: 'Failed to fetch blocks' });
    }
});

// GET /api/admin/blockchain/validate/:cycleId - Validate chain integrity
router.get('/blockchain/validate/:cycleId', async (req, res) => {
    try {
        const blocks = await LedgerPeternakan.findAll({
            where: { KodeCycle: req.params.cycleId },
            order: [['BlockIndex', 'ASC']]
        });

        if (blocks.length === 0) {
            return res.json({ valid: false, message: 'No blocks found', totalBlocks: 0 });
        }

        // Validate hash chain
        for (let i = 1; i < blocks.length; i++) {
            if (blocks[i].PreviousHash !== blocks[i - 1].CurrentHash) {
                return res.json({
                    valid: false,
                    message: `Hash mismatch at block #${blocks[i].BlockIndex}`,
                    totalBlocks: blocks.length,
                    brokenAt: blocks[i].BlockIndex
                });
            }
        }

        res.json({
            valid: true,
            message: 'Chain integrity verified successfully',
            totalBlocks: blocks.length
        });
    } catch (error) {
        console.error('Admin validate chain error:', error);
        res.status(500).json({ error: 'Failed to validate chain' });
    }
});

// ============================================
// CROSS-CHAIN UNIFIED MONITORING
// ============================================

const crossChain = require('../config/crossChainDatabase');
const { sequelize } = require('../models');

// GET /api/admin/blockchain/cross-chain-status - Check cross-chain DB connections
router.get('/blockchain/cross-chain-status', async (req, res) => {
    try {
        const status = await crossChain.testAllConnections();
        res.json({
            peternakan: true, // Always connected (local)
            kurir: status.kurir,
            processor: status.processor,
            retailer: status.retailer
        });
    } catch (error) {
        console.error('Cross-chain status error:', error);
        res.status(500).json({ error: 'Failed to check cross-chain status' });
    }
});

// GET /api/admin/blockchain/unified-overview - Overview of ALL chains across ALL systems
router.get('/blockchain/unified-overview', async (req, res) => {
    try {
        const { search } = req.query;

        // 1. Peternakan chains (local)
        const allPeternakanChains = await BlockchainIdentity.findAll({
            include: [
                { model: Peternakan },
                { model: Cycle }
            ],
            order: [['CreatedAt', 'DESC']]
        });

        const peternakanChains = await Promise.all(allPeternakanChains.map(async (chain) => {
            const actualBlockCount = await LedgerPeternakan.count({
                where: { KodePeternakan: chain.KodePeternakan, KodeCycle: chain.KodeCycle }
            });

            let kandangInfo = null;
            const kandang = await Kandang.findOne({ where: { KodeCycle: chain.KodeCycle } });
            if (kandang) {
                const doc = await DOC.findOne({ where: { KodeKandang: kandang.KodeKandang } });
                kandangInfo = {
                    kodeKandang: kandang.KodeKandang,
                    brandDOC: doc?.BrandDOC || null,
                    tipeAyam: doc?.TipeAyam || null
                };
            }

            return {
                nodeType: 'NODE_PETERNAKAN',
                nodeLabel: '🏗️ Peternakan',
                nodeColor: '#10b981',
                KodeIdentity: chain.KodeIdentity,
                KodePeternakan: chain.KodePeternakan,
                NamaPeternakan: chain.Peternakan?.NamaPeternakan || '-',
                KodeCycle: chain.KodeCycle,
                GenesisHash: chain.GenesisHash,
                LatestBlockHash: chain.LatestBlockHash,
                TotalBlocks: chain.TotalBlocks,
                ActualBlockCount: actualBlockCount,
                StatusChain: chain.StatusChain,
                CreatedAt: chain.CreatedAt,
                CompletedAt: chain.CompletedAt,
                TanggalMulai: chain.Cycle?.TanggalMulai,
                DurasiCycle: chain.Cycle?.DurasiCycle,
                KodeKandang: kandangInfo?.kodeKandang || null,
                BrandDOC: kandangInfo?.brandDOC || null,
                TipeAyam: kandangInfo?.tipeAyam || null,
            };
        }));

        // 2. Kurir chains (cross-DB)
        let kurirChains = [];
        let kurirConnected = false;
        try {
            kurirConnected = await crossChain.testKurirConnection();
            if (kurirConnected) {
                const rawKurirChains = await crossChain.getAllKurirChains();
                kurirChains = rawKurirChains.map(c => ({
                    nodeType: 'NODE_KURIR',
                    nodeLabel: c.TipePengiriman === 'PROCESSOR_TO_RETAILER' ? '🚛 Kurir (Leg 2)' : '🚛 Kurir (Leg 1)',
                    nodeColor: '#f59e0b',
                    KodeIdentity: c.KodeIdentity,
                    KodePengiriman: c.KodePengiriman,
                    NamaPerusahaan: c.NamaPerusahaan,
                    AsalPengirim: c.AsalPengirim,
                    TujuanPenerima: c.TujuanPenerima,
                    TipePengiriman: c.TipePengiriman,
                    GenesisHash: c.GenesisHash,
                    LatestBlockHash: c.LatestBlockHash,
                    TotalBlocks: c.TotalBlocks,
                    ActualBlockCount: c.ActualBlockCount,
                    StatusChain: c.StatusChain,
                    CreatedAt: c.CreatedAt,
                    CompletedAt: c.CompletedAt,
                    UpstreamCycleId: c.UpstreamCycleId,
                    UpstreamChainHash: c.UpstreamChainHash,
                }));
            }
        } catch (e) { /* silent */ }

        // 3. Processor chains (cross-DB)
        let processorChains = [];
        let processorConnected = false;
        try {
            processorConnected = await crossChain.testProcessorConnection();
            if (processorConnected) {
                const rawProcessorChains = await crossChain.getAllProcessorChains();
                processorChains = rawProcessorChains.map(c => ({
                    nodeType: 'NODE_PROCESSOR',
                    nodeLabel: '🏭 Processor',
                    nodeColor: '#8b5cf6',
                    KodeIdentity: c.KodeIdentity,
                    IdIdentity: c.IdIdentity,
                    KodeOrder: c.KodeOrder,
                    NamaPeternakan: c.NamaPeternakan,
                    JenisAyam: c.JenisAyam,
                    GenesisHash: c.GenesisHash,
                    LatestBlockHash: c.LatestBlockHash,
                    TotalBlocks: c.TotalBlocks,
                    ActualBlockCount: c.ActualBlockCount,
                    StatusChain: c.StatusChain,
                    CreatedAt: c.CreatedAt,
                    CompletedAt: c.CompletedAt,
                }));
            }
        } catch (e) { /* silent */ }

        // 4. Retailer chains (cross-DB)
        let retailerChains = [];
        let retailerConnected = false;
        try {
            retailerConnected = await crossChain.testRetailerConnection();
            if (retailerConnected) {
                const rawRetailerChains = await crossChain.getAllRetailerChains();
                retailerChains = rawRetailerChains.map(c => ({
                    nodeType: 'NODE_RETAILER',
                    nodeLabel: '🏪 Retailer',
                    nodeColor: '#ec4899',
                    KodeIdentity: c.KodeIdentity,
                    IdIdentity: c.IdIdentity,
                    KodeOrder: c.KodeOrder,
                    NamaProcessor: c.NamaProcessor,
                    NamaProduk: c.NamaProduk,
                    NamaRetailer: c.NamaRetailer,
                    AlamatRetailer: c.AlamatRetailer,
                    KodeOrderProcessor: c.KodeOrderProcessor,
                    GenesisHash: c.GenesisHash,
                    LatestBlockHash: c.LatestBlockHash,
                    TotalBlocks: c.TotalBlocks,
                    ActualBlockCount: c.ActualBlockCount,
                    StatusChain: c.StatusChain,
                    CreatedAt: c.CreatedAt,
                    CompletedAt: c.CompletedAt,
                }));
            }
        } catch (e) { /* silent */ }

        // Combine all chains
        let allChains = [...peternakanChains, ...kurirChains, ...processorChains, ...retailerChains];

        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            allChains = allChains.filter(c =>
                (c.KodeIdentity || '').toLowerCase().includes(searchLower) ||
                (c.NamaPeternakan || '').toLowerCase().includes(searchLower) ||
                (c.NamaPerusahaan || '').toLowerCase().includes(searchLower) ||
                (c.NamaRetailer || '').toLowerCase().includes(searchLower) ||
                (c.NamaProcessor || '').toLowerCase().includes(searchLower) ||
                (c.StatusChain || '').toLowerCase().includes(searchLower) ||
                (c.nodeType || '').toLowerCase().includes(searchLower) ||
                String(c.KodeCycle || c.KodePengiriman || c.KodeOrder || '').toLowerCase().includes(searchLower)
            );
        }

        // Sort by CreatedAt DESC
        allChains.sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt));

        // Stats
        const stats = {
            peternakan: {
                total: peternakanChains.length,
                active: peternakanChains.filter(c => c.StatusChain === 'ACTIVE').length,
                completed: peternakanChains.filter(c => c.StatusChain === 'COMPLETED').length,
                transferred: peternakanChains.filter(c => c.StatusChain === 'TRANSFERRED').length,
                failed: peternakanChains.filter(c => c.StatusChain === 'FAILED').length,
                totalBlocks: peternakanChains.reduce((s, c) => s + (c.ActualBlockCount || 0), 0),
                connected: true
            },
            kurir: {
                total: kurirChains.length,
                active: kurirChains.filter(c => c.StatusChain === 'ACTIVE').length,
                completed: kurirChains.filter(c => c.StatusChain === 'COMPLETED').length,
                totalBlocks: kurirChains.reduce((s, c) => s + (c.ActualBlockCount || 0), 0),
                connected: kurirConnected
            },
            processor: {
                total: processorChains.length,
                active: processorChains.filter(c => c.StatusChain === 'ACTIVE').length,
                completed: processorChains.filter(c => c.StatusChain === 'COMPLETED').length,
                totalBlocks: processorChains.reduce((s, c) => s + (c.ActualBlockCount || 0), 0),
                connected: processorConnected
            },
            retailer: {
                total: retailerChains.length,
                active: retailerChains.filter(c => c.StatusChain === 'ACTIVE').length,
                completed: retailerChains.filter(c => c.StatusChain === 'COMPLETED').length,
                totalBlocks: retailerChains.reduce((s, c) => s + (c.ActualBlockCount || 0), 0),
                connected: retailerConnected
            }
        };

        res.json({
            stats,
            totalChains: allChains.length,
            totalBlocks: stats.peternakan.totalBlocks + stats.kurir.totalBlocks + stats.processor.totalBlocks + stats.retailer.totalBlocks,
            chains: allChains,
            connectionStatus: {
                peternakan: true,
                kurir: kurirConnected,
                processor: processorConnected,
                retailer: retailerConnected
            }
        });
    } catch (error) {
        console.error('Unified overview error:', error);
        res.status(500).json({ error: 'Failed to fetch unified blockchain overview' });
    }
});

// GET /api/admin/blockchain/unified-chain/:cycleId - Get unified chain view for a cycle
router.get('/blockchain/unified-chain/:cycleId', async (req, res) => {
    try {
        const data = await crossChain.getUnifiedChainByCycle(sequelize, parseInt(req.params.cycleId));
        res.json(data);
    } catch (error) {
        console.error('Unified chain error:', error);
        res.status(500).json({ error: 'Failed to fetch unified chain data' });
    }
});

// GET /api/admin/blockchain/kurir-blocks/:kodePengiriman - Get Kurir chain blocks
router.get('/blockchain/kurir-blocks/:kodePengiriman', async (req, res) => {
    try {
        const blocks = await crossChain.getKurirBlocks(req.params.kodePengiriman);
        res.json(blocks);
    } catch (error) {
        console.error('Get kurir blocks error:', error);
        res.status(500).json({ error: 'Failed to fetch Kurir blocks' });
    }
});

// GET /api/admin/blockchain/processor-blocks/:idIdentity - Get Processor chain blocks
router.get('/blockchain/processor-blocks/:idIdentity', async (req, res) => {
    try {
        const blocks = await crossChain.getProcessorBlocks(parseInt(req.params.idIdentity));
        res.json(blocks);
    } catch (error) {
        console.error('Get processor blocks error:', error);
        res.status(500).json({ error: 'Failed to fetch Processor blocks' });
    }
});

// GET /api/admin/blockchain/validate-kurir/:kodePengiriman - Validate Kurir chain
router.get('/blockchain/validate-kurir/:kodePengiriman', async (req, res) => {
    try {
        const result = await crossChain.validateKurirChain(req.params.kodePengiriman);
        res.json(result);
    } catch (error) {
        console.error('Validate kurir chain error:', error);
        res.status(500).json({ error: 'Failed to validate Kurir chain' });
    }
});

// GET /api/admin/blockchain/validate-processor/:idIdentity - Validate Processor chain
router.get('/blockchain/validate-processor/:idIdentity', async (req, res) => {
    try {
        const result = await crossChain.validateProcessorChain(parseInt(req.params.idIdentity));
        res.json(result);
    } catch (error) {
        console.error('Validate processor chain error:', error);
        res.status(500).json({ error: 'Failed to validate Processor chain' });
    }
});

// GET /api/admin/blockchain/retailer-blocks/:idIdentity - Get Retailer chain blocks
router.get('/blockchain/retailer-blocks/:idIdentity', async (req, res) => {
    try {
        const blocks = await crossChain.getRetailerBlocks(parseInt(req.params.idIdentity));
        res.json(blocks);
    } catch (error) {
        console.error('Get retailer blocks error:', error);
        res.status(500).json({ error: 'Failed to fetch Retailer blocks' });
    }
});

// GET /api/admin/blockchain/validate-retailer/:idIdentity - Validate Retailer chain
router.get('/blockchain/validate-retailer/:idIdentity', async (req, res) => {
    try {
        const result = await crossChain.validateRetailerChain(parseInt(req.params.idIdentity));
        res.json(result);
    } catch (error) {
        console.error('Validate retailer chain error:', error);
        res.status(500).json({ error: 'Failed to validate Retailer chain' });
    }
});

module.exports = router;

