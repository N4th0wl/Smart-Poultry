// ============================================================================
// CROSS-CHAIN DATABASE CONNECTIONS - Read-only access to Kurir, Processor & Retailer DBs
// ============================================================================
// This module allows the Peternakan admin to read blockchain data from
// the Kurir, Processor, and Retailer databases for unified monitoring.
// ============================================================================

require('dotenv').config();
const { Sequelize } = require('sequelize');

let kurirSequelize = null;
let processorSequelize = null;
let retailerSequelize = null;

// ============================================================================
// CONNECTION HELPERS
// ============================================================================

function getKurirConnection() {
    if (kurirSequelize) return kurirSequelize;

    kurirSequelize = new Sequelize(
        process.env.KURIR_DB_NAME || 'smartpoultry_kurir',
        process.env.KURIR_DB_USER || 'root',
        process.env.KURIR_DB_PASSWORD || '',
        {
            host: process.env.KURIR_DB_HOST || 'localhost',
            port: process.env.KURIR_DB_PORT || 3306,
            dialect: 'mysql',
            timezone: '+07:00',
            logging: false,
            pool: { max: 3, min: 0, acquire: 15000, idle: 10000 },
            define: { timestamps: false, freezeTableName: true }
        }
    );

    return kurirSequelize;
}

function getProcessorConnection() {
    if (processorSequelize) return processorSequelize;

    processorSequelize = new Sequelize(
        process.env.PROCESSOR_DB_NAME || 'smartpoultry_processor',
        process.env.PROCESSOR_DB_USER || 'root',
        process.env.PROCESSOR_DB_PASSWORD || '',
        {
            host: process.env.PROCESSOR_DB_HOST || 'localhost',
            port: process.env.PROCESSOR_DB_PORT || 3306,
            dialect: 'mysql',
            timezone: '+07:00',
            logging: false,
            pool: { max: 3, min: 0, acquire: 15000, idle: 10000 },
            define: { timestamps: false, freezeTableName: true }
        }
    );

    return processorSequelize;
}

function getRetailerConnection() {
    if (retailerSequelize) return retailerSequelize;

    retailerSequelize = new Sequelize(
        process.env.RETAILER_DB_NAME || 'smartpoultry_retailer',
        process.env.RETAILER_DB_USER || 'root',
        process.env.RETAILER_DB_PASSWORD || '',
        {
            host: process.env.RETAILER_DB_HOST || 'localhost',
            port: process.env.RETAILER_DB_PORT || 3306,
            dialect: 'mysql',
            timezone: '+07:00',
            logging: false,
            pool: { max: 3, min: 0, acquire: 15000, idle: 10000 },
            define: { timestamps: false, freezeTableName: true }
        }
    );

    return retailerSequelize;
}

// ============================================================================
// CONNECTION TEST
// ============================================================================

async function testKurirConnection() {
    try {
        const conn = getKurirConnection();
        await conn.authenticate();
        return true;
    } catch (error) {
        console.warn('⚠️ Cross-chain: Kurir DB not available -', error.message);
        return false;
    }
}

async function testProcessorConnection() {
    try {
        const conn = getProcessorConnection();
        await conn.authenticate();
        return true;
    } catch (error) {
        console.warn('⚠️ Cross-chain: Processor DB not available -', error.message);
        return false;
    }
}

async function testRetailerConnection() {
    try {
        const conn = getRetailerConnection();
        await conn.authenticate();
        return true;
    } catch (error) {
        console.warn('⚠️ Cross-chain: Retailer DB not available -', error.message);
        return false;
    }
}

async function testAllConnections() {
    const [kurir, processor, retailer] = await Promise.all([
        testKurirConnection(),
        testProcessorConnection(),
        testRetailerConnection()
    ]);
    return { kurir, processor, retailer };
}

// ============================================================================
// KURIR BLOCKCHAIN DATA
// ============================================================================

/**
 * Get all blockchain chains from Kurir system
 */
