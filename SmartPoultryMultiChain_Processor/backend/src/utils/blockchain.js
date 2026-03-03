// ============================================================================
// BLOCKCHAIN HELPER - Application-Level Blockchain for Node Processor
// ============================================================================
// Mirrors the Farm website's blockchain pattern.
// Block identity = Order (linked to Farm's Cycle chain)
// Multi-chain: Peternakan → Processor → Retailer → Consumer
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
 * Get the previous hash for a given identity chain
 */
async function getPreviousHash(sequelize, idIdentity, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT CurrentHash FROM ledger_processor 
         WHERE IdIdentity = :idIdentity 
         ORDER BY BlockIndex DESC LIMIT 1`,
        { ...opts, replacements: { idIdentity } }
    );

    return result ? result.CurrentHash : GENESIS_PREV_HASH;
}

/**
 * Get next block index for an identity chain
 */
async function getNextBlockIndex(sequelize, idIdentity, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT COALESCE(MAX(BlockIndex), -1) + 1 AS nextIndex 
         FROM ledger_processor 
         WHERE IdIdentity = :idIdentity`,
        { ...opts, replacements: { idIdentity } }
    );

    return result ? result.nextIndex : 0;
}

/**
 * Create a new block in the ledger
 */
async function createBlock(sequelize, { idIdentity, idOrder, idProduksi, tipeBlock, dataPayload, kodeBlock, transaction = null }) {
    const blockIndex = await getNextBlockIndex(sequelize, idIdentity, transaction);
    const previousHash = await getPreviousHash(sequelize, idIdentity, transaction);

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

    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const [identityResult] = await sequelize.query(
        `SELECT IdProcessor FROM blockchainidentity WHERE IdIdentity = :idIdentity LIMIT 1`,
        { ...queryOpts, replacements: { idIdentity } }
    );
    const idProcessor = identityResult && identityResult.length > 0 ? identityResult[0].IdProcessor : null;

    await sequelize.query(
        `INSERT INTO ledger_processor 
         (KodeBlock, IdIdentity, IdProcessor, IdOrder, IdProduksi, TipeBlock, BlockIndex, PreviousHash, CurrentHash, DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt) 
         VALUES (:kodeBlock, :idIdentity, :idProcessor, :idOrder, :idProduksi, :tipeBlock, :blockIndex, :previousHash, :currentHash, :dataPayload, :nonce, 'VALIDATED', NOW(), NOW())`,
        {
            ...queryOpts,
            replacements: {
                kodeBlock,
                idIdentity,
                idProcessor,
                idOrder: idOrder || null,
                idProduksi: idProduksi || null,
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
// These are called from route handlers to automatically record events
// ============================================================================

/**
 * RECEIVE_FROM_FARM BLOCK (Genesis) — When order is received from farm 
 * This is the first block in the Processor chain.
 * It links to the farm's chain via KodeCycleFarm and FarmLastBlockHash.
 */
async function createReceiveFromFarmBlock(sequelize, {
    idIdentity, idOrder, kodeBlock,
    kodeOrder, namaPeternakan, jenisAyam,
    jumlahDiterima, penerimaOrder, tanggalDiterima, kondisiTerima,
    kodeCycleFarm, farmLastBlockHash,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idProduksi: null,
        tipeBlock: 'RECEIVE_FROM_FARM',
        kodeBlock,
        dataPayload: {
            event: 'RECEIVE_FROM_FARM',
            node: 'NODE_PROCESSOR',
            kode_order: kodeOrder,
            nama_peternakan: namaPeternakan,
            jenis_ayam: jenisAyam,
            jumlah_diterima: jumlahDiterima,
            penerima_order: penerimaOrder,
            tanggal_diterima: tanggalDiterima,
            kondisi_terima: kondisiTerima,
            link_farm_chain: {
                kode_cycle_farm: kodeCycleFarm || null,
                farm_last_block_hash: farmLastBlockHash || null,
                previous_node: 'NODE_PETERNAKAN'
            }
        },
        transaction
    });
}

/**
 * NOTA_PENERIMAAN BLOCK — When reception note is created
 * This formally links the farm's shipping note (NotaPengiriman) 
 * to the processor's reception note (NotaPenerimaan)
 */
async function createNotaPenerimaanBlock(sequelize, {
    idIdentity, idOrder, kodeBlock,
    kodeNotaPenerimaan, kodeNotaPengirimanFarm,
    namaPengirim, namaPenerima,
    jumlahDikirim, jumlahDiterima, jumlahRusak,
    kondisiAyam, suhuSaatTerima, tanggalPenerimaan,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idProduksi: null,
        tipeBlock: 'NOTA_PENERIMAAN',
        kodeBlock,
        dataPayload: {
            event: 'NOTA_PENERIMAAN',
            node: 'NODE_PROCESSOR',
            kode_nota_penerimaan: kodeNotaPenerimaan,
            kode_nota_pengiriman_farm: kodeNotaPengirimanFarm || null,
            nama_pengirim: namaPengirim,
            nama_penerima: namaPenerima,
            jumlah_dikirim: jumlahDikirim,
            jumlah_diterima: jumlahDiterima,
            jumlah_rusak: jumlahRusak || 0,
            kondisi_ayam: kondisiAyam,
            suhu_saat_terima: suhuSaatTerima,
            tanggal_penerimaan: tanggalPenerimaan,
            selisih: (jumlahDikirim || 0) - (jumlahDiterima || 0)
        },
        transaction
    });
}

/**
 * PROCESSING BLOCK — When production record is created
 */
async function createProcessingBlock(sequelize, {
    idIdentity, idOrder, idProduksi, kodeBlock,
    kodeProduksi, jenisAyam, jumlahInput, jumlahOutput,
    beratTotal, varian, tanggalProduksi, sertifikatHalal,
    transaction = null
}) {
    const yieldRate = jumlahInput > 0 ? parseFloat(((jumlahOutput / jumlahInput) * 100).toFixed(2)) : 0;

    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idProduksi,
        tipeBlock: 'PROCESSING',
        kodeBlock,
        dataPayload: {
            event: 'PROCESSING',
            node: 'NODE_PROCESSOR',
            kode_produksi: kodeProduksi,
            jenis_ayam: jenisAyam,
            jumlah_input: jumlahInput,
            jumlah_output: jumlahOutput,
            berat_total_kg: beratTotal || 0,
            varian: varian || '',
            tanggal_produksi: tanggalProduksi,
            sertifikat_halal: sertifikatHalal || 'TIDAK_ADA',
            yield_rate_percent: yieldRate
        },
        transaction
    });
}

