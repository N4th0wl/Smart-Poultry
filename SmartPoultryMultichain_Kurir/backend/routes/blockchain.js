const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { LedgerKurir, BlockchainIdentity, Pengiriman, PerusahaanKurir, sequelize } = require('../models');
const { validateChain, getTraceabilityData, getCrossChainTraceability } = require('../utils/blockchainHelper');
const crossChain = require('../config/peternakanDatabase');

// GET /api/blockchain/chains - Get all blockchain chains for company
router.get('/chains', authMiddleware, async (req, res) => {
    try {
        const chains = await BlockchainIdentity.findAll({
            where: { KodePerusahaan: req.user.kodePerusahaan },
            include: [{ model: Pengiriman }],
            order: [['CreatedAt', 'DESC']]
        });
        res.json(chains);
    } catch (error) {
        console.error('Get chains error:', error);
        res.status(500).json({ error: 'Failed to get blockchain chains' });
    }
});

// GET /api/blockchain/ledger - Get all blocks for company
router.get('/ledger', adminMiddleware, async (req, res) => {
    try {
        const blocks = await LedgerKurir.findAll({
            where: { KodePerusahaan: req.user.kodePerusahaan },
            order: [['CreatedAt', 'DESC']],
            limit: 100
        });
        res.json(blocks);
    } catch (error) {
        console.error('Get ledger error:', error);
        res.status(500).json({ error: 'Failed to get ledger' });
    }
});

// GET /api/blockchain/trace/:kodePengiriman - Get full traceability for a shipment (kurir only)
router.get('/trace/:kodePengiriman', authMiddleware, async (req, res) => {
    try {
        const traceData = await getTraceabilityData(sequelize, req.params.kodePengiriman);

        if (!traceData) {
            return res.status(404).json({ error: 'No blockchain data found for this shipment' });
        }

        res.json(traceData);
    } catch (error) {
        console.error('Get traceability error:', error);
        res.status(500).json({ error: 'Failed to get traceability data' });
    }
});

// ============================================================================
// CROSS-CHAIN ENDPOINTS - Peternakan ↔ Kurir
// ============================================================================

// GET /api/blockchain/cross-chain/:kodePengiriman - Get unified cross-chain traceability
router.get('/cross-chain/:kodePengiriman', authMiddleware, async (req, res) => {
    try {
        const data = await getCrossChainTraceability(sequelize, req.params.kodePengiriman);

        if (!data) {
            return res.status(404).json({ error: 'No blockchain data found for this shipment' });
        }

        res.json(data);
    } catch (error) {
        console.error('Cross-chain traceability error:', error);
        res.status(500).json({ error: 'Failed to get cross-chain traceability data' });
    }
});

// GET /api/blockchain/upstream-chains - Get all available peternakan chains for linking
router.get('/upstream-chains', authMiddleware, async (req, res) => {
    try {
        const chains = await crossChain.getAllPeternakanChains();
        res.json(chains);
    } catch (error) {
        console.error('Get upstream chains error:', error);
        res.status(500).json({ error: 'Failed to get upstream chains' });
    }
});

// GET /api/blockchain/upstream-chain/:cycleId - Get specific peternakan chain data
router.get('/upstream-chain/:cycleId', authMiddleware, async (req, res) => {
    try {
        const data = await crossChain.getPeternakanBlockchainByCycle(parseInt(req.params.cycleId));

        if (!data) {
            return res.status(404).json({ error: 'Peternakan chain not found' });
        }

        // Also validate
        const validation = await crossChain.validatePeternakanChain(parseInt(req.params.cycleId));
        data.validation = validation;

        res.json(data);
    } catch (error) {
        console.error('Get upstream chain error:', error);
        res.status(500).json({ error: 'Failed to get upstream chain data' });
    }
});

// GET /api/blockchain/upstream-validate/:cycleId - Validate peternakan chain
router.get('/upstream-validate/:cycleId', authMiddleware, async (req, res) => {
    try {
        const result = await crossChain.validatePeternakanChain(parseInt(req.params.cycleId));
        res.json(result);
    } catch (error) {
        console.error('Validate upstream chain error:', error);
        res.status(500).json({ error: 'Failed to validate upstream chain' });
    }
});