async function getAllKurirChains() {
    try {
        const conn = getKurirConnection();
        const chains = await conn.query(
            `SELECT bi.KodeIdentity, bi.KodePerusahaan, bi.KodePengiriman,
                    bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                    bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                    bi.UpstreamChainHash, bi.UpstreamNodeType, bi.UpstreamCycleId,
                    pk.NamaPerusahaan, pk.AlamatPerusahaan,
                    p.AsalPengirim, p.TujuanPenerima, p.StatusPengiriman, p.TipePengiriman,
                    (SELECT COUNT(*) FROM ledger_kurir lk WHERE lk.KodePengiriman = bi.KodePengiriman) AS ActualBlockCount
             FROM BlockchainIdentity bi
             LEFT JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan
             LEFT JOIN Pengiriman p ON bi.KodePengiriman = p.KodePengiriman
             ORDER BY bi.CreatedAt DESC`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        return chains;
    } catch (error) {
        console.error('Cross-chain: Failed to get Kurir chains -', error.message);
        return [];
    }
}

/**
 * Get blocks for a specific Kurir shipment chain
 */
async function getKurirBlocks(kodePengiriman) {
    try {
        const conn = getKurirConnection();
        const blocks = await conn.query(
            `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt, KodePengiriman
             FROM ledger_kurir
             WHERE KodePengiriman = :kodePengiriman
             ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
        );

        return blocks.map(b => {
            let payload = b.DataPayload;
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
            }
            return { ...b, DataPayload: payload };
        });
    } catch (error) {
        console.error('Cross-chain: Failed to get Kurir blocks -', error.message);
        return [];
    }
}

/**
 * Validate Kurir chain integrity
 */
async function validateKurirChain(kodePengiriman) {
    try {
        const conn = getKurirConnection();
        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash, TipeBlock
             FROM ledger_kurir
             WHERE KodePengiriman = :kodePengiriman
             ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
        );

        if (blocks.length === 0) {
            return { valid: false, message: 'No blocks found in Kurir chain', totalBlocks: 0 };
        }

        const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
        let expectedPrevHash = GENESIS_PREV_HASH;

        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].PreviousHash !== expectedPrevHash) {
                return {
                    valid: false,
                    message: `Kurir chain broken at block ${i}`,
                    blockIndex: i,
                    totalBlocks: blocks.length
                };
            }
            expectedPrevHash = blocks[i].CurrentHash;
        }

        return { valid: true, message: 'Kurir chain integrity verified ✓', totalBlocks: blocks.length };
    } catch (error) {
        console.error('Cross-chain: Kurir validation error -', error.message);
        return { valid: false, message: 'Cannot connect to Kurir database', totalBlocks: 0 };
    }
}

// ============================================================================
// PROCESSOR BLOCKCHAIN DATA
// ============================================================================

/**
 * Get all blockchain chains from Processor system
 */
async function getAllProcessorChains() {
    try {
        const conn = getProcessorConnection();
        const chains = await conn.query(
            `SELECT bi.IdIdentity, bi.KodeIdentity, bi.IdOrder,
                    bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                    bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                    bi.KodeCycleFarm, bi.KodePeternakan, bi.FarmLastBlockHash,
                    o.KodeOrder, o.NamaPeternakan, o.JenisAyam, o.TanggalOrder,
                    (SELECT COUNT(*) FROM ledger_processor lp WHERE lp.IdIdentity = bi.IdIdentity) AS ActualBlockCount
             FROM blockchainidentity bi
             LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
             ORDER BY bi.CreatedAt DESC`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        return chains;
    } catch (error) {
        console.error('Cross-chain: Failed to get Processor chains -', error.message);
        return [];
    }
}

/**
 * Get blocks for a specific Processor chain
 */
async function getProcessorBlocks(idIdentity) {
    try {
        const conn = getProcessorConnection();
        const blocks = await conn.query(
            `SELECT IdBlock, KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt
             FROM ledger_processor
             WHERE IdIdentity = :idIdentity
             ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        return blocks.map(b => {
            let payload = b.DataPayload;
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
            }
            return { ...b, DataPayload: payload };
        });
    } catch (error) {
        console.error('Cross-chain: Failed to get Processor blocks -', error.message);
        return [];
    }
}

/**
 * Validate Processor chain integrity
 */
async function validateProcessorChain(idIdentity) {
    try {
        const conn = getProcessorConnection();
        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash, TipeBlock
             FROM ledger_processor
             WHERE IdIdentity = :idIdentity
             ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        if (blocks.length === 0) {
            return { valid: false, message: 'No blocks found in Processor chain', totalBlocks: 0 };
        }

        const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
        let expectedPrevHash = GENESIS_PREV_HASH;

        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].PreviousHash !== expectedPrevHash) {
                return {
                    valid: false,
                    message: `Processor chain broken at block ${i}`,
                    blockIndex: i,
                    totalBlocks: blocks.length
                };
            }
            expectedPrevHash = blocks[i].CurrentHash;
        }

        return { valid: true, message: 'Processor chain integrity verified ✓', totalBlocks: blocks.length };
    } catch (error) {
        console.error('Cross-chain: Processor validation error -', error.message);
        return { valid: false, message: 'Cannot connect to Processor database', totalBlocks: 0 };
    }
}