/**
 * HALAL_CHECK BLOCK — When halal certificate is verified
 */
async function createHalalCheckBlock(sequelize, {
    idIdentity, idOrder, idProduksi, kodeBlock,
    kodeSertifikat, kodeProduksi,
    nomorSertifikat, lembagaPenerbit,
    tanggalTerbit, tanggalExpired,
    statusHalal, metodePenyembelihan, hasilVerifikasi,
    tanggalPengecekan,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idProduksi,
        tipeBlock: 'HALAL_CHECK',
        kodeBlock,
        dataPayload: {
            event: 'HALAL_CHECK',
            node: 'NODE_PROCESSOR',
            kode_sertifikat: kodeSertifikat,
            kode_produksi: kodeProduksi,
            nomor_sertifikat: nomorSertifikat || null,
            lembaga_penerbit: lembagaPenerbit || null,
            tanggal_terbit: tanggalTerbit || null,
            tanggal_expired: tanggalExpired || null,
            status_halal: statusHalal,
            metode_penyembelihan: metodePenyembelihan || null,
            hasil_verifikasi: hasilVerifikasi,
            tanggal_pengecekan: tanggalPengecekan,
            is_halal_valid: hasilVerifikasi === 'LOLOS' && statusHalal === 'VALID'
        },
        transaction
    });
}

/**
 * QUALITY_CHECK BLOCK — When QC is performed
 */
