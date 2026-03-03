// ============================================================================
// CROSS-CHAIN DATABASE CONNECTIONS - Read-only access to Peternakan, Kurir & Processor DBs
// ============================================================================
// This module allows the Retailer admin to read blockchain data from
// the Peternakan, Kurir, and Processor databases for unified monitoring.
// ============================================================================

require('dotenv').config();
const { Sequelize } = require('sequelize');

let peternakanSequelize = null;
let kurirSequelize = null;
let processorSequelize = null;

// ============================================================================
// CONNECTION HELPERS
// ============================================================================

function getPeternakanConnection() {
    if (peternakanSequelize) return peternakanSequelize;

    peternakanSequelize = new Sequelize(
        process.env.PETERNAKAN_DB_NAME || 'smartpoultry_peternakan',
        process.env.PETERNAKAN_DB_USER || 'root',
        process.env.PETERNAKAN_DB_PASSWORD || '',
        {
            host: process.env.PETERNAKAN_DB_HOST || 'localhost',
            port: process.env.PETERNAKAN_DB_PORT || 3306,
            dialect: 'mariadb',
            dialectOptions: { timezone: 'Etc/GMT+7' },
            logging: false,
            pool: { max: 3, min: 0, acquire: 15000, idle: 10000 },
            define: { timestamps: false, freezeTableName: true }
        }
    );

    return peternakanSequelize;
}

function getKurirConnection() {
    if (kurirSequelize) return kurirSequelize;

    kurirSequelize = new Sequelize(
        process.env.KURIR_DB_NAME || 'smartpoultry_kurir',
        process.env.KURIR_DB_USER || 'root',
        process.env.KURIR_DB_PASSWORD || '',
        {
            host: process.env.KURIR_DB_HOST || 'localhost',
            port: process.env.KURIR_DB_PORT || 3306,
            dialect: 'mariadb',
            dialectOptions: { timezone: 'Etc/GMT+7' },
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
            dialect: 'mariadb',
            dialectOptions: { timezone: 'Etc/GMT+7' },
            logging: false,
            pool: { max: 3, min: 0, acquire: 15000, idle: 10000 },
            define: { timestamps: false, freezeTableName: true }
        }
    );

    return processorSequelize;
}

// ============================================================================
// CONNECTION TEST
// ============================================================================

async function testPeternakanConnection() {
    try {
        const conn = getPeternakanConnection();
        await conn.authenticate();
        return true;
    } catch (error) {
        console.warn('⚠️ Cross-chain: Peternakan DB not available -', error.message);
        return false;
    }
}

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

async function testAllConnections() {
    const [peternakan, kurir, processor] = await Promise.all([
        testPeternakanConnection(),
        testKurirConnection(),
        testProcessorConnection()
    ]);
    return { peternakan, kurir, processor };
}

// ============================================================================
// HELPER: Parse DataPayload & Validate Chain
// ============================================================================
function parseBlocks(blocks) {
    return blocks.map(b => {
        let payload = b.DataPayload;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
        }
        return { ...b, DataPayload: payload };
    });
}

function validateChainIntegrity(blocks, label = 'Chain') {
    if (blocks.length === 0) {
        return { valid: false, message: `No blocks found in ${label}`, totalBlocks: 0 };
    }
    const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';
    let expectedPrevHash = GENESIS_PREV_HASH;
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].PreviousHash !== expectedPrevHash) {
            return { valid: false, message: `${label} broken at block ${i}`, blockIndex: i, totalBlocks: blocks.length };
        }
        expectedPrevHash = blocks[i].CurrentHash;
    }
    return { valid: true, message: `${label} integrity verified ✓`, totalBlocks: blocks.length };
}

// ============================================================================
// PROCESSOR BLOCKCHAIN DATA
// ============================================================================

