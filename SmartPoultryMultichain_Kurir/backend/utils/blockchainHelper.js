// ============================================================================
// BLOCKCHAIN HELPER - Application-Level Blockchain for Node Kurir
// ============================================================================
// Block identity = Pengiriman (each shipment gets its own chain)
// Multi-chain: Peternakan → Kurir → Processor → Kurir → Retailer
// Cross-chain: Links to upstream Peternakan chain for full traceability
// ============================================================================

const crypto = require('crypto');
const crossChain = require('../config/peternakanDatabase');

// Genesis hash constant
const GENESIS_PREV_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Generate SHA-256 hash from block components
 */
function generateHash(blockIndex, previousHash, tipeBlock, dataPayload, timestamp, nonce) {
    const input = `${blockIndex || 0}${previousHash || ''}${tipeBlock || ''}${typeof dataPayload === 'string' ? dataPayload : JSON.stringify(dataPayload)}${timestamp || ''}${nonce || 0}`;
    return crypto.createHash('sha256').update(input).digest('hex');
}

/**
 * Get the previous hash for a given shipment chain.
 * If no blocks exist yet (genesis), returns the upstream chain hash
 * to maintain cross-chain hash continuity.
 */
async function getPreviousHash(sequelize, kodePengiriman, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT CurrentHash FROM ledger_kurir 
         WHERE KodePengiriman = :kodePengiriman 
         ORDER BY BlockIndex DESC LIMIT 1`,
        { ...opts, replacements: { kodePengiriman } }
    );

    if (result) return result.CurrentHash;

    // No blocks yet - check if there's an upstream chain hash for continuity
    const [identity] = await sequelize.query(
        `SELECT UpstreamChainHash FROM BlockchainIdentity 
         WHERE KodePengiriman = :kodePengiriman LIMIT 1`,
        { ...opts, replacements: { kodePengiriman } }
    );

    return (identity && identity.UpstreamChainHash) ? identity.UpstreamChainHash : GENESIS_PREV_HASH;
}

/**
 * Get next block index for a shipment chain
 */
async function getNextBlockIndex(sequelize, kodePengiriman, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT COALESCE(MAX(BlockIndex), -1) + 1 AS nextIndex 
         FROM ledger_kurir 
         WHERE KodePengiriman = :kodePengiriman`,
        { ...opts, replacements: { kodePengiriman } }
    );

    return result ? result.nextIndex : 0;
}

/**
 * Create a new block in the ledger
 */
async function createBlock(sequelize, { kodePerusahaan, kodePengiriman, tipeBlock, dataPayload, transaction = null }) {
    const blockIndex = await getNextBlockIndex(sequelize, kodePengiriman, transaction);
    const previousHash = await getPreviousHash(sequelize, kodePengiriman, transaction);

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const nonce = 0;

    const currentHash = generateHash(
        blockIndex,
        previousHash,
        tipeBlock,
        dataPayload,
        timestamp,
        nonce
    );

    const kodeBlock = `BLK-KUR-${kodePengiriman.substring(4)}-${String(blockIndex).padStart(4, '0')}`;

    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    await sequelize.query(
        `INSERT INTO ledger_kurir 
         (KodeBlock, KodePerusahaan, KodePengiriman, TipeBlock, BlockIndex, PreviousHash, CurrentHash, DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt) 
         VALUES (:kodeBlock, :kodePerusahaan, :kodePengiriman, :tipeBlock, :blockIndex, :previousHash, :currentHash, :dataPayload, :nonce, 'VALIDATED', NOW(), NOW())`,
        {
            ...queryOpts,
            replacements: {
                kodeBlock,
                kodePerusahaan,
                kodePengiriman,
                tipeBlock,
                blockIndex,
                previousHash,
                currentHash,
                dataPayload: JSON.stringify(dataPayload),
                nonce
            }
        }
    );

    // Update BlockchainIdentity
    await sequelize.query(
        `UPDATE BlockchainIdentity 
         SET LatestBlockHash = :currentHash, TotalBlocks = TotalBlocks + 1 
         WHERE KodePengiriman = :kodePengiriman`,
        {
            ...queryOpts,
            replacements: { currentHash, kodePengiriman }
        }
    );

    return { kodeBlock, blockIndex, previousHash, currentHash, tipeBlock };
}

