// ============================================================================
// BLOCKCHAIN HELPER - Application-Level Blockchain for Node Retailer
// ============================================================================
// Mirrors the Processor website's blockchain pattern.
// Block identity = Order (linked to Processor's chain)
// Multi-chain: Peternakan → Processor → Retailer
// ============================================================================

const crypto = require('crypto');

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
 * Get the previous hash for a given identity chain.
 * If no blocks exist yet (genesis), returns the upstream (Processor) last block hash
 * to maintain cross-chain hash continuity.
 */
async function getPreviousHash(sequelize, idIdentity, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT CurrentHash FROM ledger_retailer 
         WHERE IdIdentity = :idIdentity 
         ORDER BY BlockIndex DESC LIMIT 1`,
        { ...opts, replacements: { idIdentity } }
    );

    if (result) return result.CurrentHash;

    // No blocks yet - check if there's an upstream (Processor) chain hash for continuity
    const [identity] = await sequelize.query(
        `SELECT ProcessorLastBlockHash FROM blockchainidentity 
         WHERE IdIdentity = :idIdentity LIMIT 1`,
        { ...opts, replacements: { idIdentity } }
    );

    return (identity && identity.ProcessorLastBlockHash) ? identity.ProcessorLastBlockHash : GENESIS_PREV_HASH;
}

/**
 * Get next block index for an identity chain
 */
async function getNextBlockIndex(sequelize, idIdentity, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT COALESCE(MAX(BlockIndex), -1) + 1 AS nextIndex 
         FROM ledger_retailer 
         WHERE IdIdentity = :idIdentity`,
        { ...opts, replacements: { idIdentity } }
    );

    return result ? result.nextIndex : 0;
}

/**
 * Create a new block in the ledger
 */
async function createBlock(sequelize, { idIdentity, idOrder, idGudang, idPenjualan, tipeBlock, dataPayload, kodeBlock, transaction = null }) {
    const blockIndex = await getNextBlockIndex(sequelize, idIdentity, transaction);
    const previousHash = await getPreviousHash(sequelize, idIdentity, transaction);

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const nonce = 0;

    const currentHash = generateHash(blockIndex, previousHash, tipeBlock, dataPayload, timestamp, nonce);

    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const [identityResult] = await sequelize.query(
        `SELECT IdRetailer FROM blockchainidentity WHERE IdIdentity = :idIdentity LIMIT 1`,
        { ...queryOpts, replacements: { idIdentity } }
    );
    const idRetailer = identityResult && identityResult.length > 0 ? identityResult[0].IdRetailer : null;

    await sequelize.query(
        `INSERT INTO ledger_retailer 
         (KodeBlock, IdIdentity, IdRetailer, IdOrder, IdGudang, IdPenjualan, TipeBlock, BlockIndex, PreviousHash, CurrentHash, DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt) 
         VALUES (:kodeBlock, :idIdentity, :idRetailer, :idOrder, :idGudang, :idPenjualan, :tipeBlock, :blockIndex, :previousHash, :currentHash, :dataPayload, :nonce, 'VALIDATED', NOW(), NOW())`,
        {
            ...queryOpts,
            replacements: {
                kodeBlock,
                idIdentity,
                idRetailer,
                idOrder: idOrder || null,
                idGudang: idGudang || null,
                idPenjualan: idPenjualan || null,
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
        `UPDATE blockchainidentity 
         SET LatestBlockHash = :currentHash, TotalBlocks = TotalBlocks + 1 
         WHERE IdIdentity = :idIdentity`,
        {
            ...queryOpts,
            replacements: { currentHash, idIdentity }
        }
    );

    return { kodeBlock, blockIndex, previousHash, currentHash, tipeBlock };
}

// ============================================================================
// HIGH-LEVEL BLOCKCHAIN EVENT FUNCTIONS
// ============================================================================

/**
 * RECEIVE_FROM_PROCESSOR BLOCK (Genesis) — When order is received from processor
 */
async function createReceiveFromProcessorBlock(sequelize, {
    idIdentity, idOrder, kodeBlock,
    kodeOrder, namaProcessor, namaProduk,
    jumlahDiterima, penerimaOrder, tanggalDiterima, kondisiTerima,
    kodeOrderProcessor, processorLastBlockHash,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idGudang: null,
        idPenjualan: null,
        tipeBlock: 'RECEIVE_FROM_PROCESSOR',
        kodeBlock,
        dataPayload: {
            event: 'RECEIVE_FROM_PROCESSOR',
            node: 'NODE_RETAILER',
            kode_order: kodeOrder,
            nama_processor: namaProcessor,
            nama_produk: namaProduk,
            jumlah_diterima: jumlahDiterima,
            penerima_order: penerimaOrder,
            tanggal_diterima: tanggalDiterima,
            kondisi_terima: kondisiTerima,
            link_processor_chain: {
                kode_order_processor: kodeOrderProcessor || null,
                processor_last_block_hash: processorLastBlockHash || null,
                previous_node: 'NODE_PROCESSOR'
            }
        },
        transaction
    });
}

/**
 * NOTA_PENERIMAAN BLOCK — When reception note is created
 */
async function createNotaPenerimaanBlock(sequelize, {
    idIdentity, idOrder, kodeBlock,
    kodeNotaPenerimaan, kodeNotaPengirimanProcessor,
    namaPengirim, namaPenerima,
    jumlahDikirim, jumlahDiterima, jumlahRusak,
    kondisiBarang, suhuSaatTerima, tanggalPenerimaan,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idGudang: null,
        idPenjualan: null,
        tipeBlock: 'NOTA_PENERIMAAN',
        kodeBlock,
        dataPayload: {
            event: 'NOTA_PENERIMAAN',
            node: 'NODE_RETAILER',
            kode_nota_penerimaan: kodeNotaPenerimaan,
            kode_nota_pengiriman_processor: kodeNotaPengirimanProcessor || null,
            nama_pengirim: namaPengirim,
            nama_penerima: namaPenerima,
            jumlah_dikirim: jumlahDikirim,
            jumlah_diterima: jumlahDiterima,
            jumlah_rusak: jumlahRusak || 0,
            kondisi_barang: kondisiBarang,
            suhu_saat_terima: suhuSaatTerima,
            tanggal_penerimaan: tanggalPenerimaan,
            selisih: (jumlahDikirim || 0) - (jumlahDiterima || 0)
        },
        transaction
    });
}