// GET /api/blockchain/cross-chain-status - Check cross-chain connection status
router.get('/cross-chain-status', authMiddleware, async (req, res) => {
    try {
        const fullCrossChain = require('../config/crossChainDatabase');
        const peternakanConnected = await crossChain.testPeternakanConnection();
        const allStatus = await fullCrossChain.testAllConnections();
        res.json({
            crossChainEnabled: true,
            kurir: true, // Always connected (local)
            peternakan: peternakanConnected,
            peternakanDbConnected: peternakanConnected, // backward compat
            processor: allStatus.processor,
            retailer: allStatus.retailer,
            message: peternakanConnected
                ? 'Cross-chain connections active'
                : 'Some cross-chain connections unavailable'
        });
    } catch (error) {
        res.json({
            crossChainEnabled: false,
            peternakanDbConnected: false,
            processor: false,
            retailer: false,
            message: 'Cross-chain module error: ' + error.message
        });
    }
});

// ============================================================================
// UNIFIED CROSS-CHAIN VIEW
// ============================================================================

const fullCrossChain = require('../config/crossChainDatabase');

// GET /api/blockchain/unified-chain/:kodePengiriman - Get 5-segment unified chain view
router.get('/unified-chain/:kodePengiriman', authMiddleware, async (req, res) => {
    try {
        const data = await fullCrossChain.getUnifiedChainByPengiriman(sequelize, req.params.kodePengiriman);
        res.json(data);
    } catch (error) {
        console.error('Unified chain error:', error);
        res.status(500).json({ error: 'Failed to get unified chain data' });
    }
});

// ============================================================================
// EXISTING ENDPOINTS
// ============================================================================

// GET /api/blockchain/validate/:kodePengiriman - Validate chain for a shipment
router.get('/validate/:kodePengiriman', authMiddleware, async (req, res) => {
    try {
        const result = await validateChain(sequelize, req.params.kodePengiriman);
        res.json(result);
    } catch (error) {
        console.error('Validate chain error:', error);
        res.status(500).json({ error: 'Failed to validate chain' });
    }
});

// GET /api/blockchain/stats - Get blockchain statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const [totalChains] = await sequelize.query(
            `SELECT COUNT(*) as total FROM BlockchainIdentity WHERE KodePerusahaan = :kodePerusahaan`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        const [activeChains] = await sequelize.query(
            `SELECT COUNT(*) as total FROM BlockchainIdentity WHERE KodePerusahaan = :kodePerusahaan AND StatusChain = 'ACTIVE'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        const [completedChains] = await sequelize.query(
            `SELECT COUNT(*) as total FROM BlockchainIdentity WHERE KodePerusahaan = :kodePerusahaan AND StatusChain = 'COMPLETED'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        const [totalBlocks] = await sequelize.query(
            `SELECT COUNT(*) as total FROM ledger_kurir WHERE KodePerusahaan = :kodePerusahaan`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        // Count linked chains (with upstream connection)
        const [linkedChains] = await sequelize.query(
            `SELECT COUNT(*) as total FROM BlockchainIdentity WHERE KodePerusahaan = :kodePerusahaan AND UpstreamCycleId IS NOT NULL`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePerusahaan: req.user.kodePerusahaan } }
        );

        // Check cross-chain connection
        let crossChainActive = false;
        try {
            crossChainActive = await crossChain.testPeternakanConnection();
        } catch (e) { /* silent */ }

        res.json({
            totalChains: totalChains?.total || 0,
            activeChains: activeChains?.total || 0,
            completedChains: completedChains?.total || 0,
            totalBlocks: totalBlocks?.total || 0,
            linkedChains: linkedChains?.total || 0,
            crossChainActive
        });
    } catch (error) {
        console.error('Get blockchain stats error:', error);
        res.status(500).json({ error: 'Failed to get blockchain stats' });
    }
});

module.exports = router;