// ============================================================================
// HIGH-LEVEL BLOCKCHAIN EVENT FUNCTIONS
// ============================================================================

/**
 * GENESIS BLOCK - When a new shipment is created
 * Uses upstream chain's last block hash as PreviousHash for chain continuity.
 * Also creates LINK_UPSTREAM block if upstream cycle is provided.
 */
async function createGenesisBlock(sequelize, { kodePerusahaan, kodePengiriman, tipePengiriman, asalPengirim, tujuanPenerima, tanggalPickup, kodeKurir, upstreamCycleId, processorLastBlockHash, kodeCycleFarm, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    // Try to get upstream chain hash based on shipment type
    let upstreamChainHash = null;
    let upstreamNodeType = null;
    let upstreamData = null;

    if (tipePengiriman === 'PROCESSOR_TO_RETAILER' && processorLastBlockHash) {
        // For Leg 2: Upstream is the Processor chain
        upstreamChainHash = processorLastBlockHash;
        upstreamNodeType = 'NODE_PROCESSOR';

        // Try to get processor chain data for LINK_UPSTREAM block
        try {
            const { getProcessorConnection } = require('../config/crossChainDatabase');
            const procConn = getProcessorConnection();
            if (procConn && upstreamCycleId) {
                const [procIdentity] = await procConn.query(
                    `SELECT bi.KodeIdentity, bi.StatusChain, bi.TotalBlocks, bi.GenesisHash,
                            bi.LatestBlockHash, bi.KodeCycleFarm, o.NamaProcessor, o.NamaPeternakan
                     FROM blockchainidentity bi
                     LEFT JOIN orders o ON bi.IdOrder = o.IdOrder
                     WHERE bi.IdOrder = :idOrder`,
                    { type: require('sequelize').QueryTypes.SELECT, replacements: { idOrder: upstreamCycleId } }
                );
                if (procIdentity) {
                    upstreamData = {
                        type: 'PROCESSOR',
                        chain: {
                            kodeIdentity: procIdentity.KodeIdentity,
                            statusChain: procIdentity.StatusChain,
                            totalBlocks: procIdentity.TotalBlocks,
                            genesisHash: procIdentity.GenesisHash,
                            latestBlockHash: procIdentity.LatestBlockHash,
                            namaProcessor: procIdentity.NamaProcessor,
                            namaPeternakan: procIdentity.NamaPeternakan
                        }
                    };
                }
            }
        } catch (err) {
            console.warn('Could not fetch Processor upstream chain data:', err.message);
        }
    } else if (upstreamCycleId) {
        // For Leg 1: Upstream is the Peternakan chain (existing logic)
        try {
            const latestBlock = await crossChain.getPeternakanLatestHash(upstreamCycleId);
            if (latestBlock) {
                upstreamChainHash = latestBlock.CurrentHash;
                upstreamNodeType = 'NODE_PETERNAKAN';
            }
            // Get upstream chain info for the LINK block
            upstreamData = await crossChain.getPeternakanBlockchainByCycle(upstreamCycleId);
            if (upstreamData) upstreamData.type = 'PETERNAKAN';
        } catch (err) {
            console.warn('Could not fetch upstream chain data:', err.message);
        }
    }

    // Use upstream chain hash as the genesis previous hash for chain continuity
    // Only the very first node (Peternakan) starts from 000...000
    const genesisPrevHash = upstreamChainHash || GENESIS_PREV_HASH;

    // Generate genesis hash using the upstream hash for continuity
    const genesisHash = generateHash(
        0,
        genesisPrevHash,
        'GENESIS',
        JSON.stringify({ pengiriman_id: kodePengiriman, tipe: tipePengiriman, asal: asalPengirim }),
        new Date().toISOString().replace('T', ' ').substring(0, 19),
        0
    );

    const kodeIdentity = `CHAIN-KUR-${kodePengiriman.substring(4)}`;

    // Create BlockchainIdentity with upstream reference
    await sequelize.query(
        `INSERT INTO BlockchainIdentity 
         (KodeIdentity, KodePerusahaan, KodePengiriman, GenesisHash, LatestBlockHash, TotalBlocks, StatusChain, CreatedAt, UpstreamChainHash, UpstreamNodeType, UpstreamCycleId) 
         VALUES (:kodeIdentity, :kodePerusahaan, :kodePengiriman, :genesisHash, :genesisHash, 0, 'ACTIVE', NOW(), :upstreamChainHash, :upstreamNodeType, :upstreamCycleId)`,
        {
            ...queryOpts,
            replacements: {
                kodeIdentity, kodePerusahaan, kodePengiriman, genesisHash,
                upstreamChainHash: upstreamChainHash || null,
                upstreamNodeType: upstreamNodeType || null,
                upstreamCycleId: kodeCycleFarm || upstreamCycleId || null
            }
        }
    );

    // Create Genesis Block - PreviousHash = upstream's last hash (chain continuity!)
    const genesisBlock = await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'GENESIS',
        dataPayload: {
            event: 'GENESIS',
            node: 'NODE_KURIR',
            pengiriman_id: kodePengiriman,
            tipe_pengiriman: tipePengiriman,
            asal_pengirim: asalPengirim,
            tujuan_penerima: tujuanPenerima,
            tanggal_pickup: tanggalPickup,
            kode_kurir: kodeKurir,
            upstream_linked: !!upstreamChainHash,
            upstream_cycle_id: kodeCycleFarm || upstreamCycleId || null,
            upstream_chain_hash: upstreamChainHash || null,
            upstream_node_type: upstreamNodeType || null,
            chain_continuity: upstreamChainHash ? 'LINKED' : 'STANDALONE'
        },
        transaction
    });

    // If upstream data is available, create LINK_UPSTREAM block
    if (upstreamData && upstreamData.chain) {
        const isProcessor = upstreamData.type === 'PROCESSOR';
        await createBlock(sequelize, {
            kodePerusahaan,
            kodePengiriman,
            tipeBlock: 'LINK_UPSTREAM',
            dataPayload: {
                event: 'LINK_UPSTREAM',
                node: 'NODE_KURIR',
                description: isProcessor
                    ? 'Chain link anchor to upstream Processor blockchain'
                    : 'Chain link anchor to upstream Peternakan blockchain',
                upstream_node: isProcessor ? 'NODE_PROCESSOR' : 'NODE_PETERNAKAN',
                upstream_cycle_id: kodeCycleFarm || upstreamCycleId,
                upstream_chain_identity: upstreamData.chain.kodeIdentity,
                upstream_entity: isProcessor
                    ? upstreamData.chain.namaProcessor
                    : (upstreamData.chain.peternakan || upstreamData.chain.namaPeternakan),
                upstream_genesis_hash: upstreamData.chain.genesisHash,
                upstream_latest_hash: upstreamData.chain.latestBlockHash,
                upstream_total_blocks: upstreamData.chain.totalBlocks,
                upstream_status: upstreamData.chain.statusChain,
                link_timestamp: new Date().toISOString(),
                chain_continuity: 'VERIFIED'
            },
            transaction
        });
    }

    return genesisBlock;
}