async function createQualityCheckBlock(sequelize, {
    idIdentity, idOrder, idProduksi, kodeBlock,
    kodeQC, kodeProduksi,
    hasilQC, suhu, kelembaban, warnaAyam, bauAyam, teksturAyam,
    tanggalQC,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idProduksi,
        tipeBlock: 'QUALITY_CHECK',
        kodeBlock,
        dataPayload: {
            event: 'QUALITY_CHECK',
            node: 'NODE_PROCESSOR',
            kode_qc: kodeQC,
            kode_produksi: kodeProduksi,
            hasil_qc: hasilQC,
            suhu: suhu || null,
            kelembaban: kelembaban || null,
            warna_ayam: warnaAyam || '',
            bau_ayam: bauAyam || 'NORMAL',
            tekstur_ayam: teksturAyam || 'NORMAL',
            tanggal_qc: tanggalQC,
            quality_passed: hasilQC === 'LULUS'
        },
        transaction
    });
}

/**
 * LAPORAN_MASALAH BLOCK — When a production issue is reported
 */
async function createLaporanMasalahBlock(sequelize, {
    idIdentity, idOrder, idProduksi, kodeBlock,
    kodeLaporan, kodeProduksi,
    jenisMasalah, tingkat, deskripsiMasalah, tindakanKorektif,
    tanggalLaporan,
    transaction = null
}) {
    return await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idProduksi,
        tipeBlock: 'LAPORAN_MASALAH',
        kodeBlock,
        dataPayload: {
            event: 'LAPORAN_MASALAH',
            node: 'NODE_PROCESSOR',
            kode_laporan: kodeLaporan,
            kode_produksi: kodeProduksi,
            jenis_masalah: jenisMasalah,
            tingkat: tingkat,
            deskripsi_masalah: deskripsiMasalah,
            tindakan_korektif: tindakanKorektif || null,
            tanggal_laporan: tanggalLaporan,
            is_critical: tingkat === 'KRITIS' || tingkat === 'BERAT'
        },
        transaction
    });
}

/**
 * TRANSFER_TO_RETAIL BLOCK — When product is shipped to retail
 * This completes the Processor chain and prepares handoff to Retailer
 */
async function createTransferToRetailBlock(sequelize, {
    idIdentity, idOrder, idProduksi, kodeBlock,
    kodePengiriman, kodeProduksi,
    tujuanPengiriman, namaPenerima,
    jumlahKirim, beratKirim, metodePengiriman,
    tanggalKirim,
    transaction = null
}) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const block = await createBlock(sequelize, {
        idIdentity,
        idOrder,
        idProduksi,
        tipeBlock: 'TRANSFER_TO_RETAIL',
        kodeBlock,
        dataPayload: {
            event: 'TRANSFER_TO_RETAIL',
            node: 'NODE_PROCESSOR',
            kode_pengiriman: kodePengiriman,
            kode_produksi: kodeProduksi,
            tujuan_pengiriman: tujuanPengiriman,
            nama_penerima: namaPenerima,
            jumlah_kirim: jumlahKirim,
            berat_kirim_kg: beratKirim || 0,
            metode_pengiriman: metodePengiriman || 'DIANTAR',
            tanggal_kirim: tanggalKirim,
            next_node: 'NODE_RETAILER',
            transfer_status: 'READY_FOR_HANDOFF'
        },
        transaction
    });

    // Update chain status to TRANSFERRED
    await sequelize.query(
        `UPDATE blockchainidentity SET StatusChain = 'TRANSFERRED', CompletedAt = NOW() WHERE IdIdentity = :idIdentity`,
        { ...queryOpts, replacements: { idIdentity } }
    );

    return block;
}

/**
 * Validate chain integrity for an identity
 */
