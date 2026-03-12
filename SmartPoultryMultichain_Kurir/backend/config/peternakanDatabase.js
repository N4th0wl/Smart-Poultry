// ============================================================================
// CROSS-CHAIN DATABASE CONNECTION - Read-only access to Peternakan DB
// ============================================================================
// This connection allows the Kurir system to read blockchain data from the
// Peternakan (farm) database for cross-chain traceability and monitoring.
// ============================================================================

require('dotenv').config();
const { Sequelize } = require('sequelize');

let peternakanSequelize = null;

function getPeternakanConnection() {
    if (peternakanSequelize) return peternakanSequelize;

    const dbName = process.env.PETERNAKAN_DB_NAME || 'smartpoultry_peternakan';
    const dbUser = process.env.PETERNAKAN_DB_USER || 'root';
    const dbPassword = process.env.PETERNAKAN_DB_PASSWORD || '';
    const dbHost = process.env.PETERNAKAN_DB_HOST || 'localhost';
    const dbPort = process.env.PETERNAKAN_DB_PORT || 3306;

    peternakanSequelize = new Sequelize(dbName, dbUser, dbPassword, {
        host: dbHost,
        port: dbPort,
        dialect: 'mysql',
        timezone: '+07:00',
        logging: false, // Silent for cross-chain queries
        pool: {
            max: 3, // Small pool - read-only access
            min: 0,
            acquire: 15000,
            idle: 10000
        },
        define: {
            timestamps: false,
            freezeTableName: true
        }
    });

    return peternakanSequelize;
}

/**
 * Test the cross-chain connection
 */
async function testPeternakanConnection() {
    try {
        const conn = getPeternakanConnection();
        await conn.authenticate();
        console.log('✅ Cross-chain: Peternakan DB connected (read-only)');
        return true;
    } catch (error) {
        console.warn('⚠️ Cross-chain: Peternakan DB not available -', error.message);
        return false;
    }
}

/**
 * Get blockchain data from Peternakan for a given cycle
 */
async function getPeternakanBlockchainByCycle(kodeCycle) {
    try {
        const conn = getPeternakanConnection();

        // Get chain identity
        const [identity] = await conn.query(
            `SELECT bi.*, p.NamaPeternakan, p.LokasiPeternakan 
             FROM BlockchainIdentity bi 
             JOIN Peternakan p ON bi.KodePeternakan = p.KodePeternakan 
             WHERE bi.KodeCycle = :kodeCycle`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
        );

        if (!identity) return null;

        // Get all blocks
        const blocks = await conn.query(
            `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash, 
                    DataPayload, StatusBlock, CreatedAt, ValidatedAt, KodeKandang
             FROM ledger_peternakan 
             WHERE KodeCycle = :kodeCycle 
             ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
        );

        // Parse DataPayload
        const parsedBlocks = blocks.map(b => {
            let payload = b.DataPayload;
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
            }
            return { ...b, DataPayload: payload };
        });

        return {
            chain: {
                kodeIdentity: identity.KodeIdentity,
                kodeCycle: identity.KodeCycle,
                kodePeternakan: identity.KodePeternakan,
                peternakan: identity.NamaPeternakan,
                lokasi: identity.LokasiPeternakan,
                genesisHash: identity.GenesisHash,
                latestBlockHash: identity.LatestBlockHash,
                statusChain: identity.StatusChain,
                totalBlocks: identity.TotalBlocks,
                createdAt: identity.CreatedAt,
                completedAt: identity.CompletedAt
            },
            blocks: parsedBlocks,
            nodeType: 'NODE_PETERNAKAN',
            nodeDescription: 'Farm / Peternakan (Origin Node)'
        };
    } catch (error) {
        console.error('Cross-chain query error (peternakan):', error.message);
        return null;
    }
}

/**
 * Get the latest block hash from a Peternakan cycle (for chain linking)
 */
async function getPeternakanLatestHash(kodeCycle) {
    try {
        const conn = getPeternakanConnection();
        const [result] = await conn.query(
            `SELECT CurrentHash, BlockIndex, TipeBlock FROM ledger_peternakan 
             WHERE KodeCycle = :kodeCycle 
             ORDER BY BlockIndex DESC LIMIT 1`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
        );
        return result || null;
    } catch (error) {
        console.error('Cross-chain hash query error:', error.message);
        return null;
    }
}

/**
 * Search for a cycle by pengiriman reference in Peternakan DB
 * This looks at the Pengiriman table in peternakan to find which cycle the shipment belongs to
 */
async function findPeternakanCycleByPengiriman(kodePengirimanPeternakan) {
    try {
        const conn = getPeternakanConnection();
        const [result] = await conn.query(
            `SELECT pg.KodePengiriman, pg.KodePanen, pg.KodeKandang,
                    k.KodeCycle, k.KodePeternakan,
                    p.NamaPeternakan
             FROM Pengiriman pg
             JOIN Kandang k ON pg.KodeKandang = k.KodeKandang
             JOIN Peternakan p ON k.KodePeternakan = p.KodePeternakan
             WHERE pg.KodePengiriman = :kode`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kode: kodePengirimanPeternakan } }
        );
        return result || null;
    } catch (error) {
        console.error('Cross-chain pengiriman lookup error:', error.message);
        return null;
    }
}

/**
 * Get all available peternakan chains (for linking UI)
 */
async function getAllPeternakanChains() {
    try {
        const conn = getPeternakanConnection();
        const chains = await conn.query(
            `SELECT bi.KodeIdentity, bi.KodeCycle, bi.KodePeternakan,
                    bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks, 
                    bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                    p.NamaPeternakan, p.LokasiPeternakan,
                    (SELECT COUNT(*) FROM ledger_peternakan lp WHERE lp.KodeCycle = bi.KodeCycle) AS ActualBlockCount
             FROM BlockchainIdentity bi
             JOIN Peternakan p ON bi.KodePeternakan = p.KodePeternakan
             WHERE bi.StatusChain IN ('COMPLETED', 'TRANSFERRED', 'ACTIVE')
             ORDER BY bi.CreatedAt DESC`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        return chains;
    } catch (error) {
        console.error('Cross-chain list chains error:', error.message);
        return [];
    }
}

/**
 * Validate the peternakan chain integrity (read-only verification)
 */
async function validatePeternakanChain(kodeCycle) {
    try {
        const conn = getPeternakanConnection();
        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash, TipeBlock
             FROM ledger_peternakan 
             WHERE KodeCycle = :kodeCycle 
             ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
        );

        if (blocks.length === 0) {
            return { valid: false, message: 'No blocks found in peternakan chain', totalBlocks: 0 };
        }

        const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
        let expectedPrevHash = GENESIS_PREV_HASH;

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (block.PreviousHash !== expectedPrevHash) {
                return {
                    valid: false,
                    message: `Peternakan chain broken at block ${i}`,
                    blockIndex: i,
                    totalBlocks: blocks.length
                };
            }
            expectedPrevHash = block.CurrentHash;
        }

        return { valid: true, message: 'Peternakan chain integrity verified ✓', totalBlocks: blocks.length };
    } catch (error) {
        console.error('Cross-chain validation error:', error.message);
        return { valid: false, message: 'Cannot connect to peternakan database', totalBlocks: 0 };
    }
}

module.exports = {
    getPeternakanConnection,
    testPeternakanConnection,
    getPeternakanBlockchainByCycle,
    getPeternakanLatestHash,
    findPeternakanCycleByPengiriman,
    getAllPeternakanChains,
    validatePeternakanChain
};
