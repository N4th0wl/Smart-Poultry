const express = require('express');
const router = express.Router();
const { BlockchainIdentity, LedgerProcessor, Order, sequelize } = require('../models');
const blockchain = require('../utils/blockchain');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// GET /api/blockchain/overview — Dashboard overview
router.get('/overview', authMiddleware, async (req, res) => {
    try {
        const chains = await sequelize.query(`
            SELECT bi.*, o.KodeOrder, o.NamaPeternakan, o.JenisAyam, o.TanggalOrder,
                   (SELECT COUNT(*) FROM ledger_processor lp WHERE lp.IdIdentity = bi.IdIdentity) AS ActualBlockCount
            FROM blockchainidentity bi
            LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
            ORDER BY bi.CreatedAt DESC
        `, { type: sequelize.QueryTypes.SELECT });

        const totalBlocks = chains.reduce((sum, c) => sum + (c.ActualBlockCount || 0), 0);

        const overview = {
            totalChains: chains.length,
            activeChains: chains.filter(c => c.StatusChain === 'ACTIVE').length,
            completedChains: chains.filter(c => c.StatusChain === 'COMPLETED').length,
            failedChains: chains.filter(c => c.StatusChain === 'FAILED').length,
            transferredChains: chains.filter(c => c.StatusChain === 'TRANSFERRED').length,
            totalBlocks,
            chains: chains
        };

        res.json(overview);
    } catch (error) {
        console.error('Get overview error:', error);
        res.status(500).json({ message: 'Gagal mengambil overview blockchain.' });
    }
});

// GET /api/blockchain — list all blockchain identities
router.get('/', authMiddleware, async (req, res) => {
    try {
        const identities = await BlockchainIdentity.findAll({
            include: [{ model: Order, as: 'order', attributes: ['KodeOrder', 'NamaPeternakan', 'JenisAyam'] }],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: identities });
    } catch (error) {
        console.error('Get blockchain error:', error);
        res.status(500).json({ message: 'Gagal mengambil data blockchain.' });
    }
});

// GET /api/blockchain/:id/blocks — get all blocks for an identity
router.get('/:id/blocks', authMiddleware, async (req, res) => {
    try {
        const blocks = await sequelize.query(`
            SELECT lp.IdBlock, lp.KodeBlock, lp.BlockIndex, lp.TipeBlock, lp.PreviousHash, lp.CurrentHash,
                   lp.DataPayload, lp.Nonce, lp.StatusBlock, lp.CreatedAt, lp.ValidatedAt
            FROM ledger_processor lp
            WHERE lp.IdIdentity = :idIdentity
            ORDER BY lp.BlockIndex ASC
        `, {
            replacements: { idIdentity: req.params.id },
            type: sequelize.QueryTypes.SELECT
        });

        // Parse DataPayload if it's a string
        const parsedBlocks = blocks.map(b => {
            let payload = b.DataPayload;
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
            }
            return { ...b, DataPayload: payload };
        });

        res.json({ data: parsedBlocks });
    } catch (error) {
        console.error('Get blocks error:', error);
        res.status(500).json({ message: 'Gagal mengambil data block.' });
    }
});

// GET /api/blockchain/:id/validate — validate chain integrity
router.get('/:id/validate', authMiddleware, async (req, res) => {
    try {
        const result = await blockchain.validateChain(sequelize, req.params.id);
        res.json({ data: result });
    } catch (error) {
        console.error('Validate chain error:', error);
        res.status(500).json({ message: 'Gagal memvalidasi chain.' });
    }
});

// GET /api/blockchain/:id/trace — full traceability data for a chain
router.get('/:id/trace', authMiddleware, async (req, res) => {
    try {
        const data = await blockchain.getTraceabilityData(sequelize, req.params.id);
        if (!data) {
            return res.status(404).json({ message: 'Chain tidak ditemukan.' });
        }
        res.json({ data });
    } catch (error) {
        console.error('Trace error:', error);
        res.status(500).json({ message: 'Gagal melakukan traceability.' });
    }
});

// GET /api/blockchain/trace/:kodeOrder — public traceability by order code
router.get('/trace/:kodeOrder', async (req, res) => {
    try {
        const order = await Order.findOne({ where: { KodeOrder: req.params.kodeOrder } });
        if (!order) return res.status(404).json({ message: 'Order tidak ditemukan.' });

        const identity = await BlockchainIdentity.findOne({ where: { IdOrder: order.IdOrder } });
        if (!identity) return res.status(404).json({ message: 'Blockchain belum ada untuk order ini.' });

        const data = await blockchain.getTraceabilityData(sequelize, identity.IdIdentity);
        if (!data) {
            return res.status(404).json({ message: 'Data traceability tidak ditemukan.' });
        }

        res.json({ data });
    } catch (error) {
        console.error('Public trace error:', error);
        res.status(500).json({ message: 'Gagal melakukan traceability.' });
    }
});

