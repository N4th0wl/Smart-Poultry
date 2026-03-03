const express = require('express');
const router = express.Router();
const { BlockchainIdentity, LedgerRetailer, Order, sequelize } = require('../models');
const blockchain = require('../utils/blockchain');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/blockchain/overview
router.get('/overview', authMiddleware, async (req, res) => {
    try {
        const whereRetailer = req.user.idRetailer ? `AND bi.IdRetailer = ${req.user.idRetailer}` : '';
        const chains = await sequelize.query(`
            SELECT bi.*, o.KodeOrder, o.NamaProcessor, o.NamaProduk, o.TanggalOrder,
                   (SELECT COUNT(*) FROM ledger_retailer lr WHERE lr.IdIdentity = bi.IdIdentity) AS ActualBlockCount
            FROM blockchainidentity bi
            LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
            WHERE 1=1 ${whereRetailer}
            ORDER BY bi.CreatedAt DESC
        `, { type: sequelize.QueryTypes.SELECT });

        const totalBlocks = chains.reduce((sum, c) => sum + (c.ActualBlockCount || 0), 0);

        res.json({
            totalChains: chains.length,
            activeChains: chains.filter(c => c.StatusChain === 'ACTIVE').length,
            completedChains: chains.filter(c => c.StatusChain === 'COMPLETED').length,
            failedChains: chains.filter(c => c.StatusChain === 'FAILED').length,
            totalBlocks,
            chains,
        });
    } catch (error) {
        console.error('Get overview error:', error);
        res.status(500).json({ message: 'Gagal mengambil overview blockchain.' });
    }
});

// GET /api/blockchain
router.get('/', authMiddleware, async (req, res) => {
    try {
        const where = req.user.idRetailer ? { IdRetailer: req.user.idRetailer } : {};
        const identities = await BlockchainIdentity.findAll({
            where,
            include: [{ model: Order, as: 'order', attributes: ['KodeOrder', 'NamaProcessor', 'NamaProduk'] }],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: identities });
    } catch (error) {
        console.error('Get blockchain error:', error);
        res.status(500).json({ message: 'Gagal mengambil data blockchain.' });
    }
});

// GET /api/blockchain/:id/blocks
router.get('/:id/blocks', authMiddleware, async (req, res) => {
    try {
        const blocks = await sequelize.query(`
            SELECT lr.IdBlock, lr.KodeBlock, lr.BlockIndex, lr.TipeBlock, lr.PreviousHash, lr.CurrentHash,
                   lr.DataPayload, lr.Nonce, lr.StatusBlock, lr.CreatedAt, lr.ValidatedAt
            FROM ledger_retailer lr
            WHERE lr.IdIdentity = :idIdentity
            ORDER BY lr.BlockIndex ASC
        `, {
            replacements: { idIdentity: req.params.id },
            type: sequelize.QueryTypes.SELECT
        });

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

// GET /api/blockchain/:id/validate
router.get('/:id/validate', authMiddleware, async (req, res) => {
    try {
        const result = await blockchain.validateChain(sequelize, req.params.id);
        res.json({ data: result });
    } catch (error) {
        console.error('Validate chain error:', error);
        res.status(500).json({ message: 'Gagal memvalidasi chain.' });
    }
});

// GET /api/blockchain/:id/trace
router.get('/:id/trace', authMiddleware, async (req, res) => {
    try {
        const data = await blockchain.getTraceabilityData(sequelize, req.params.id);
        if (!data) return res.status(404).json({ message: 'Chain tidak ditemukan.' });
        res.json({ data });
    } catch (error) {
        console.error('Trace error:', error);
        res.status(500).json({ message: 'Gagal melakukan traceability.' });
    }
});

// GET /api/blockchain/processor-chain/:kodeOrder — fetch processor chain info
router.get('/processor-chain/:kodeOrder', authMiddleware, async (req, res) => {
    try {
        const kodeOrder = req.params.kodeOrder;
        const crossChain = require('../config/crossChainDatabase');
        let processorData = null;

        // First try cross-chain module (proper connection)
        try {
            const connected = await crossChain.testProcessorConnection();
            if (connected) {
                const chainData = await crossChain.getProcessorChainByOrder(kodeOrder);
                if (chainData) {
                    processorData = {
                        identity: chainData.identity,
                        blocks: chainData.blocks,
                        found: true,
                    };
                }
            }
        } catch (crossChainError) {
            console.log('Cross-chain processor fetch failed, trying direct SQL:', crossChainError.message);
        }

        // Fallback: direct SQL (same MySQL server)
        if (!processorData) {
            try {
                const [processorIdentity] = await sequelize.query(`
                    SELECT bi.KodeIdentity, bi.IdProcessor, bi.GenesisHash,
                           bi.LatestBlockHash, bi.TotalBlocks, bi.StatusChain
                    FROM smartpoultry_processor.blockchainidentity bi
                    LEFT JOIN smartpoultry_processor.orders o ON bi.IdOrder = o.IdOrder
                    WHERE o.KodeOrder = :kodeOrder
                `, {
                    replacements: { kodeOrder },
                    type: sequelize.QueryTypes.SELECT
                });

                if (processorIdentity) {
                    processorData = {
                        identity: processorIdentity,
                        found: true,
                    };
                }
            } catch (err) {
                console.log('Could not fetch processor chain data:', err.message);
            }
        }

        if (!processorData) {
            return res.json({
                data: { found: false, message: 'Data chain processor tidak ditemukan.' }
            });
        }

        res.json({ data: processorData });
    } catch (error) {
        console.error('Processor chain fetch error:', error);
        res.status(500).json({ message: 'Gagal mengambil data chain processor.' });
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
            retailer: true, // Always connected (local)
            peternakan: status.peternakan,
            kurir: status.kurir,
            processor: status.processor
        });
    } catch (error) {
        console.error('Cross-chain status error:', error);
        res.status(500).json({ message: 'Gagal memeriksa status cross-chain.' });
    }
});

// GET /api/blockchain/unified-chain/:id — Get unified chain view for a retailer identity
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