async function validateChain(sequelize, idIdentity) {
    const blocks = await sequelize.query(
        `SELECT IdBlock, BlockIndex, CurrentHash, PreviousHash, TipeBlock, DataPayload, CreatedAt 
         FROM ledger_processor 
         WHERE IdIdentity = :idIdentity 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
    );

    if (blocks.length === 0) {
        return { valid: false, message: 'No blocks found', totalBlocks: 0 };
    }

    let expectedPrevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i];
        if (block.PreviousHash !== expectedPrevHash) {
            return {
                valid: false,
                message: `Chain broken at block ${i}: Previous hash mismatch. Expected: ${expectedPrevHash.substring(0, 16)}..., Got: ${block.PreviousHash.substring(0, 16)}...`,
                blockIndex: i,
                totalBlocks: blocks.length
            };
        }
        expectedPrevHash = block.CurrentHash;
    }

    return { valid: true, message: 'Chain integrity verified ✓', totalBlocks: blocks.length };
}

/**
 * Get full traceability data for an order
 * This includes both the Processor chain and the linked Farm chain data
 */
async function getTraceabilityData(sequelize, idIdentity) {
    // Get chain identity
    const [identity] = await sequelize.query(
        `SELECT bi.*, o.KodeOrder, o.NamaPeternakan, o.JenisAyam, o.TanggalOrder
         FROM blockchainidentity bi 
         JOIN orders o ON bi.IdOrder = o.IdOrder 
         WHERE bi.IdIdentity = :idIdentity`,
        { type: sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
    );

    if (!identity) return null;

    // Get all blocks
    const blocks = await sequelize.query(
        `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash, DataPayload, StatusBlock, CreatedAt 
         FROM ledger_processor 
         WHERE IdIdentity = :idIdentity 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { idIdentity } }
    );

    // Validate chain
    const validation = await validateChain(sequelize, idIdentity);

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
            kodeOrder: identity.KodeOrder,
            namaPeternakan: identity.NamaPeternakan,
            jenisAyam: identity.JenisAyam,
            statusChain: identity.StatusChain,
            totalBlocks: identity.TotalBlocks,
            createdAt: identity.CreatedAt,
            completedAt: identity.CompletedAt,
            farmLink: {
                kodeCycleFarm: identity.KodeCycleFarm,
                kodePeternakan: identity.KodePeternakan,
                farmLastBlockHash: identity.FarmLastBlockHash
            }
        },
        blocks,
        timeline,
        validation,
        nodeType: 'NODE_PROCESSOR',
        nodeDescription: 'Processor (Second Node in Supply Chain)'
    };
}

/**
 * Get human-readable summary for a block type
 */
function getBlockSummary(tipeBlock, payload) {
    switch (tipeBlock) {
        case 'RECEIVE_FROM_FARM':
            return `Diterima dari ${payload.nama_peternakan || '?'}: ${payload.jumlah_diterima || '?'} ekor`;
        case 'NOTA_PENERIMAAN':
            return `Nota penerimaan dibuat: ${payload.jumlah_diterima || '?'} diterima, ${payload.jumlah_rusak || 0} rusak`;
        case 'PROCESSING':
            return `Produksi: ${payload.jumlah_input || '?'} → ${payload.jumlah_output || '?'} (yield: ${payload.yield_rate_percent || '?'}%)`;
        case 'HALAL_CHECK':
            return `Sertifikat Halal: ${payload.hasil_verifikasi || '?'} (${payload.lembaga_penerbit || 'N/A'})`;
        case 'QUALITY_CHECK':
            return `QC: ${payload.hasil_qc || '?'} (Suhu: ${payload.suhu || '?'}°C)`;
        case 'LAPORAN_MASALAH':
            return `Masalah ${payload.tingkat || '?'}: ${payload.jenis_masalah || '?'}`;
        case 'TRANSFER_TO_RETAIL':
            return `Dikirim ke Retail: ${payload.jumlah_kirim || '?'} ekor ke ${payload.nama_penerima || '?'}`;
        default:
            return tipeBlock;
    }
}

module.exports = {
    generateHash,
    createBlock,
    createReceiveFromFarmBlock,
    createNotaPenerimaanBlock,
    createProcessingBlock,
    createHalalCheckBlock,
    createQualityCheckBlock,
    createLaporanMasalahBlock,
    createTransferToRetailBlock,
    validateChain,
    getTraceabilityData,
    GENESIS_PREV_HASH
};