async function getProcessorChainByOrder(kodeOrderProcessor) {
    try {
        const conn = getProcessorConnection();
        const [identity] = await conn.query(
            `SELECT bi.*, o.KodeOrder, o.NamaPeternakan, o.JenisAyam
             FROM blockchainidentity bi
             LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
             WHERE o.KodeOrder = :kodeOrderProcessor`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeOrderProcessor } }
        );
        if (!identity) return null;

        const blocks = await conn.query(
            `SELECT IdBlock, KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt
             FROM ledger_processor WHERE IdIdentity = :idIdentity ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity: identity.IdIdentity } }
        );

        return {
            identity: {
                idIdentity: identity.IdIdentity,
                kodeIdentity: identity.KodeIdentity,
                kodeOrder: identity.KodeOrder,
                kodeCycleFarm: identity.KodeCycleFarm,
                kodePeternakan: identity.KodePeternakan,
                farmLastBlockHash: identity.FarmLastBlockHash,
                namaPeternakan: identity.NamaPeternakan,
                jenisAyam: identity.JenisAyam,
                statusChain: identity.StatusChain,
                totalBlocks: identity.TotalBlocks,
                genesisHash: identity.GenesisHash,
                latestBlockHash: identity.LatestBlockHash,
                createdAt: identity.CreatedAt,
                completedAt: identity.CompletedAt
            },
            blocks: parseBlocks(blocks)
        };
    } catch (error) {
        console.error('Cross-chain: Processor query error -', error.message);
        return null;
    }
}

async function validateProcessorChain(idIdentity) {
    try {
        const conn = getProcessorConnection();
        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash FROM ledger_processor
             WHERE IdIdentity = :idIdentity ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );
        return validateChainIntegrity(blocks, 'Processor chain');
    } catch (error) {
        return { valid: false, message: 'Cannot connect to Processor database', totalBlocks: 0 };
    }
}

// ============================================================================
// PETERNAKAN BLOCKCHAIN DATA
// ============================================================================

async function getPeternakanChainByCycle(kodeCycle) {
    try {
        const conn = getPeternakanConnection();
        const [identity] = await conn.query(
            `SELECT bi.*, p.NamaPeternakan, p.LokasiPeternakan
             FROM BlockchainIdentity bi
             JOIN Peternakan p ON bi.KodePeternakan = p.KodePeternakan
             WHERE bi.KodeCycle = :kodeCycle`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
        );
        if (!identity) return null;

        const blocks = await conn.query(
            `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt, KodeKandang
             FROM ledger_peternakan WHERE KodeCycle = :kodeCycle ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
        );

        return {
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
            blocks: parseBlocks(blocks)
        };
    } catch (error) {
        console.error('Cross-chain: Peternakan query error -', error.message);
        return null;
    }
}

async function validatePeternakanChain(kodeCycle) {
    try {
        const conn = getPeternakanConnection();
        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash FROM ledger_peternakan
             WHERE KodeCycle = :kodeCycle ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
        );
        return validateChainIntegrity(blocks, 'Peternakan chain');
    } catch (error) {
        return { valid: false, message: 'Cannot connect to Peternakan database', totalBlocks: 0 };
    }
}

// ============================================================================
// KURIR BLOCKCHAIN DATA
// ============================================================================

async function getKurirBlocks(kodePengiriman) {
    try {
        const conn = getKurirConnection();
        const blocks = await conn.query(
            `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt, KodePengiriman
             FROM ledger_kurir WHERE KodePengiriman = :kodePengiriman ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
        );
        return parseBlocks(blocks);
    } catch (error) {
        console.error('Cross-chain: Kurir blocks error -', error.message);
        return [];
    }
}

async function validateKurirChain(kodePengiriman) {
    try {
        const conn = getKurirConnection();
        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash FROM ledger_kurir
             WHERE KodePengiriman = :kodePengiriman ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
        );
        return validateChainIntegrity(blocks, 'Kurir chain');
    } catch (error) {
        return { valid: false, message: 'Cannot connect to Kurir database', totalBlocks: 0 };
    }
}

async function getKurirChainsByUpstream(upstreamCycleId, tipePengiriman = null) {
    try {
        const conn = getKurirConnection();
        let whereClause = 'bi.UpstreamCycleId = :upstreamCycleId';
        const replacements = { upstreamCycleId };
        if (tipePengiriman) {
            whereClause += ' AND p.TipePengiriman = :tipePengiriman';
            replacements.tipePengiriman = tipePengiriman;
        }
        const chains = await conn.query(
            `SELECT bi.*, pk.NamaPerusahaan, pk.AlamatPerusahaan,
                    p.AsalPengirim, p.TujuanPenerima, p.TipePengiriman
             FROM BlockchainIdentity bi
             LEFT JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan
             LEFT JOIN Pengiriman p ON bi.KodePengiriman = p.KodePengiriman
             WHERE ${whereClause}
             ORDER BY bi.CreatedAt ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements }
        );
        return chains;
    } catch (error) {
        console.error('Cross-chain: Kurir query error -', error.message);
        return [];
    }
}