/**
 * PICKUP_FARM BLOCK - When courier picks up from farm
 */
async function createPickupFarmBlock(sequelize, { kodePerusahaan, kodePengiriman, kodeBukti, namaPengirim, namaPenerima, jumlahBarang, beratTotal, tanggalTerima, keterangan, transaction = null }) {
    return await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'PICKUP_FARM',
        dataPayload: {
            event: 'PICKUP_FARM',
            node: 'NODE_KURIR',
            kode_bukti: kodeBukti,
            nama_pengirim: namaPengirim,
            nama_penerima_kurir: namaPenerima,
            jumlah_barang: jumlahBarang,
            berat_total_kg: beratTotal,
            tanggal_terima: tanggalTerima,
            keterangan: keterangan,
            source_node: 'NODE_PETERNAKAN',
            target_node: 'NODE_PROCESSOR'
        },
        transaction
    });
}

/**
 * DELIVERY_PROCESSOR BLOCK - When courier delivers to processor
 */
async function createDeliveryProcessorBlock(sequelize, { kodePerusahaan, kodePengiriman, kodeNota, namaPenerima, kondisiBarang, tanggalSampai, keterangan, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const block = await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'DELIVERY_PROCESSOR',
        dataPayload: {
            event: 'DELIVERY_PROCESSOR',
            node: 'NODE_KURIR',
            kode_nota: kodeNota,
            nama_penerima_processor: namaPenerima,
            kondisi_barang: kondisiBarang,
            tanggal_sampai: tanggalSampai,
            keterangan: keterangan,
            chain_handoff: 'FARM_CHAIN_COMPLETED',
            next_chain: 'PROCESSOR_CHAIN_START',
            transfer_status: 'HANDOFF_TO_PROCESSOR'
        },
        transaction
    });

    // Complete the chain
    await sequelize.query(
        `UPDATE BlockchainIdentity SET StatusChain = 'COMPLETED', CompletedAt = NOW() WHERE KodePengiriman = :kodePengiriman`,
        { ...queryOpts, replacements: { kodePengiriman } }
    );

    return block;
}

