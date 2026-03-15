// ============================================================================
// CROSS-CHAIN DATABASE CONNECTIONS - Read-only access to Processor & Retailer DBs
// ============================================================================
// This module allows the Kurir system to read blockchain data from
// the Processor and Retailer databases for unified monitoring.
// Note: Peternakan connection is handled separately in peternakanDatabase.js
// ============================================================================

require('dotenv').config();
const { Sequelize } = require('sequelize');

let processorSequelize = null;
let retailerSequelize = null;

// ============================================================================
// CONNECTION HELPERS
// ============================================================================

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
    const { testPeternakanConnection } = require('./peternakanDatabase');
    const [peternakan, processor, retailer] = await Promise.all([
        testPeternakanConnection(),
        testProcessorConnection(),
        testRetailerConnection()
    ]);
    return { peternakan, processor, retailer };
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

async function getProcessorChainByCycleFarm(kodeCycleFarm) {
    try {
        const conn = getProcessorConnection();
        const [identity] = await conn.query(
            `SELECT bi.*, o.KodeOrder, o.NamaPeternakan, o.JenisAyam
             FROM blockchainidentity bi
             LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
             WHERE bi.KodeCycleFarm = :kodeCycleFarm`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycleFarm } }
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

async function getProcessorBlocks(idIdentity) {
    try {
        const conn = getProcessorConnection();
        const blocks = await conn.query(
            `SELECT IdBlock, KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt
             FROM ledger_processor WHERE IdIdentity = :idIdentity ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );
        return parseBlocks(blocks);
    } catch (error) {
        console.error('Cross-chain: Processor blocks error -', error.message);
        return [];
    }
}

async function validateProcessorChain(idIdentity) {
    try {
        const conn = getProcessorConnection();

        // Get upstream hash reference for cross-chain continuity validation
        const [identity] = await conn.query(
            `SELECT FarmLastBlockHash FROM blockchainidentity WHERE IdIdentity = :idIdentity LIMIT 1`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash FROM ledger_processor
             WHERE IdIdentity = :idIdentity ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        if (blocks.length === 0) {
            return { valid: false, message: 'No blocks found in Processor chain', totalBlocks: 0 };
        }

        // Use upstream hash as genesis previous hash for chain continuity
        const genesisPrevHash = (identity && identity.FarmLastBlockHash) ? identity.FarmLastBlockHash : GENESIS_PREV_HASH;
        let expectedPrevHash = genesisPrevHash;

        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].PreviousHash !== expectedPrevHash) {
                return { valid: false, message: `Processor chain broken at block ${i}`, blockIndex: i, totalBlocks: blocks.length };
            }
            expectedPrevHash = blocks[i].CurrentHash;
        }
        return {
            valid: true,
            message: 'Processor chain integrity verified \u2713',
            totalBlocks: blocks.length,
            upstreamLinked: !!(identity && identity.FarmLastBlockHash)
        };
    } catch (error) {
        return { valid: false, message: 'Cannot connect to Processor database', totalBlocks: 0 };
    }
}

// ============================================================================
// RETAILER BLOCKCHAIN DATA
// ============================================================================

async function getRetailerChainByKurirPengiriman(kodePengirimanKurir) {
    try {
        const conn = getRetailerConnection();
        const chains = await conn.query(
            `SELECT bi.IdIdentity, bi.KodeIdentity, bi.IdOrder, bi.IdRetailer,
                    bi.KodeProcessor, bi.KodePengirimanKurir, bi.KurirLastBlockHash,
                    bi.GenesisHash, bi.LatestBlockHash, bi.TotalBlocks,
                    bi.StatusChain, bi.CreatedAt, bi.CompletedAt,
                    o.KodeOrder, o.NamaProcessor, o.NamaProduk,
                    r.NamaRetailer, r.AlamatRetailer
             FROM blockchainidentity bi
             LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
             LEFT JOIN retailer r ON bi.IdRetailer = r.IdRetailer
             WHERE bi.KodePengirimanKurir = :kodePengirimanKurir
             ORDER BY bi.CreatedAt ASC LIMIT 5`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengirimanKurir } }
        );
        return chains;
    } catch (error) {
        console.error('Cross-chain: Retailer query error -', error.message);
        return [];
    }
}

async function getRetailerBlocks(idIdentity) {
    try {
        const conn = getRetailerConnection();
        const blocks = await conn.query(
            `SELECT IdBlock, KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt
             FROM ledger_retailer WHERE IdIdentity = :idIdentity ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );
        return parseBlocks(blocks);
    } catch (error) {
        console.error('Cross-chain: Retailer blocks error -', error.message);
        return [];
    }
}

async function validateRetailerChain(idIdentity) {
    try {
        const conn = getRetailerConnection();

        // Get upstream hash reference for cross-chain continuity validation
        const [identity] = await conn.query(
            `SELECT KurirLastBlockHash FROM blockchainidentity WHERE IdIdentity = :idIdentity LIMIT 1`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        const blocks = await conn.query(
            `SELECT BlockIndex, CurrentHash, PreviousHash FROM ledger_retailer
             WHERE IdIdentity = :idIdentity ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
        );

        if (blocks.length === 0) {
            return { valid: false, message: 'No blocks found in Retailer chain', totalBlocks: 0 };
        }

        // Use upstream hash (Kurir Leg 2) as genesis previous hash for chain continuity
        const genesisPrevHash = (identity && identity.KurirLastBlockHash) ? identity.KurirLastBlockHash : GENESIS_PREV_HASH;
        let expectedPrevHash = genesisPrevHash;

        for (let i = 0; i < blocks.length; i++) {
            if (blocks[i].PreviousHash !== expectedPrevHash) {
                return { valid: false, message: `Retailer chain broken at block ${i}`, blockIndex: i, totalBlocks: blocks.length };
            }
            expectedPrevHash = blocks[i].CurrentHash;
        }
        return {
            valid: true,
            message: 'Retailer chain integrity verified ✓',
            totalBlocks: blocks.length,
            upstreamLinked: !!(identity && identity.KurirLastBlockHash)
        };
    } catch (error) {
        return { valid: false, message: 'Cannot connect to Retailer database', totalBlocks: 0 };
    }
}

// ============================================================================
// UNIFIED CROSS-CHAIN VIEW FOR KURIR
// Full supply chain: Peternakan → Kurir Leg 1 → Processor → Kurir Leg 2 → Retailer
// ============================================================================

async function getUnifiedChainByPengiriman(sequelizeKurir, kodePengiriman) {
    const { getPeternakanBlockchainByCycle, validatePeternakanChain: validateFarmChain } = require('./peternakanDatabase');

    const result = {
        peternakanChain: null,
        kurirLeg1Chain: null,
        processorChain: null,
        kurirLeg2Chain: null,
        retailerChain: null,
        unifiedTimeline: [],
        supplyChainNodes: [],
        connectionStatus: { peternakan: false, processor: false, retailer: false }
    };

    // First get the Kurir chain identity for this pengiriman
    try {
        const [kurirIdentity] = await sequelizeKurir.query(
            `SELECT bi.*, pk.NamaPerusahaan, pk.AlamatPerusahaan,
                    p.AsalPengirim, p.TujuanPenerima, p.TipePengiriman, p.UpstreamCycleId
             FROM BlockchainIdentity bi
             LEFT JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan
             LEFT JOIN Pengiriman p ON bi.KodePengiriman = p.KodePengiriman
             WHERE bi.KodePengiriman = :kodePengiriman`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
        );

        if (!kurirIdentity) return result;

        const kurirBlocks = await sequelizeKurir.query(
            `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt, KodePengiriman
             FROM ledger_kurir WHERE KodePengiriman = :kodePengiriman ORDER BY BlockIndex ASC`,
            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
        );

        const thisChain = {
            identity: {
                kodeIdentity: kurirIdentity.KodeIdentity,
                kodePengiriman: kurirIdentity.KodePengiriman,
                namaPerusahaan: kurirIdentity.NamaPerusahaan,
                statusChain: kurirIdentity.StatusChain,
                totalBlocks: kurirIdentity.TotalBlocks,
                genesisHash: kurirIdentity.GenesisHash,
                latestBlockHash: kurirIdentity.LatestBlockHash,
                asalPengirim: kurirIdentity.AsalPengirim,
                tujuanPenerima: kurirIdentity.TujuanPenerima,
                tipePengiriman: kurirIdentity.TipePengiriman,
                createdAt: kurirIdentity.CreatedAt
            },
            blocks: parseBlocks(kurirBlocks)
        };

        const tipePengiriman = kurirIdentity.TipePengiriman;
        const upstreamCycleId = kurirIdentity.UpstreamCycleId;

        if (tipePengiriman === 'FARM_TO_PROCESSOR') {
            // This is Kurir Leg 1
            result.kurirLeg1Chain = { leg: 1, tipePengiriman: 'FARM_TO_PROCESSOR', ...thisChain };

            // ── SEGMENT 1: Peternakan (read from peternakan DB) ──
            if (upstreamCycleId) {
                try {
                    const farmData = await getPeternakanBlockchainByCycle(upstreamCycleId);
                    if (farmData) {
                        const farmValidation = await validateFarmChain(upstreamCycleId);
                        result.peternakanChain = {
                            identity: farmData.chain,
                            blocks: farmData.blocks,
                            validation: farmValidation
                        };
                        result.connectionStatus.peternakan = true;
                    }
                } catch (e) { console.error('Unified: Peternakan error -', e.message); }
            }

            // ── SEGMENT 3: Processor (cross-DB) ──
            if (upstreamCycleId) {
                try {
                    result.connectionStatus.processor = await testProcessorConnection();
                    if (result.connectionStatus.processor) {
                        const procData = await getProcessorChainByCycleFarm(upstreamCycleId);
                        if (procData) {
                            const procValidation = await validateProcessorChain(procData.identity.idIdentity);
                            result.processorChain = { ...procData, validation: procValidation };

                            // ── SEGMENT 4: Kurir Leg 2 (from own DB) ──
                            const kodeOrder = procData.identity.kodeOrder;
                            if (kodeOrder) {
                                const [leg2Identity] = await sequelizeKurir.query(
                                    `SELECT bi.*, pk.NamaPerusahaan,
                                            p.AsalPengirim, p.TujuanPenerima, p.TipePengiriman
                                     FROM BlockchainIdentity bi
                                     LEFT JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan
                                     LEFT JOIN Pengiriman p ON bi.KodePengiriman = p.KodePengiriman
                                     WHERE p.TipePengiriman = 'PROCESSOR_TO_RETAILER'
                                       AND (p.ReferensiEksternal = :kodeOrder
                                            OR p.AsalPengirim LIKE :namaPeternakan)
                                     ORDER BY bi.CreatedAt ASC LIMIT 1`,
                                    {
                                        type: Sequelize.QueryTypes.SELECT,
                                        replacements: {
                                            kodeOrder,
                                            namaPeternakan: `%${procData.identity.namaPeternakan || ''}%`
                                        }
                                    }
                                );

                                if (leg2Identity) {
                                    const leg2Blocks = await sequelizeKurir.query(
                                        `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                                                DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt, KodePengiriman
                                         FROM ledger_kurir WHERE KodePengiriman = :kodePengiriman ORDER BY BlockIndex ASC`,
                                        { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman: leg2Identity.KodePengiriman } }
                                    );

                                    result.kurirLeg2Chain = {
                                        leg: 2, tipePengiriman: 'PROCESSOR_TO_RETAILER',
                                        identity: {
                                            kodeIdentity: leg2Identity.KodeIdentity,
                                            kodePengiriman: leg2Identity.KodePengiriman,
                                            namaPerusahaan: leg2Identity.NamaPerusahaan,
                                            statusChain: leg2Identity.StatusChain,
                                            totalBlocks: leg2Identity.TotalBlocks,
                                            asalPengirim: leg2Identity.AsalPengirim,
                                            tujuanPenerima: leg2Identity.TujuanPenerima,
                                            createdAt: leg2Identity.CreatedAt
                                        },
                                        blocks: parseBlocks(leg2Blocks)
                                    };
                                }

                                // ── SEGMENT 5: Retailer (cross-DB, lookup by kurir leg 2 pengiriman) ──
                                if (result.kurirLeg2Chain && result.kurirLeg2Chain.identity.kodePengiriman) {
                                    try {
                                        result.connectionStatus.retailer = await testRetailerConnection();
                                        if (result.connectionStatus.retailer) {
                                            const retChains = await getRetailerChainByKurirPengiriman(result.kurirLeg2Chain.identity.kodePengiriman);
                                            if (retChains.length > 0) {
                                                const rc = retChains[0];
                                                const rb = await getRetailerBlocks(rc.IdIdentity);
                                                const rv = await validateRetailerChain(rc.IdIdentity);
                                                result.retailerChain = {
                                                    identity: {
                                                        idIdentity: rc.IdIdentity, kodeIdentity: rc.KodeIdentity,
                                                        kodeOrder: rc.KodeOrder, namaProcessor: rc.NamaProcessor,
                                                        namaRetailer: rc.NamaRetailer, alamatRetailer: rc.AlamatRetailer,
                                                        statusChain: rc.StatusChain, totalBlocks: rc.TotalBlocks,
                                                        genesisHash: rc.GenesisHash, latestBlockHash: rc.LatestBlockHash,
                                                        createdAt: rc.CreatedAt, completedAt: rc.CompletedAt
                                                    },
                                                    blocks: rb, validation: rv
                                                };
                                            }
                                        }
                                    } catch (e) { console.error('Unified: Retailer error -', e.message); }
                                }
                            }
                        }
                    }
                } catch (e) { console.error('Unified: Processor error -', e.message); }
            }
        } else if (tipePengiriman === 'PROCESSOR_TO_RETAILER') {
            // This is Kurir Leg 2
            result.kurirLeg2Chain = { leg: 2, tipePengiriman: 'PROCESSOR_TO_RETAILER', ...thisChain };

            // Try to trace back to find Kurir Leg 1, Processor, and Peternakan
            // by looking at ReferensiEksternal (Processor's KodeOrder)
            const [pengiriman] = await sequelizeKurir.query(
                `SELECT ReferensiEksternal FROM Pengiriman WHERE KodePengiriman = :kodePengiriman`,
                { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
            );

            if (pengiriman?.ReferensiEksternal) {
                const processorKodeOrder = pengiriman.ReferensiEksternal;

                // SEGMENT 3: Processor
                try {
                    result.connectionStatus.processor = await testProcessorConnection();
                    if (result.connectionStatus.processor) {
                        const conn = getProcessorConnection();
                        const [procIdentity] = await conn.query(
                            `SELECT bi.*, o.KodeOrder, o.NamaPeternakan, o.JenisAyam
                             FROM blockchainidentity bi
                             LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
                             WHERE o.KodeOrder = :kodeOrder`,
                            { type: Sequelize.QueryTypes.SELECT, replacements: { kodeOrder: processorKodeOrder } }
                        );

                        if (procIdentity) {
                            const procBlocks = await getProcessorBlocks(procIdentity.IdIdentity);
                            const procValidation = await validateProcessorChain(procIdentity.IdIdentity);
                            result.processorChain = {
                                identity: {
                                    idIdentity: procIdentity.IdIdentity, kodeIdentity: procIdentity.KodeIdentity,
                                    kodeOrder: procIdentity.KodeOrder, kodeCycleFarm: procIdentity.KodeCycleFarm,
                                    namaPeternakan: procIdentity.NamaPeternakan, statusChain: procIdentity.StatusChain,
                                    totalBlocks: procIdentity.TotalBlocks, genesisHash: procIdentity.GenesisHash,
                                    latestBlockHash: procIdentity.LatestBlockHash, createdAt: procIdentity.CreatedAt
                                },
                                blocks: procBlocks, validation: procValidation
                            };

                            const kodeCycleFarm = procIdentity.KodeCycleFarm;

                            // SEGMENT 1: Peternakan
                            if (kodeCycleFarm) {
                                try {
                                    const farmData = await getPeternakanBlockchainByCycle(kodeCycleFarm);
                                    if (farmData) {
                                        const farmValidation = await validateFarmChain(kodeCycleFarm);
                                        result.peternakanChain = {
                                            identity: farmData.chain,
                                            blocks: farmData.blocks,
                                            validation: farmValidation
                                        };
                                        result.connectionStatus.peternakan = true;
                                    }
                                } catch (e) { /* silent */ }

                                // SEGMENT 2: Kurir Leg 1 (from own DB)
                                try {
                                    const [leg1Identity] = await sequelizeKurir.query(
                                        `SELECT bi.*, pk.NamaPerusahaan,
                                                p.AsalPengirim, p.TujuanPenerima, p.TipePengiriman
                                         FROM BlockchainIdentity bi
                                         LEFT JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan
                                         LEFT JOIN Pengiriman p ON bi.KodePengiriman = p.KodePengiriman
                                         WHERE bi.UpstreamCycleId = :kodeCycleFarm
                                           AND p.TipePengiriman = 'FARM_TO_PROCESSOR'
                                         ORDER BY bi.CreatedAt ASC LIMIT 1`,
                                        { type: Sequelize.QueryTypes.SELECT, replacements: { kodeCycleFarm } }
                                    );

                                    if (leg1Identity) {
                                        const leg1Blocks = await sequelizeKurir.query(
                                            `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash,
                                                    DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt, KodePengiriman
                                             FROM ledger_kurir WHERE KodePengiriman = :kodePengiriman ORDER BY BlockIndex ASC`,
                                            { type: Sequelize.QueryTypes.SELECT, replacements: { kodePengiriman: leg1Identity.KodePengiriman } }
                                        );

                                        result.kurirLeg1Chain = {
                                            leg: 1, tipePengiriman: 'FARM_TO_PROCESSOR',
                                            identity: {
                                                kodeIdentity: leg1Identity.KodeIdentity,
                                                kodePengiriman: leg1Identity.KodePengiriman,
                                                namaPerusahaan: leg1Identity.NamaPerusahaan,
                                                statusChain: leg1Identity.StatusChain,
                                                totalBlocks: leg1Identity.TotalBlocks,
                                                asalPengirim: leg1Identity.AsalPengirim,
                                                tujuanPenerima: leg1Identity.TujuanPenerima,
                                                createdAt: leg1Identity.CreatedAt
                                            },
                                            blocks: parseBlocks(leg1Blocks)
                                        };
                                    }
                                } catch (e) { /* silent */ }
                            }
                        }
                    }
                } catch (e) { console.error('Unified: Processor error -', e.message); }

                // SEGMENT 5: Retailer (lookup by Kurir Leg 2 pengiriman code)
                if (result.kurirLeg2Chain && result.kurirLeg2Chain.identity.kodePengiriman) {
                    try {
                        result.connectionStatus.retailer = await testRetailerConnection();
                        if (result.connectionStatus.retailer) {
                            const retChains = await getRetailerChainByKurirPengiriman(result.kurirLeg2Chain.identity.kodePengiriman);
                            if (retChains.length > 0) {
                                const rc = retChains[0];
                                const rb = await getRetailerBlocks(rc.IdIdentity);
                                const rv = await validateRetailerChain(rc.IdIdentity);
                                result.retailerChain = {
                                    identity: {
                                        idIdentity: rc.IdIdentity, kodeIdentity: rc.KodeIdentity,
                                        kodeOrder: rc.KodeOrder, namaProcessor: rc.NamaProcessor,
                                        namaRetailer: rc.NamaRetailer, statusChain: rc.StatusChain,
                                        totalBlocks: rc.TotalBlocks, genesisHash: rc.GenesisHash,
                                        latestBlockHash: rc.LatestBlockHash, createdAt: rc.CreatedAt
                                    },
                                    blocks: rb, validation: rv
                                };
                            }
                        }
                    } catch (e) { console.error('Unified: Retailer error -', e.message); }
                }
            }
        }
    } catch (error) {
        console.error('Unified chain: Kurir error -', error.message);
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
                identity: chain.identity.kodeIdentity || chain.identity.kodeIdentity,
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
    getProcessorConnection,
    getRetailerConnection,
    testProcessorConnection,
    testRetailerConnection,
    testAllConnections,
    getProcessorChainByCycleFarm,
    getProcessorBlocks,
    validateProcessorChain,
    getRetailerChainByKurirPengiriman,
    getRetailerBlocks,
    validateRetailerChain,
    getUnifiedChainByPengiriman
};