/**
 * STOCK_IN BLOCK — When stock is added to warehouse
 */
async function createStockInBlock(sequelize, {
    idIdentity, idOrder, idGudang, kodeBlock,
    kodeGudang, namaProduk, jenisProduk,
    jumlahMasuk, satuan, tanggalMasuk,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idGudang,
        idPenjualan: null,
        tipeBlock: 'STOCK_IN',
        kodeBlock,
        dataPayload: {
            event: 'STOCK_IN',
            node: 'NODE_RETAILER',
            kode_gudang: kodeGudang,
            nama_produk: namaProduk,
            jenis_produk: jenisProduk,
            jumlah_masuk: jumlahMasuk,
            satuan: satuan,
            tanggal_masuk: tanggalMasuk
        },
        transaction
    });
}

/**
 * SALE_RECORDED BLOCK — When a sale is recorded
 */
async function createSaleRecordedBlock(sequelize, {
    idIdentity, idPenjualan, kodeBlock,
    kodePenjualan, tanggalPenjualan, namaPembeli,
    totalItem, totalHarga, metodePembayaran, items,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder: null,
        idGudang: null,
        idPenjualan,
        tipeBlock: 'SALE_RECORDED',
        kodeBlock,
        dataPayload: {
            event: 'SALE_RECORDED',
            node: 'NODE_RETAILER',
            kode_penjualan: kodePenjualan,
            tanggal_penjualan: tanggalPenjualan,
            nama_pembeli: namaPembeli || 'Umum',
            total_item: totalItem,
            total_harga: totalHarga,
            metode_pembayaran: metodePembayaran,
            items: items
        },
        transaction
    });
}

/**
 * Validate chain integrity for an identity.
 * Takes into account the upstream (Processor) chain hash for cross-chain continuity.
 */