/**
 * PICKUP_PROCESSOR BLOCK - When courier picks up from processor
 */
async function createPickupProcessorBlock(sequelize, { kodePerusahaan, kodePengiriman, kodeBukti, namaPengirim, namaPenerima, jumlahBarang, beratTotal, tanggalTerima, keterangan, transaction = null }) {
    return await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'PICKUP_PROCESSOR',
        dataPayload: {
            event: 'PICKUP_PROCESSOR',
            node: 'NODE_KURIR',
            kode_bukti: kodeBukti,
            nama_pengirim_processor: namaPengirim,
            nama_penerima_kurir: namaPenerima,
            jumlah_barang: jumlahBarang,
            berat_total_kg: beratTotal,
            tanggal_terima: tanggalTerima,
            keterangan: keterangan,
            source_node: 'NODE_PROCESSOR',
            target_node: 'NODE_RETAILER'
        },
        transaction
    });
}

/**
 * DELIVERY_RETAILER BLOCK - When courier delivers to retailer
 */
async function createDeliveryRetailerBlock(sequelize, { kodePerusahaan, kodePengiriman, kodeNota, namaPenerima, kondisiBarang, tanggalSampai, keterangan, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const block = await createBlock(sequelize, {
        kodePerusahaan,
        kodePengiriman,
        tipeBlock: 'DELIVERY_RETAILER',
        dataPayload: {
            event: 'DELIVERY_RETAILER',
            node: 'NODE_KURIR',
            kode_nota: kodeNota,
            nama_penerima_retailer: namaPenerima,
            kondisi_barang: kondisiBarang,
            tanggal_sampai: tanggalSampai,
            keterangan: keterangan,
            chain_handoff: 'PROCESSOR_CHAIN_COMPLETED',
            next_chain: 'RETAILER_CHAIN_START',
            transfer_status: 'HANDOFF_TO_RETAILER'
        },
        transaction
    });

    // Complete the chain
    await sequelize.query(
        `UPDATE BlockchainIdentity SET StatusChain = 'COMPLETED', CompletedAt = NOW() WHERE KodePengiriman = :kodePengiriman`,
        { ...queryOpts, replacements: { kodePengiriman } }
    );

    return block;
}

/**
 * Validate chain integrity for a shipment.
 * Takes into account the upstream chain hash for cross-chain continuity.
 */
async function validateChain(sequelize, kodePengiriman) {
    const blocks = await sequelize.query(
        `SELECT IdBlock, BlockIndex, CurrentHash, PreviousHash, TipeBlock, DataPayload, CreatedAt 
         FROM ledger_kurir 
         WHERE KodePengiriman = :kodePengiriman 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
    );

    if (blocks.length === 0) {
        return { valid: false, message: 'No blocks found', totalBlocks: 0 };
    }

    // Get the upstream chain hash to know what the genesis block's PreviousHash should be
    const [identity] = await sequelize.query(
        `SELECT UpstreamChainHash FROM BlockchainIdentity WHERE KodePengiriman = :kodePengiriman LIMIT 1`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
    );

    // If upstream hash exists, the genesis block should start from it (chain continuity)
    // Otherwise, fall back to 000...000
    let expectedPrevHash = (identity && identity.UpstreamChainHash) ? identity.UpstreamChainHash : GENESIS_PREV_HASH;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.PreviousHash !== expectedPrevHash) {
            return {
                valid: false,
                message: `Chain broken at block ${i}: Previous hash mismatch. Expected: ${expectedPrevHash.substring(0, 16)}..., Got: ${block.PreviousHash.substring(0, 16)}...`,
                blockIndex: i,
                totalBlocks: blocks.length,
                upstreamLinked: !!(identity && identity.UpstreamChainHash)
            };
        }
        expectedPrevHash = block.CurrentHash;
    }

    return {
        valid: true,
        message: 'Chain integrity verified ✓',
        totalBlocks: blocks.length,
        upstreamLinked: !!(identity && identity.UpstreamChainHash),
        upstreamHash: identity?.UpstreamChainHash || null
    };
}

/**
 * Get full traceability data for a shipment (Kurir chain only)
 */
async function getTraceabilityData(sequelize, kodePengiriman) {
    // Get chain identity
    const [identity] = await sequelize.query(
        `SELECT bi.*, pk.NamaPerusahaan, pk.AlamatPerusahaan 
         FROM BlockchainIdentity bi 
         JOIN PerusahaanKurir pk ON bi.KodePerusahaan = pk.KodePerusahaan 
         WHERE bi.KodePengiriman = :kodePengiriman`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
    );

    if (!identity) return null;

    // Get all blocks
    const blocks = await sequelize.query(
        `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash, DataPayload, StatusBlock, CreatedAt 
         FROM ledger_kurir 
         WHERE KodePengiriman = :kodePengiriman 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
    );

    // Validate chain
    const validation = await validateChain(sequelize, kodePengiriman);

    // Build timeline summary
    const timeline = blocks.map(b => {
        let payload = b.DataPayload;
        if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
        }
        return {
            index: b.BlockIndex,
            type: b.TipeBlock,
            hash: b.CurrentHash.substring(0, 16),
            timestamp: b.CreatedAt,
            summary: getBlockSummary(b.TipeBlock, payload)
        };
    });

    return {
        chain: {
            kodeIdentity: identity.KodeIdentity,
            perusahaanKurir: identity.NamaPerusahaan,
            alamat: identity.AlamatPerusahaan,
            statusChain: identity.StatusChain,
            totalBlocks: identity.TotalBlocks,
            createdAt: identity.CreatedAt,
            completedAt: identity.CompletedAt,
            upstreamChainHash: identity.UpstreamChainHash,
            upstreamNodeType: identity.UpstreamNodeType,
            upstreamCycleId: identity.UpstreamCycleId
        },
        blocks,
        timeline,
        validation,
        nodeType: 'NODE_KURIR',
        nodeDescription: 'Courier / Kurir (Transportation Node in Supply Chain)'
    };
}