// ============================================================================
// RETAILER BLOCKCHAIN DATA
// ============================================================================

/**
 * Get all blockchain chains from Retailer system
 */
async function getAllRetailerChains() {
    try {
        const conn = getRetailerConnection();
        const chains = await conn.query(
            `SELECT bi.IdIdentity, bi.KodeIdentity, bi.IdOrder, bi.IdRetailer,
                    bi.KodeProcessor, bi.KodeOrderProcessor, bi.ProcessorLastBlockHash,
                    bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                    bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                    o.KodeOrder, o.NamaProcessor, o.NamaProduk, o.TanggalOrder,
                    r.NamaRetailer, r.AlamatRetailer,
                    (SELECT COUNT(*) FROM ledger_retailer lr WHERE lr.IdIdentity = bi.IdIdentity) AS ActualBlockCount
             FROM blockchainidentity bi
             LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
             LEFT JOIN retailer r ON bi.IdRetailer = r.IdRetailer
             ORDER BY bi.CreatedAt DESC`,
            { type: Sequelize.QueryTypes.SELECT }
        );
        return chains;
    } catch (error) {
        console.error('Cross-chain: Failed to get Retailer chains -', error.message);
        return [];
    }
}

/**
 * Get blocks for a specific Retailer chain
 */
async function getRetailerBlocks(idIdentity) {
    try {
        const conn = getRetailerConnection();
        const blocks = await conn.query(
            `SELECT IdBlock, KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt
             FROM ledger_retailer
             WHERE IdIdentity = :idIdentity
             ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        return blocks.map(b => {
            let payload = b.DataPayload;
            if (typeof payload === 'string') {
                try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
            }
            return { ...b, DataPayload: payload };
        });
    } catch (error) {
        console.error('Cross-chain: Failed to get Retailer blocks -', error.message);
        return [];
    }
}

/**
 * Validate Retailer chain integrity
 */
async function validateRetailerChain(idIdentity) {
    try {
        const conn = getRetailerConnection();
        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash, TipeBlock
             FROM ledger_retailer
             WHERE IdIdentity = :idIdentity
             ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        if (blocks.length === 0) {
            return { valid: false, message: 'No blocks found in Retailer chain', totalBlocks: 0 };
        }

        const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
        let expectedPrevHash = GENESIS_PREV_HASH;

        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].PreviousHash !== expectedPrevHash) {
                return {
                    valid: false,
                    message: `Retailer chain broken at block ${i}`,
                    blockIndex: i,
                    totalBlocks: blocks.length
                };
            }
            expectedPrevHash = blocks[i].CurrentHash;
        }

        return { valid: true, message: 'Retailer chain integrity verified ✓', totalBlocks: blocks.length };
    } catch (error) {
        console.error('Cross-chain: Retailer validation error -', error.message);
        return { valid: false, message: 'Cannot connect to Retailer database', totalBlocks: 0 };
    }
}

// ============================================================================
// UNIFIED CROSS-CHAIN VIEW
// Full supply chain: Peternakan → Kurir Leg 1 → Processor → Kurir Leg 2 → Retailer
// ============================================================================

/**
 * Get unified supply chain traceability for a given cycle.
 * Traces the complete 5-segment path:
 *   1. Peternakan (farm) blocks
 *   2. Kurir Leg 1 (FARM_TO_PROCESSOR) blocks
 *   3. Processor blocks
 *   4. Kurir Leg 2 (PROCESSOR_TO_RETAILER) blocks
 *   5. Retailer blocks
 */
async function getUnifiedChainByCycle(sequelizePeternakan, kodeCycle) {
    const result = {
        peternakanChain: null,
        kurirLeg1Chain: null,    // Kurir: Farm → Processor
        processorChain: null,
        kurirLeg2Chain: null,    // Kurir: Processor → Retailer
        retailerChain: null,     // Retailer: actual blockchain data
        unifiedTimeline: [],
        supplyChainNodes: [],
        connectionStatus: { kurir: false, processor: false, retailer: false }
    };

    // ── SEGMENT 1: Peternakan chain (local DB) ──
    try {
        const [identity] = await sequelizePeternakan.query(
            `SELECT bi.*, p.NamaPeternakan, p.LokasiPeternakan
             FROM BlockchainIdentity bi
             JOIN Peternakan p ON bi.KodePeternakan = p.KodePeternakan
             WHERE bi.KodeCycle = :kodeCycle`,
            { type: sequelizePeternakan.QueryTypes.SELECT, replacements: { kodeCycle } }
        );

        if (identity) {
            const blocks = await sequelizePeternakan.query(
                `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                        DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt, KodeKandang
                 FROM ledger_peternakan
                 WHERE KodeCycle = :kodeCycle
                 ORDER BY BlockIndex ASC`,
                { type: sequelizePeternakan.QueryTypes.SELECT, replacements: { kodeCycle } }
            );

            const parsedBlocks = blocks.map(b => {
                let payload = b.DataPayload;
                if (typeof payload === 'string') {
                    try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
                }
                return { ...b, DataPayload: payload };
            });

            result.peternakanChain = {
                identity: {
                    kodeIdentity: identity.KodeIdentity,
                    kodePeternakan: identity.KodePeternakan,
                    kodeCycle: identity.KodeCycle,
                    namaPeternakan: identity.NamaPeternakan,
                    lokasi: identity.LokasiPeternakan,
                    statusChain: identity.StatusChain,
                    totalBlocks: identity.TotalBlocks,
                    genesisHash: identity.GenesisHash,
                    latestBlockHash: identity.LatestBlockHash,
                    createdAt: identity.CreatedAt
                },
                blocks: parsedBlocks
            };
        }
    } catch (error) {
        console.error('Unified chain: Peternakan error -', error.message);
    }

    // ── SEGMENT 2: Kurir Leg 1 — Farm to Processor (cross-DB) ──
    try {
        result.connectionStatus.kurir = await testKurirConnection();
        if (result.connectionStatus.kurir) {
            const conn = getKurirConnection();

            // Find Kurir chains linked to this cycle with FARM_TO_PROCESSOR type
            const kurirChains = await conn.query(
                `SELECT bi.*, pk.NamaPerusahaan, pk.AlamatPerusahaan,
                        p.AsalPengirim, p.TujuanPenerima, p.TipePengiriman, p.KodePengiriman AS PengKode
                 FROM BlockchainIdentity bi
                 LEFT JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan
                 LEFT JOIN Pengiriman p ON bi.KodePengiriman = p.KodePengiriman
                 WHERE bi.UpstreamCycleId = :kodeCycle
                   AND (p.TipePengiriman = 'FARM_TO_PROCESSOR' OR p.TipePengiriman IS NULL)
                 ORDER BY bi.CreatedAt ASC`,
                { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
            );

            if (kurirChains.length > 0) {
                const kurirChain = kurirChains[0];
                const kurirBlocks = await getKurirBlocks(kurirChain.KodePengiriman);
                const kurirValidation = await validateKurirChain(kurirChain.KodePengiriman);

                result.kurirLeg1Chain = {
                    leg: 1,
                    tipePengiriman: 'FARM_TO_PROCESSOR',
                    identity: {
                        kodeIdentity: kurirChain.KodeIdentity,
                        kodePengiriman: kurirChain.KodePengiriman,
                        namaPerusahaan: kurirChain.NamaPerusahaan,
                        alamat: kurirChain.AlamatPerusahaan,
                        statusChain: kurirChain.StatusChain,
                        totalBlocks: kurirChain.TotalBlocks,
                        genesisHash: kurirChain.GenesisHash,
                        latestBlockHash: kurirChain.LatestBlockHash,
                        upstreamChainHash: kurirChain.UpstreamChainHash,
                        upstreamCycleId: kurirChain.UpstreamCycleId,
                        asalPengirim: kurirChain.AsalPengirim,
                        tujuanPenerima: kurirChain.TujuanPenerima,
                        createdAt: kurirChain.CreatedAt
                    },
                    blocks: kurirBlocks,
                    validation: kurirValidation
                };
            }
        }
    } catch (error) {
        console.error('Unified chain: Kurir Leg 1 error -', error.message);
    }

    // ── SEGMENT 3: Processor chain (cross-DB) ──
    try {
        result.connectionStatus.processor = await testProcessorConnection();
        if (result.connectionStatus.processor) {
            const conn = getProcessorConnection();

            // Primary: find by KodeCycleFarm (precise link)
            let processorChains = await conn.query(
                `SELECT bi.IdIdentity, bi.KodeIdentity, bi.IdOrder,
                        bi.KodePeternakan, bi.KodeCycleFarm, bi.FarmLastBlockHash,
                        bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                        bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                        o.KodeOrder, o.NamaPeternakan, o.JenisAyam
                 FROM blockchainidentity bi
                 LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
                 WHERE bi.KodeCycleFarm = :kodeCycle
                 ORDER BY bi.CreatedAt ASC
                 LIMIT 5`,
                { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
            );

            // Fallback: find by NamaPeternakan if KodeCycleFarm didn't match
            if (processorChains.length === 0 && result.peternakanChain) {
                processorChains = await conn.query(
                    `SELECT bi.IdIdentity, bi.KodeIdentity, bi.IdOrder,
                            bi.KodePeternakan, bi.KodeCycleFarm, bi.FarmLastBlockHash,
                            bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                            bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                            o.KodeOrder, o.NamaPeternakan, o.JenisAyam
                     FROM blockchainidentity bi
                     LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
                     WHERE o.NamaPeternakan = :namaPeternakan
                     ORDER BY bi.CreatedAt DESC
                     LIMIT 5`,
                    {
                        type: Sequelize.QueryTypes.SELECT,
                        replacements: { namaPeternakan: result.peternakanChain.identity.namaPeternakan }
                    }
                );
            }

            if (processorChains.length > 0) {
                const procChain = processorChains[0];
                const procBlocks = await getProcessorBlocks(procChain.IdIdentity);
                const procValidation = await validateProcessorChain(procChain.IdIdentity);

                result.processorChain = {
                    identity: {
                        idIdentity: procChain.IdIdentity,
                        kodeIdentity: procChain.KodeIdentity,
                        kodeOrder: procChain.KodeOrder,
                        kodeCycleFarm: procChain.KodeCycleFarm,
                        kodePeternakan: procChain.KodePeternakan,
                        farmLastBlockHash: procChain.FarmLastBlockHash,
                        namaPeternakan: procChain.NamaPeternakan,
                        jenisAyam: procChain.JenisAyam,
                        statusChain: procChain.StatusChain,
                        totalBlocks: procChain.TotalBlocks,
                        genesisHash: procChain.GenesisHash,
                        latestBlockHash: procChain.LatestBlockHash,
                        createdAt: procChain.CreatedAt,
                        completedAt: procChain.CompletedAt
                    },
                    blocks: procBlocks,
                    validation: procValidation
                };
            }
        }
    } catch (error) {
        console.error('Unified chain: Processor error -', error.message);
    }

    // ── SEGMENT 4: Kurir Leg 2 — Processor to Retailer (cross-DB) ──
    try {
        if (result.connectionStatus.kurir && result.processorChain) {
            const conn = getKurirConnection();

            // Find Kurir chains with PROCESSOR_TO_RETAILER type
            // linked via the Processor's company/order name
            const processorName = result.processorChain.identity.namaPeternakan;
            const kodeOrder = result.processorChain.identity.kodeOrder;

            const kurirLeg2Chains = await conn.query(
                `SELECT bi.*, pk.NamaPerusahaan, pk.AlamatPerusahaan,
                        p.AsalPengirim, p.TujuanPenerima, p.TipePengiriman,
                        p.ReferensiEksternal
                 FROM BlockchainIdentity bi
                 LEFT JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan
                 LEFT JOIN Pengiriman p ON bi.KodePengiriman = p.KodePengiriman
                 WHERE p.TipePengiriman = 'PROCESSOR_TO_RETAILER'
                   AND (p.ReferensiEksternal = :kodeOrder
                        OR p.AsalPengirim LIKE :processorLike)
                 ORDER BY bi.CreatedAt ASC
                 LIMIT 3`,
                {
                    type: Sequelize.QueryTypes.SELECT,
                    replacements: {
                        kodeOrder: kodeOrder || '',
                        processorLike: `%${processorName || ''}%`
                    }
                }
            );

            if (kurirLeg2Chains.length > 0) {
                const leg2Chain = kurirLeg2Chains[0];
                const leg2Blocks = await getKurirBlocks(leg2Chain.KodePengiriman);
                const leg2Validation = await validateKurirChain(leg2Chain.KodePengiriman);

                result.kurirLeg2Chain = {
                    leg: 2,
                    tipePengiriman: 'PROCESSOR_TO_RETAILER',
                    identity: {
                        kodeIdentity: leg2Chain.KodeIdentity,
                        kodePengiriman: leg2Chain.KodePengiriman,
                        namaPerusahaan: leg2Chain.NamaPerusahaan,
                        alamat: leg2Chain.AlamatPerusahaan,
                        statusChain: leg2Chain.StatusChain,
                        totalBlocks: leg2Chain.TotalBlocks,
                        genesisHash: leg2Chain.GenesisHash,
                        latestBlockHash: leg2Chain.LatestBlockHash,
                        asalPengirim: leg2Chain.AsalPengirim,
                        tujuanPenerima: leg2Chain.TujuanPenerima,
                        createdAt: leg2Chain.CreatedAt
                    },
                    blocks: leg2Blocks,
                    validation: leg2Validation
                };
            }
        }
    } catch (error) {
        console.error('Unified chain: Kurir Leg 2 error -', error.message);
    }

    // ── SEGMENT 5: Retailer chain (cross-DB) ──
    try {
        result.connectionStatus.retailer = await testRetailerConnection();
        if (result.connectionStatus.retailer) {
            const conn = getRetailerConnection();

            // Try to find Retailer chain linked to the Processor's order
            let retailerChains = [];

            if (result.processorChain) {
                const kodeOrder = result.processorChain.identity.kodeOrder;

                // Method 1: Find by KodeOrderProcessor matching processor's order code
                if (kodeOrder) {
                    retailerChains = await conn.query(
                        `SELECT bi.IdIdentity, bi.KodeIdentity, bi.IdOrder, bi.IdRetailer,
                                bi.KodeProcessor, bi.KodeOrderProcessor, bi.ProcessorLastBlockHash,
                                bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                                bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                                o.KodeOrder, o.NamaProcessor, o.NamaProduk,
                                r.NamaRetailer, r.AlamatRetailer
                         FROM blockchainidentity bi
                         LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
                         LEFT JOIN retailer r ON bi.IdRetailer = r.IdRetailer
                         WHERE bi.KodeOrderProcessor = :kodeOrder
                         ORDER BY bi.CreatedAt ASC
                         LIMIT 5`,
                        { type: Sequelize.QueryTypes.SELECT, replacements: { kodeOrder } }
                    );
                }

                // Method 2: Fallback - find by NamaProcessor containing processor's peternakan name
                if (retailerChains.length === 0) {
                    const processorName = result.processorChain.identity.namaPeternakan;
                    if (processorName) {
                        retailerChains = await conn.query(
                            `SELECT bi.IdIdentity, bi.KodeIdentity, bi.IdOrder, bi.IdRetailer,
                                    bi.KodeProcessor, bi.KodeOrderProcessor, bi.ProcessorLastBlockHash,
                                    bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                                    bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                                    o.KodeOrder, o.NamaProcessor, o.NamaProduk,
                                    r.NamaRetailer, r.AlamatRetailer
                             FROM blockchainidentity bi
                             LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
                             LEFT JOIN retailer r ON bi.IdRetailer = r.IdRetailer
                             WHERE o.NamaProcessor LIKE :processorLike
                             ORDER BY bi.CreatedAt DESC
                             LIMIT 5`,
                            {
                                type: Sequelize.QueryTypes.SELECT,
                                replacements: { processorLike: `%${processorName}%` }
                            }
                        );
                    }
                }
            }

            // Method 3: If Kurir Leg 2 delivery was to a known retailer, try matching by retailer name
            if (retailerChains.length === 0 && result.kurirLeg2Chain) {
                const tujuan = result.kurirLeg2Chain.identity.tujuanPenerima;
                if (tujuan) {
                    retailerChains = await conn.query(
                        `SELECT bi.IdIdentity, bi.KodeIdentity, bi.IdOrder, bi.IdRetailer,
                                bi.KodeProcessor, bi.KodeOrderProcessor, bi.ProcessorLastBlockHash,
                                bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                                bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                                o.KodeOrder, o.NamaProcessor, o.NamaProduk,
                                r.NamaRetailer, r.AlamatRetailer
                         FROM blockchainidentity bi
                         LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
                         LEFT JOIN retailer r ON bi.IdRetailer = r.IdRetailer
                         WHERE r.NamaRetailer LIKE :retailerLike
                         ORDER BY bi.CreatedAt DESC
                         LIMIT 5`,
                        {
                            type: Sequelize.QueryTypes.SELECT,
                            replacements: { retailerLike: `%${tujuan}%` }
                        }
                    );
                }
            }

            if (retailerChains.length > 0) {
                const retChain = retailerChains[0];
                const retBlocks = await getRetailerBlocks(retChain.IdIdentity);
                const retValidation = await validateRetailerChain(retChain.IdIdentity);

                result.retailerChain = {
                    identity: {
                        idIdentity: retChain.IdIdentity,
                        kodeIdentity: retChain.KodeIdentity,
                        kodeOrder: retChain.KodeOrder,
                        namaProcessor: retChain.NamaProcessor,
                        namaProduk: retChain.NamaProduk,
                        namaRetailer: retChain.NamaRetailer,
                        alamatRetailer: retChain.AlamatRetailer,
                        kodeOrderProcessor: retChain.KodeOrderProcessor,
                        processorLastBlockHash: retChain.ProcessorLastBlockHash,
                        statusChain: retChain.StatusChain,
                        totalBlocks: retChain.TotalBlocks,
                        genesisHash: retChain.GenesisHash,
                        latestBlockHash: retChain.LatestBlockHash,
                        createdAt: retChain.CreatedAt,
                        completedAt: retChain.CompletedAt
                    },
                    blocks: retBlocks,
                    validation: retValidation
                };
            }
        }
    } catch (error) {
        console.error('Unified chain: Retailer error -', error.message);
    }

    // ── BUILD UNIFIED TIMELINE (ordered by supply chain segment, not timestamp) ──
    let unifiedIndex = 0;

    // Segment 1: Peternakan blocks
    if (result.peternakanChain) {
        result.peternakanChain.blocks.forEach(b => {
            result.unifiedTimeline.push({
                node: 'NODE_PETERNAKAN',
                nodeLabel: '🏗️ Peternakan',
                nodeColor: '#10b981',
                segment: 1,
                segmentLabel: 'Peternakan',
                ...b,
                timestamp: b.CreatedAt,
                unifiedIndex: unifiedIndex++
            });
        });
    }

    // Segment 2: Kurir Leg 1 blocks
    if (result.kurirLeg1Chain) {
        result.kurirLeg1Chain.blocks.forEach(b => {
            result.unifiedTimeline.push({
                node: 'NODE_KURIR',
                nodeLabel: '🚛 Kurir (Farm → Processor)',
                nodeColor: '#f59e0b',
                segment: 2,
                segmentLabel: 'Pengiriman ke Processor',
                kurirLeg: 1,
                ...b,
                timestamp: b.CreatedAt,
                unifiedIndex: unifiedIndex++
            });
        });
    }

    // Segment 3: Processor blocks
    if (result.processorChain) {
        result.processorChain.blocks.forEach(b => {
            result.unifiedTimeline.push({
                node: 'NODE_PROCESSOR',
                nodeLabel: '🏭 Processor',
                nodeColor: '#8b5cf6',
                segment: 3,
                segmentLabel: 'Processing',
                ...b,
                timestamp: b.CreatedAt,
                unifiedIndex: unifiedIndex++
            });
        });
    }

    // Segment 4: Kurir Leg 2 blocks
    if (result.kurirLeg2Chain) {
        result.kurirLeg2Chain.blocks.forEach(b => {
            result.unifiedTimeline.push({
                node: 'NODE_KURIR',
                nodeLabel: '🚛 Kurir (Processor → Retailer)',
                nodeColor: '#f59e0b',
                segment: 4,
                segmentLabel: 'Pengiriman ke Retailer',
                kurirLeg: 2,
                ...b,
                timestamp: b.CreatedAt,
                unifiedIndex: unifiedIndex++
            });
        });
    }

    // Segment 5: Retailer blocks
    if (result.retailerChain) {
        result.retailerChain.blocks.forEach(b => {
            result.unifiedTimeline.push({
                node: 'NODE_RETAILER',
                nodeLabel: '🏪 Retailer',
                nodeColor: '#ec4899',
                segment: 5,
                segmentLabel: 'Retailer',
                ...b,
                timestamp: b.CreatedAt,
                unifiedIndex: unifiedIndex++
            });
        });
    }

    // ── BUILD SUPPLY CHAIN NODES (5 segments) ──
    // 1. Peternakan
    if (result.peternakanChain) {
        result.supplyChainNodes.push({
            node: 'NODE_PETERNAKAN',
            label: 'Peternakan',
            icon: '🏗️',
            color: '#10b981',
            segment: 1,
            status: result.peternakanChain.identity.statusChain,
            totalBlocks: result.peternakanChain.blocks.length,
            identity: result.peternakanChain.identity.kodeIdentity,
            name: result.peternakanChain.identity.namaPeternakan,
            connected: true
        });
    } else {
        result.supplyChainNodes.push({
            node: 'NODE_PETERNAKAN', label: 'Peternakan', icon: '🏗️',
            color: '#10b981', segment: 1, status: 'NOT_LINKED',
            totalBlocks: 0, connected: true
        });
    }

    // 2. Kurir Leg 1
    if (result.kurirLeg1Chain) {
        result.supplyChainNodes.push({
            node: 'NODE_KURIR',
            label: 'Kurir (Leg 1)',
            sublabel: 'Farm → Processor',
            icon: '🚛',
            color: '#f59e0b',
            segment: 2,
            kurirLeg: 1,
            status: result.kurirLeg1Chain.identity.statusChain,
            totalBlocks: result.kurirLeg1Chain.blocks.length,
            identity: result.kurirLeg1Chain.identity.kodeIdentity,
            name: result.kurirLeg1Chain.identity.namaPerusahaan,
            route: `${result.kurirLeg1Chain.identity.asalPengirim || '?'} → ${result.kurirLeg1Chain.identity.tujuanPenerima || '?'}`,
            connected: true
        });
    } else {
        result.supplyChainNodes.push({
            node: 'NODE_KURIR', label: 'Kurir (Leg 1)', sublabel: 'Farm → Processor',
            icon: '🚛', color: '#f59e0b', segment: 2, kurirLeg: 1,
            status: 'NOT_LINKED', totalBlocks: 0, connected: result.connectionStatus.kurir
        });
    }

    // 3. Processor
    if (result.processorChain) {
        result.supplyChainNodes.push({
            node: 'NODE_PROCESSOR',
            label: 'Processor',
            icon: '🏭',
            color: '#8b5cf6',
            segment: 3,
            status: result.processorChain.identity.statusChain,
            totalBlocks: result.processorChain.blocks.length,
            identity: result.processorChain.identity.kodeIdentity,
            name: result.processorChain.identity.kodeOrder || result.processorChain.identity.namaPeternakan,
            connected: true
        });
    } else {
        result.supplyChainNodes.push({
            node: 'NODE_PROCESSOR', label: 'Processor', icon: '🏭',
            color: '#8b5cf6', segment: 3, status: 'NOT_LINKED',
            totalBlocks: 0, connected: result.connectionStatus.processor
        });
    }

    // 4. Kurir Leg 2
    if (result.kurirLeg2Chain) {
        result.supplyChainNodes.push({
            node: 'NODE_KURIR',
            label: 'Kurir (Leg 2)',
            sublabel: 'Processor → Retailer',
            icon: '🚛',
            color: '#f59e0b',
            segment: 4,
            kurirLeg: 2,
            status: result.kurirLeg2Chain.identity.statusChain,
            totalBlocks: result.kurirLeg2Chain.blocks.length,
            identity: result.kurirLeg2Chain.identity.kodeIdentity,
            name: result.kurirLeg2Chain.identity.namaPerusahaan,
            route: `${result.kurirLeg2Chain.identity.asalPengirim || '?'} → ${result.kurirLeg2Chain.identity.tujuanPenerima || '?'}`,
            connected: true
        });
    } else {
        result.supplyChainNodes.push({
            node: 'NODE_KURIR', label: 'Kurir (Leg 2)', sublabel: 'Processor → Retailer',
            icon: '🚛', color: '#f59e0b', segment: 4, kurirLeg: 2,
            status: 'NOT_LINKED', totalBlocks: 0, connected: result.connectionStatus.kurir
        });
    }

    // 5. Retailer (actual blockchain data or inferred from delivery)
    if (result.retailerChain) {
        result.supplyChainNodes.push({
            node: 'NODE_RETAILER',
            label: 'Retailer',
            icon: '🏪',
            color: '#ec4899',
            segment: 5,
            status: result.retailerChain.identity.statusChain,
            totalBlocks: result.retailerChain.blocks.length,
            identity: result.retailerChain.identity.kodeIdentity,
            name: result.retailerChain.identity.namaRetailer || result.retailerChain.identity.namaProcessor,
            connected: true
        });
    } else {
        // Fallback: derive status from Kurir Leg 2
        const retailerInfo = result.kurirLeg2Chain?.identity?.tujuanPenerima;
        const leg2Completed = result.kurirLeg2Chain?.identity?.statusChain === 'COMPLETED';
        result.supplyChainNodes.push({
            node: 'NODE_RETAILER',
            label: 'Retailer',
            icon: '🏪',
            color: '#ec4899',
            segment: 5,
            status: leg2Completed ? 'RECEIVED' : (result.kurirLeg2Chain ? 'WAITING' : 'NOT_LINKED'),
            totalBlocks: 0,
            name: retailerInfo || null,
            connected: result.connectionStatus.retailer
        });
    }

    return result;
}

module.exports = {
    getKurirConnection,
    getProcessorConnection,
    getRetailerConnection,
    testKurirConnection,
    testProcessorConnection,
    testRetailerConnection,
    testAllConnections,
    getAllKurirChains,
    getKurirBlocks,
    validateKurirChain,
    getAllProcessorChains,
    getProcessorBlocks,
    validateProcessorChain,
    getAllRetailerChains,
    getRetailerBlocks,
    validateRetailerChain,
    getUnifiedChainByCycle
};
