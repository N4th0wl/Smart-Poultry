const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const blockchain = require('../utils/blockchainHelper');

// =====================================================
// AUTHENTICATED ROUTES (Dashboard)
// =====================================================
router.use(authMiddleware);

// GET /api/blockchain/overview - Dashboard overview
router.get('/overview', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const chains = await sequelize.query(`
            SELECT bi.*, c.TanggalMulai, c.DurasiCycle, c.SisaHariPanen,
                   (SELECT COUNT(*) FROM ledger_peternakan lp WHERE lp.KodeCycle = bi.KodeCycle) AS ActualBlockCount
            FROM BlockchainIdentity bi
            LEFT JOIN Cycle c ON bi.KodeCycle = c.KodeCycle
            WHERE bi.KodePeternakan = :kodePeternakan
            ORDER BY bi.CreatedAt DESC
        `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

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
        res.status(500).json({ error: 'Failed to get overview' });
    }
});

// GET /api/blockchain/chains - Get all chains
router.get('/chains', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const chains = await sequelize.query(`
            SELECT bi.*, c.TanggalMulai, c.DurasiCycle, c.SisaHariPanen,
                   k.KodeKandang, d.BrandDOC, d.TipeAyam, d.JumlahDiterima
            FROM BlockchainIdentity bi
            LEFT JOIN Cycle c ON bi.KodeCycle = c.KodeCycle
            LEFT JOIN Kandang k ON k.KodeCycle = bi.KodeCycle AND k.KodePeternakan = bi.KodePeternakan
            LEFT JOIN DOC d ON d.KodeKandang = k.KodeKandang
            WHERE bi.KodePeternakan = :kodePeternakan
            ORDER BY bi.CreatedAt DESC
        `, {
            replacements: { kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(chains);
    } catch (error) {
        console.error('Get chains error:', error);
        res.status(500).json({ error: 'Failed to get chains' });
    }
});

// GET /api/blockchain/chains/:cycleId - Get chain detail
router.get('/chains/:cycleId', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const [chain] = await sequelize.query(`
            SELECT bi.*, c.TanggalMulai, c.DurasiCycle, c.SisaHariPanen
            FROM BlockchainIdentity bi
            LEFT JOIN Cycle c ON bi.KodeCycle = c.KodeCycle
            WHERE bi.KodeCycle = :cycleId AND bi.KodePeternakan = :kodePeternakan
        `, {
            replacements: { cycleId: req.params.cycleId, kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!chain) {
            return res.status(404).json({ error: 'Chain not found' });
        }

        res.json(chain);
    } catch (error) {
        console.error('Get chain error:', error);
        res.status(500).json({ error: 'Failed to get chain' });
    }
});

// GET /api/blockchain/blocks/:cycleId - Get all blocks for a cycle
router.get('/blocks/:cycleId', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const blocks = await sequelize.query(`
            SELECT lp.KodeBlock, lp.BlockIndex, lp.TipeBlock, lp.PreviousHash, lp.CurrentHash,
                   lp.DataPayload, lp.Nonce, lp.StatusBlock, lp.CreatedAt, lp.ValidatedAt,
                   lp.KodeKandang
            FROM ledger_peternakan lp
            WHERE lp.KodeCycle = :cycleId AND lp.KodePeternakan = :kodePeternakan
            ORDER BY lp.BlockIndex ASC
        `, {
            replacements: { cycleId: req.params.cycleId, kodePeternakan },
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

        res.json(parsedBlocks);
    } catch (error) {
        console.error('Get blocks error:', error);
        res.status(500).json({ error: 'Failed to get blocks' });
    }
});

// GET /api/blockchain/blocks/:cycleId/:blockIndex - Get specific block
router.get('/blocks/:cycleId/:blockIndex', async (req, res) => {
    try {
        const kodePeternakan = req.user.kodePeternakan;

        const [block] = await sequelize.query(`
            SELECT lp.*
            FROM ledger_peternakan lp
            WHERE lp.KodeCycle = :cycleId AND lp.BlockIndex = :blockIndex AND lp.KodePeternakan = :kodePeternakan
        `, {
            replacements: {
                cycleId: req.params.cycleId,
                blockIndex: req.params.blockIndex,
                kodePeternakan
            },
            type: sequelize.QueryTypes.SELECT
        });

        if (!block) {
            return res.status(404).json({ error: 'Block not found' });
        }

        let payload = block.DataPayload;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
        }

        res.json({ ...block, DataPayload: payload });
    } catch (error) {
        console.error('Get block error:', error);
        res.status(500).json({ error: 'Failed to get block' });
    }
});

// GET /api/blockchain/validate/:cycleId - Validate chain integrity
router.get('/validate/:cycleId', async (req, res) => {
    try {
        const result = await blockchain.validateChain(sequelize, req.params.cycleId);
        res.json(result);
    } catch (error) {
        console.error('Validate chain error:', error);
        res.status(500).json({ error: 'Failed to validate chain' });
    }
});

// GET /api/blockchain/trace/:cycleId - Full traceability data
router.get('/trace/:cycleId', async (req, res) => {
    try {
        const data = await blockchain.getTraceabilityData(sequelize, req.params.cycleId);
        if (!data) {
            return res.status(404).json({ error: 'Chain not found' });
        }
        res.json(data);
    } catch (error) {
        console.error('Trace error:', error);
        res.status(500).json({ error: 'Failed to get traceability data' });
    }
});

module.exports = router;