/**
 * Get CROSS-CHAIN traceability data - combines Peternakan + Kurir chains
 * This is the unified view showing the full supply chain
 */
async function getCrossChainTraceability(sequelize, kodePengiriman) {
    // 1. Get Kurir chain data
    const kurirData = await getTraceabilityData(sequelize, kodePengiriman);
    if (!kurirData) return null;

    const result = {
        kurirChain: kurirData,
        peternakanChain: null,
        crossChainValid: false,
        crossChainMessage: '',
        unifiedTimeline: [],
        supplyChainNodes: []
    };

    // 2. Try to get upstream Peternakan chain
    const upstreamCycleId = kurirData.chain.upstreamCycleId;

    if (!upstreamCycleId) {
        // Try to find via Pengiriman.UpstreamCycleId
        const [pengiriman] = await sequelize.query(
            `SELECT UpstreamCycleId, ReferensiEksternal FROM Pengiriman WHERE KodePengiriman = :kodePengiriman`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kodePengiriman } }
        );
        if (pengiriman && pengiriman.UpstreamCycleId) {
            kurirData.chain.upstreamCycleId = pengiriman.UpstreamCycleId;
        }
    }

    const cycleId = kurirData.chain.upstreamCycleId;

    if (cycleId) {
        try {
            const peternakanData = await crossChain.getPeternakanBlockchainByCycle(cycleId);
            if (peternakanData) {
                result.peternakanChain = peternakanData;

                // Validate upstream chain
                const peternakanValidation = await crossChain.validatePeternakanChain(cycleId);
                result.peternakanChain.validation = peternakanValidation;

                // Check cross-chain linkage
                if (kurirData.chain.upstreamChainHash) {
                    if (kurirData.chain.upstreamChainHash === peternakanData.chain.latestBlockHash) {
                        result.crossChainValid = true;
                        result.crossChainMessage = 'Cross-chain link verified ✓ - Hash peternakan cocok dengan referensi kurir';
                    } else {
                        // Check if the upstream hash exists anywhere in the peternakan chain
                        const hashExists = peternakanData.blocks.some(b => b.CurrentHash === kurirData.chain.upstreamChainHash);
                        if (hashExists) {
                            result.crossChainValid = true;
                            result.crossChainMessage = 'Cross-chain link verified ✓ - Hash ditemukan di chain peternakan (chain peternakan telah bertambah sejak linking)';
                        } else {
                            result.crossChainValid = false;
                            result.crossChainMessage = '⚠ Cross-chain hash mismatch - kemungkinan data peternakan telah berubah';
                        }
                    }
                } else {
                    result.crossChainValid = true;
                    result.crossChainMessage = 'Chain terhubung (tanpa hash anchor)';
                }

                // Build unified timeline
                const peternakanTimeline = peternakanData.blocks.map(b => {
                    let payload = b.DataPayload;
                    if (typeof payload === 'string') {
                        try { payload = JSON.parse(payload); } catch (e) { /* noop */ }
                    }
                    return {
                        node: 'NODE_PETERNAKAN',
                        nodeLabel: '🏗️ Peternakan',
                        index: b.BlockIndex,
                        type: b.TipeBlock,
                        hash: b.CurrentHash ? b.CurrentHash.substring(0, 16) : '',
                        timestamp: b.CreatedAt,
                        summary: getPeternakanBlockSummary(b.TipeBlock, payload),
                        payload: payload
                    };
                });

                const kurirTimeline = kurirData.timeline.map(t => ({
                    ...t,
                    node: 'NODE_KURIR',
                    nodeLabel: '🚛 Kurir'
                }));

                // Merge and sort by timestamp
                result.unifiedTimeline = [...peternakanTimeline, ...kurirTimeline]
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

                // Supply chain node summary
                result.supplyChainNodes = [
                    {
                        node: 'NODE_PETERNAKAN',
                        label: 'Peternakan',
                        icon: '🏗️',
                        status: peternakanData.chain.statusChain,
                        totalBlocks: peternakanData.blocks.length,
                        chainValid: peternakanValidation.valid,
                        identity: peternakanData.chain.kodeIdentity,
                        name: peternakanData.chain.peternakan
                    },
                    {
                        node: 'NODE_KURIR',
                        label: 'Kurir',
                        icon: '🚛',
                        status: kurirData.chain.statusChain,
                        totalBlocks: kurirData.blocks.length,
                        chainValid: kurirData.validation.valid,
                        identity: kurirData.chain.kodeIdentity,
                        name: kurirData.chain.perusahaanKurir
                    }
                ];
            }
        } catch (error) {
            console.error('Cross-chain fetch error:', error.message);
            result.crossChainMessage = 'Tidak dapat mengakses data peternakan: ' + error.message;
        }
    } else {
        result.crossChainMessage = 'Tidak ada referensi upstream (cycle peternakan tidak di-link)';
    }

    // If no peternakan data, unified timeline is just kurir
    if (!result.peternakanChain) {
        result.unifiedTimeline = kurirData.timeline.map(t => ({
            ...t,
            node: 'NODE_KURIR',
            nodeLabel: '🚛 Kurir'
        }));
        result.supplyChainNodes = [{
            node: 'NODE_KURIR',
            label: 'Kurir',
            icon: '🚛',
            status: kurirData.chain.statusChain,
            totalBlocks: kurirData.blocks.length,
            chainValid: kurirData.validation.valid,
            identity: kurirData.chain.kodeIdentity,
            name: kurirData.chain.perusahaanKurir
        }];
    }

    return result;
}