async function getKurirLeg2Chains(kodeOrder, processorName) {
    try {
        const conn = getKurirConnection();
        const chains = await conn.query(
            `SELECT bi.*, pk.NamaPerusahaan, pk.AlamatPerusahaan,
                    p.AsalPengirim, p.TujuanPenerima, p.TipePengiriman, p.ReferensiEksternal
             FROM BlockchainIdentity bi
             LEFT JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan
             LEFT JOIN Pengiriman p ON bi.KodePengiriman = p.KodePengiriman
             WHERE p.TipePengiriman = 'PROCESSOR_TO_RETAILER'
               AND (p.ReferensiEksternal = :kodeOrder OR p.AsalPengirim LIKE :processorLike)
             ORDER BY bi.CreatedAt ASC LIMIT 3`,
            {
                type: Sequelize.QueryTypes.SELECT,
                replacements: { kodeOrder: kodeOrder || '', processorLike: `%${processorName || ''}%` }
            }
        );
        return chains;
    } catch (error) {
        console.error('Cross-chain: Kurir Leg2 query error -', error.message);
        return [];
    }
}

// ============================================================================
// UNIFIED CROSS-CHAIN VIEW FOR RETAILER
// Full supply chain: Peternakan → Kurir Leg 1 → Processor → Kurir Leg 2 → Retailer
// ============================================================================