async function validateChain(sequelize, idIdentity) {
    const blocks = await sequelize.query(
        `SELECT IdBlock, BlockIndex, CurrentHash, PreviousHash, TipeBlock, DataPayload, CreatedAt 
         FROM ledger_retailer 
         WHERE IdIdentity = :idIdentity 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
    );

    if (blocks.length === 0) {
        return { valid: false, message: 'No blocks found', totalBlocks: 0 };
    }

    // Get the upstream (Processor) chain hash to know what the genesis block's PreviousHash should be
    const [identity] = await sequelize.query(
        `SELECT ProcessorLastBlockHash FROM blockchainidentity WHERE IdIdentity = :idIdentity LIMIT 1`,
        { type: sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
    );

    // If ProcessorLastBlockHash exists, the genesis block should start from it (chain continuity)
    let expectedPrevHash = (identity && identity.ProcessorLastBlockHash) ? identity.ProcessorLastBlockHash : GENESIS_PREV_HASH;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.PreviousHash !== expectedPrevHash) {
            return {
                valid: false,
                message: `Chain broken at block ${i}: Previous hash mismatch.`,
                blockIndex: i,
                totalBlocks: blocks.length,
                upstreamLinked: !!(identity && identity.ProcessorLastBlockHash)
            };
        }
        expectedPrevHash = block.CurrentHash;
    }

    return {
        valid: true,
        message: 'Chain integrity verified ✓',
        totalBlocks: blocks.length,
        upstreamLinked: !!(identity && identity.ProcessorLastBlockHash),
        upstreamHash: identity?.ProcessorLastBlockHash || null
    };
}

/**
 * Get full traceability data for an order
 */
async function getTraceabilityData(sequelize, idIdentity) {
    const [identity] = await sequelize.query(
        `SELECT bi.*, o.KodeOrder, o.NamaProcessor, o.NamaProduk, o.TanggalOrder
         FROM blockchainidentity bi 
         JOIN orders o ON bi.IdOrder = o.IdOrder 
         WHERE bi.IdIdentity = :idIdentity`,
        { type: sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
    );

    if (!identity) return null;

    const blocks = await sequelize.query(
        `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash, DataPayload, StatusBlock, CreatedAt 
         FROM ledger_retailer 
         WHERE IdIdentity = :idIdentity 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
    );

    const validation = await validateChain(sequelize, idIdentity);

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
            kodeOrder: identity.KodeOrder,
            namaProcessor: identity.NamaProcessor,
            namaProduk: identity.NamaProduk,
            statusChain: identity.StatusChain,
            totalBlocks: identity.TotalBlocks,
            createdAt: identity.CreatedAt,
            completedAt: identity.CompletedAt,
            processorLink: {
                kodeOrderProcessor: identity.KodeOrderProcessor,
                kodeProcessor: identity.KodeProcessor,
                processorLastBlockHash: identity.ProcessorLastBlockHash
            }
        },
        blocks,
        timeline,
        validation,
        nodeType: 'NODE_RETAILER',
        nodeDescription: 'Retailer (Third Node in Supply Chain)'
    };
}

/**
 * Get human-readable summary for a block type
 */
function getBlockSummary(tipeBlock, payload) {
    switch (tipeBlock) {
        case 'RECEIVE_FROM_PROCESSOR':
            return `Diterima dari ${payload.nama_processor || '?'}: ${payload.jumlah_diterima || '?'} unit`;
        case 'NOTA_PENERIMAAN':
            return `Nota penerimaan: ${payload.jumlah_diterima || '?'} diterima, ${payload.jumlah_rusak || 0} rusak`;
        case 'STOCK_IN':
            return `Stok masuk: ${payload.jumlah_masuk || '?'} ${payload.satuan || ''} ${payload.nama_produk || ''}`;
        case 'SALE_RECORDED':
            return `Penjualan: ${payload.total_item || '?'} item, Rp ${Number(payload.total_harga || 0).toLocaleString('id-ID')}`;
        case 'STOCK_OUT':
            return `Stok keluar: pengurangan stok gudang`;
        default:
            return tipeBlock;
    }
}

module.exports = {
    generateHash,
    createBlock,
    createReceiveFromProcessorBlock,
    createNotaPenerimaanBlock,
    createStockInBlock,
    createSaleRecordedBlock,
    validateChain,
    getTraceabilityData,
    GENESIS_PREV_HASH
};