/**
 * Get human-readable summary for a block type (Kurir)
 */
function getBlockSummary(tipeBlock, payload) {
    switch (tipeBlock) {
        case 'GENESIS':
            return `Pengiriman dimulai: ${payload.asal_pengirim || '?'} → ${payload.tujuan_penerima || '?'}`;
        case 'LINK_UPSTREAM':
            return `🔗 Linked to ${payload.upstream_node || 'upstream'}: ${payload.upstream_peternakan || '?'} (${payload.upstream_total_blocks || '?'} blocks)`;
        case 'PICKUP_FARM':
            return `Pickup dari peternakan: ${payload.berat_total_kg || '?'} kg (${payload.jumlah_barang || '?'} item)`;
        case 'DELIVERY_PROCESSOR':
            return `Diterima processor: ${payload.nama_penerima_processor || '?'} (kondisi: ${payload.kondisi_barang || '?'})`;
        case 'PICKUP_PROCESSOR':
            return `Pickup dari processor: ${payload.berat_total_kg || '?'} kg (${payload.jumlah_barang || '?'} item)`;
        case 'DELIVERY_RETAILER':
            return `Diterima retailer: ${payload.nama_penerima_retailer || '?'} (kondisi: ${payload.kondisi_barang || '?'})`;
        default:
            return tipeBlock;
    }
}