// GET /api/blockchain/farm-chain/:kodeCycleFarm — fetch farm chain info for linking
// This endpoint uses the cross-chain module to read farm blockchain data
router.get('/farm-chain/:kodeCycleFarm', authMiddleware, async (req, res) => {
    try {
        const kodeCycle = req.params.kodeCycleFarm;
        const crossChain = require('../config/crossChainDatabase');

        let farmData = null;

        // First try via cross-chain module (proper connection)
        try {
            const connected = await crossChain.testPeternakanConnection();
            if (connected) {
                const chainData = await crossChain.getPeternakanChainByCycle(kodeCycle);
                if (chainData) {
                    farmData = {
                        identity: chainData.identity,
                        blocks: chainData.blocks,
                        nodeType: 'NODE_PETERNAKAN',
                        found: true,
                    };
                }
            }
        } catch (crossChainError) {
            console.log('Cross-chain farm fetch failed, trying direct SQL:', crossChainError.message);
        }

        // Fallback: direct SQL (same MySQL server)
        if (!farmData) {
            try {
                const [farmIdentity] = await sequelize.query(`
                    SELECT bi.KodeIdentity, bi.KodePeternakan, bi.KodeCycle, bi.GenesisHash, 
                           bi.LatestBlockHash, bi.TotalBlocks, bi.StatusChain,
                           p.NamaPeternakan, p.LokasiPeternakan
                    FROM smartpoultry_peternakan.BlockchainIdentity bi
                    LEFT JOIN smartpoultry_peternakan.Peternakan p ON bi.KodePeternakan = p.KodePeternakan
                    WHERE bi.KodeCycle = :kodeCycle
                `, {
                    replacements: { kodeCycle },
                    type: sequelize.QueryTypes.SELECT
                });

                if (farmIdentity) {
                    const farmBlocks = await sequelize.query(`
                        SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash, 
                               DataPayload, StatusBlock, CreatedAt
                        FROM smartpoultry_peternakan.ledger_peternakan
                        WHERE KodeCycle = :kodeCycle
                        ORDER BY BlockIndex ASC
                    `, {
                        replacements: { kodeCycle },
                        type: sequelize.QueryTypes.SELECT
                    });

                    const parsedBlocks = farmBlocks.map(b => {
                        let payload = b.DataPayload;
                        if (typeof payload === 'string') {
                            try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
                        }
                        return { ...b, DataPayload: payload };
                    });

                    farmData = {
                        identity: farmIdentity,
                        blocks: parsedBlocks,
                        nodeType: 'NODE_PETERNAKAN',
                        found: true,
                    };
                }
            } catch (farmError) {
                console.log('Could not fetch farm chain data (database may not be accessible):', farmError.message);
            }
        }

        if (!farmData) {
            return res.json({
                data: { found: false, message: 'Data chain peternakan tidak ditemukan atau database tidak dapat diakses.' }
            });
        }

        res.json({ data: farmData });
    } catch (error) {
        console.error('Farm chain fetch error:', error);
        res.status(500).json({ message: 'Gagal mengambil data chain peternakan.' });
    }
});

// ============================================================================
// CROSS-CHAIN UNIFIED MONITORING
// ============================================================================

const crossChain = require('../config/crossChainDatabase');

// GET /api/blockchain/cross-chain-status — Check cross-chain DB connections
router.get('/cross-chain-status', authMiddleware, async (req, res) => {
    try {
        const status = await crossChain.testAllConnections();
        res.json({
            processor: true, // Always connected (local)
            peternakan: status.peternakan,
            kurir: status.kurir,
            retailer: status.retailer
        });
    } catch (error) {
        console.error('Cross-chain status error:', error);
        res.status(500).json({ message: 'Gagal memeriksa status cross-chain.' });
    }
});

// GET /api/blockchain/unified-chain/:id — Get unified chain view for a processor identity
router.get('/unified-chain/:id', authMiddleware, async (req, res) => {
    try {
        const data = await crossChain.getUnifiedChainByOrder(sequelize, parseInt(req.params.id));
        res.json(data);
    } catch (error) {
        console.error('Unified chain error:', error);
        res.status(500).json({ message: 'Gagal mengambil data unified chain.' });
    }
});

module.exports = router;