async function getUnifiedChainByOrder(sequelizeRetailer, idIdentity) {
    const result = {
        peternakanChain: null,
        kurirLeg1Chain: null,
        processorChain: null,
        kurirLeg2Chain: null,
        retailerChain: null,
        unifiedTimeline: [],
        supplyChainNodes: [],
        connectionStatus: { peternakan: false, kurir: false, processor: false }
    };

    // ── SEGMENT 5: Retailer chain (local DB) ──
    try {
        const [retIdentity] = await sequelizeRetailer.query(
            `SELECT bi.*, o.KodeOrder, o.NamaProcessor, o.NamaProduk,
                    r.NamaRetailer, r.AlamatRetailer
             FROM blockchainidentity bi
             LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
             LEFT JOIN retailer r ON bi.IdRetailer = r.IdRetailer
             WHERE bi.IdIdentity = :idIdentity`,
            { type: sequelizeRetailer.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        if (retIdentity) {
            const retBlocks = await sequelizeRetailer.query(
                `SELECT IdBlock, KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                        DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt
                 FROM ledger_retailer WHERE IdIdentity = :idIdentity ORDER BY BlockIndex ASC`,
                { type: sequelizeRetailer.QueryTypes.SELECT, replacements: { idIdentity } }
            );

            result.retailerChain = {
                identity: {
                    idIdentity: retIdentity.IdIdentity,
                    kodeIdentity: retIdentity.KodeIdentity,
                    kodeOrder: retIdentity.KodeOrder,
                    namaProcessor: retIdentity.NamaProcessor,
                    namaProduk: retIdentity.NamaProduk,
                    namaRetailer: retIdentity.NamaRetailer,
                    alamatRetailer: retIdentity.AlamatRetailer,
                    kodeOrderProcessor: retIdentity.KodeOrderProcessor,
                    processorLastBlockHash: retIdentity.ProcessorLastBlockHash,
                    statusChain: retIdentity.StatusChain,
                    totalBlocks: retIdentity.TotalBlocks,
                    genesisHash: retIdentity.GenesisHash,
                    latestBlockHash: retIdentity.LatestBlockHash,
                    createdAt: retIdentity.CreatedAt,
                    completedAt: retIdentity.CompletedAt
                },
                blocks: parseBlocks(retBlocks)
            };

            const kodeOrderProcessor = retIdentity.KodeOrderProcessor;

            // ── SEGMENT 3: Processor chain (cross-DB) ──
            if (kodeOrderProcessor) {
                try {
                    result.connectionStatus.processor = await testProcessorConnection();
                    if (result.connectionStatus.processor) {
                        const procData = await getProcessorChainByOrder(kodeOrderProcessor);
                        if (procData) {
                            const procValidation = await validateProcessorChain(procData.identity.idIdentity);
                            result.processorChain = { ...procData, validation: procValidation };

                            const kodeCycleFarm = procData.identity.kodeCycleFarm;
                            const kodeOrder = procData.identity.kodeOrder;
                            const namaPeternakan = procData.identity.namaPeternakan;

                            // ── SEGMENT 1: Peternakan chain (cross-DB) ──
                            if (kodeCycleFarm) {
                                try {
                                    result.connectionStatus.peternakan = await testPeternakanConnection();
                                    if (result.connectionStatus.peternakan) {
                                        const farmData = await getPeternakanChainByCycle(kodeCycleFarm);
                                        if (farmData) {
                                            const farmValidation = await validatePeternakanChain(kodeCycleFarm);
                                            result.peternakanChain = { ...farmData, validation: farmValidation };
                                        }
                                    }
                                } catch (e) { console.error('Unified: Peternakan error -', e.message); }

                                // ── SEGMENT 2: Kurir Leg 1 (cross-DB) ──
                                try {
                                    result.connectionStatus.kurir = await testKurirConnection();
                                    if (result.connectionStatus.kurir) {
                                        const kurirChains = await getKurirChainsByUpstream(kodeCycleFarm, 'FARM_TO_PROCESSOR');
                                        if (kurirChains.length > 0) {
                                            const kc = kurirChains[0];
                                            const kb = await getKurirBlocks(kc.KodePengiriman);
                                            const kv = await validateKurirChain(kc.KodePengiriman);
                                            result.kurirLeg1Chain = {
                                                leg: 1, tipePengiriman: 'FARM_TO_PROCESSOR',
                                                identity: {
                                                    kodeIdentity: kc.KodeIdentity, kodePengiriman: kc.KodePengiriman,
                                                    namaPerusahaan: kc.NamaPerusahaan, statusChain: kc.StatusChain,
                                                    totalBlocks: kc.TotalBlocks, asalPengirim: kc.AsalPengirim,
                                                    tujuanPenerima: kc.TujuanPenerima, createdAt: kc.CreatedAt
                                                },
                                                blocks: kb, validation: kv
                                            };
                                        }
                                    }
                                } catch (e) { console.error('Unified: Kurir Leg1 error -', e.message); }
                            }

                            // ── SEGMENT 4: Kurir Leg 2 (cross-DB) ──
                            try {
                                if (!result.connectionStatus.kurir) result.connectionStatus.kurir = await testKurirConnection();
                                if (result.connectionStatus.kurir) {
                                    const leg2Chains = await getKurirLeg2Chains(kodeOrder, namaPeternakan);
                                    if (leg2Chains.length > 0) {
                                        const l2 = leg2Chains[0];
                                        const l2b = await getKurirBlocks(l2.KodePengiriman);
                                        const l2v = await validateKurirChain(l2.KodePengiriman);
                                        result.kurirLeg2Chain = {
                                            leg: 2, tipePengiriman: 'PROCESSOR_TO_RETAILER',
                                            identity: {
                                                kodeIdentity: l2.KodeIdentity, kodePengiriman: l2.KodePengiriman,
                                                namaPerusahaan: l2.NamaPerusahaan, statusChain: l2.StatusChain,
                                                totalBlocks: l2.TotalBlocks, asalPengirim: l2.AsalPengirim,
                                                tujuanPenerima: l2.TujuanPenerima, createdAt: l2.CreatedAt
                                            },
                                            blocks: l2b, validation: l2v
                                        };
                                    }
                                }
                            } catch (e) { console.error('Unified: Kurir Leg2 error -', e.message); }
                        }
                    }
                } catch (e) { console.error('Unified: Processor error -', e.message); }
            }
        }
    } catch (error) {
        console.error('Unified chain: Retailer error -', error.message);
    }

    // ── BUILD UNIFIED TIMELINE ──
    let unifiedIndex = 0;
    const addToTimeline = (chain, node, label, color, segment, segmentLabel, extra = {}) => {
        if (!chain) return;
        chain.blocks.forEach(b => {
            result.unifiedTimeline.push({
                node, nodeLabel: label, nodeColor: color, segment, segmentLabel,
                ...extra, ...b, timestamp: b.CreatedAt, unifiedIndex: unifiedIndex++
            });
        });
    };

    addToTimeline(result.peternakanChain, 'NODE_PETERNAKAN', '🏗️ Peternakan', '#10b981', 1, 'Peternakan');
    addToTimeline(result.kurirLeg1Chain, 'NODE_KURIR', '🚛 Kurir (Farm → Processor)', '#f59e0b', 2, 'Pengiriman ke Processor', { kurirLeg: 1 });
    addToTimeline(result.processorChain, 'NODE_PROCESSOR', '🏭 Processor', '#8b5cf6', 3, 'Processing');
    addToTimeline(result.kurirLeg2Chain, 'NODE_KURIR', '🚛 Kurir (Processor → Retailer)', '#f59e0b', 4, 'Pengiriman ke Retailer', { kurirLeg: 2 });
    addToTimeline(result.retailerChain, 'NODE_RETAILER', '🏪 Retailer', '#ec4899', 5, 'Retailer');

    // ── BUILD SUPPLY CHAIN NODES ──
    const makeNode = (chain, node, label, icon, color, segment, extras = {}) => {
        if (chain) {
            return {
                node, label, icon, color, segment,
                status: chain.identity.statusChain,
                totalBlocks: chain.blocks.length,
                identity: chain.identity.kodeIdentity,
                name: chain.identity.namaPeternakan || chain.identity.namaPerusahaan || chain.identity.namaRetailer || chain.identity.kodeOrder,
                connected: true, ...extras
            };
        }
        return { node, label, icon, color, segment, status: 'NOT_LINKED', totalBlocks: 0, connected: false, ...extras };
    };

    result.supplyChainNodes = [
        makeNode(result.peternakanChain, 'NODE_PETERNAKAN', 'Peternakan', '🏗️', '#10b981', 1),
        makeNode(result.kurirLeg1Chain, 'NODE_KURIR', 'Kurir (Leg 1)', '🚛', '#f59e0b', 2, { sublabel: 'Farm → Processor', kurirLeg: 1 }),
        makeNode(result.processorChain, 'NODE_PROCESSOR', 'Processor', '🏭', '#8b5cf6', 3),
        makeNode(result.kurirLeg2Chain, 'NODE_KURIR', 'Kurir (Leg 2)', '🚛', '#f59e0b', 4, { sublabel: 'Processor → Retailer', kurirLeg: 2 }),
        makeNode(result.retailerChain, 'NODE_RETAILER', 'Retailer', '🏪', '#ec4899', 5)
    ];

    return result;
}

module.exports = {
    getPeternakanConnection,
    getKurirConnection,
    getProcessorConnection,
    testPeternakanConnection,
    testKurirConnection,
    testProcessorConnection,
    testAllConnections,
    getProcessorChainByOrder,
    validateProcessorChain,
    getPeternakanChainByCycle,
    validatePeternakanChain,
    getKurirBlocks,
    validateKurirChain,
    getKurirChainsByUpstream,
    getKurirLeg2Chains,
    getUnifiedChainByOrder
};