/**
 * Get human-readable summary for Peternakan block types (for cross-chain display)
 */
function getPeternakanBlockSummary(tipeBlock, payload) {
    if (!payload) return tipeBlock;
    switch (tipeBlock) {
        case 'GENESIS':
            return `Cycle dimulai (durasi: ${payload.durasi_cycle || '?'} hari)`;
        case 'KANDANG_AKTIF':
            return `Kandang ${payload.kode_kandang || '?'} diaktifkan`;
        case 'DOC_MASUK':
            return `${payload.jumlah_diterima || '?'} ekor DOC masuk (${payload.brand_doc || '?'} - ${payload.tipe_ayam || '?'})`;
        case 'LAPORAN_MORTALITY':
            return `Mortality: ${payload.jumlah_mati || 0} mati, ${payload.jumlah_reject || 0} reject (rate: ${payload.mortality_rate_percent || '?'}%)`;
        case 'PEMAKAIAN_OBAT':
            return `Obat ${payload.jenis_obat || '?'} digunakan (${payload.jumlah_obat || '?'} unit)`;
        case 'PANEN':
            return `Panen sukses: ${payload.total_berat_kg || '?'} kg`;
        case 'PANEN_DINI':
            return `Panen dini: ${payload.total_berat_kg || '?'} kg`;
        case 'GAGAL_PANEN':
            return `Gagal panen (mortality: ${payload.mortality_rate_final || '?'}%)`;
        case 'TRANSFER_PROCESSOR':
            return `Transfer ke ${payload.perusahaan_pengiriman || 'Processor'}`;
        default:
            return tipeBlock;
    }
}

module.exports = {
    generateHash,
    createBlock,
    createGenesisBlock,
    createPickupFarmBlock,
    createDeliveryProcessorBlock,
    createPickupProcessorBlock,
    createDeliveryRetailerBlock,
    validateChain,
    getTraceabilityData,
    getCrossChainTraceability,
    GENESIS_PREV_HASH
};
