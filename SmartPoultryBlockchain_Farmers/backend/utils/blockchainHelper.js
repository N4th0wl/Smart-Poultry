// ============================================================================
// BLOCKCHAIN HELPER - Application-Level Blockchain for Node Peternakan
// ============================================================================
// Replaces MySQL triggers with application-level blockchain operations.
// Block identity = Kandang + Cycle
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
 * Get the previous hash for a given cycle chain
 */
async function getPreviousHash(sequelize, kodeCycle, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT CurrentHash FROM ledger_peternakan 
         WHERE KodeCycle = :kodeCycle 
         ORDER BY BlockIndex DESC LIMIT 1`,
        { ...opts, replacements: { kodeCycle } }
    );

    return result ? result.CurrentHash : GENESIS_PREV_HASH;
}

/**
 * Get next block index for a cycle chain
 */
async function getNextBlockIndex(sequelize, kodeCycle, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    const [result] = await sequelize.query(
        `SELECT COALESCE(MAX(BlockIndex), -1) + 1 AS nextIndex 
         FROM ledger_peternakan 
         WHERE KodeCycle = :kodeCycle`,
        { ...opts, replacements: { kodeCycle } }
    );

    return result ? result.nextIndex : 0;
}

/**
 * Calculate mortality rate for a kandang
 * Based on initial population placed (JumlahDiterima - JumlahMatiPraKandang)
 */
async function calcMortalityRate(sequelize, kodeKandang, transaction = null) {
    const opts = { type: sequelize.QueryTypes.SELECT };
    if (transaction) opts.transaction = transaction;

    // Get initial population placed in kandang (received minus dead-on-arrival)
    const [docResult] = await sequelize.query(
        `SELECT COALESCE(SUM(JumlahDiterima - COALESCE(JumlahMatiPraKandang, 0)), 0) AS initialPopulation FROM DOC WHERE KodeKandang = :kodeKandang`,
        { ...opts, replacements: { kodeKandang } }
    );

    // Get total deaths + rejects in kandang
    const [deathResult] = await sequelize.query(
        `SELECT COALESCE(SUM(JumlahMati), 0) AS totalMati, COALESCE(SUM(JumlahReject), 0) AS totalReject FROM StatusKematian WHERE KodeKandang = :kodeKandang`,
        { ...opts, replacements: { kodeKandang } }
    );

    const initialPopulation = docResult ? docResult.initialPopulation : 0;
    const totalLoss = deathResult ? (deathResult.totalMati + deathResult.totalReject) : 0;

    if (initialPopulation > 0) {
        return parseFloat(((totalLoss / initialPopulation) * 100).toFixed(2));
    }
    return 0;
}

/**
 * Create a new block in the ledger
 */
async function createBlock(sequelize, { kodePeternakan, kodeCycle, kodeKandang, tipeBlock, dataPayload, transaction = null }) {
    const blockIndex = await getNextBlockIndex(sequelize, kodeCycle, transaction);
    const previousHash = await getPreviousHash(sequelize, kodeCycle, transaction);

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

    const kodeBlock = `BLK-${kodeCycle}-${String(blockIndex).padStart(4, '0')}`;

    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    await sequelize.query(
        `INSERT INTO ledger_peternakan 
         (KodeBlock, KodePeternakan, KodeCycle, KodeKandang, TipeBlock, BlockIndex, PreviousHash, CurrentHash, DataPayload, Nonce, StatusBlock, CreatedAt, ValidatedAt) 
         VALUES (:kodeBlock, :kodePeternakan, :kodeCycle, :kodeKandang, :tipeBlock, :blockIndex, :previousHash, :currentHash, :dataPayload, :nonce, 'VALIDATED', NOW(), NOW())`,
        {
            ...queryOpts,
            replacements: {
                kodeBlock,
                kodePeternakan,
                kodeCycle,
                kodeKandang: kodeKandang || null,
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
         WHERE KodeCycle = :kodeCycle`,
        {
            ...queryOpts,
            replacements: { currentHash, kodeCycle }
        }
    );

    return { kodeBlock, blockIndex, previousHash, currentHash, tipeBlock };
}

// ============================================================================
// HIGH-LEVEL BLOCKCHAIN EVENT FUNCTIONS
// These are called from route handlers to automatically record events
// ============================================================================

/**
 * GENESIS BLOCK - When a new Cycle is created
 */
async function createGenesisBlock(sequelize, { kodePeternakan, kodeCycle, tanggalMulai, durasiCycle, sisaHariPanen, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    // Generate genesis hash
    const genesisHash = generateHash(
        0,
        GENESIS_PREV_HASH,
        'GENESIS',
        JSON.stringify({ cycle_id: kodeCycle, tanggal_mulai: tanggalMulai, durasi: durasiCycle }),
        new Date().toISOString().replace('T', ' ').substring(0, 19),
        0
    );

    const kodeIdentity = `CHAIN-${String(kodeCycle).padStart(6, '0')}`;

    // Create BlockchainIdentity
    await sequelize.query(
        `INSERT INTO BlockchainIdentity 
         (KodeIdentity, KodePeternakan, KodeCycle, GenesisHash, LatestBlockHash, TotalBlocks, StatusChain, CreatedAt) 
         VALUES (:kodeIdentity, :kodePeternakan, :kodeCycle, :genesisHash, :genesisHash, 0, 'ACTIVE', NOW())`,
        {
            ...queryOpts,
            replacements: { kodeIdentity, kodePeternakan, kodeCycle, genesisHash }
        }
    );

    // Create Genesis Block
    return await createBlock(sequelize, {
        kodePeternakan,
        kodeCycle,
        kodeKandang: null,
        tipeBlock: 'GENESIS',
        dataPayload: {
            event: 'GENESIS',
            node: 'NODE_PETERNAKAN',
            cycle_id: kodeCycle,
            tanggal_mulai: tanggalMulai,
            durasi_cycle: durasiCycle,
            sisa_hari_panen: sisaHariPanen
        },
        transaction
    });
}

/**
 * KANDANG_AKTIF BLOCK - When a kandang is activated for a cycle
 */
async function createKandangAktifBlock(sequelize, { kodePeternakan, kodeCycle, kodeKandang, kodeTim, panjang, lebar, lantai, kepadatan, suhu, transaction = null }) {
    return await createBlock(sequelize, {
        kodePeternakan,
        kodeCycle,
        kodeKandang,
        tipeBlock: 'KANDANG_AKTIF',
        dataPayload: {
            event: 'KANDANG_AKTIF',
            node: 'NODE_PETERNAKAN',
            kode_kandang: kodeKandang,
            kode_tim: kodeTim,
            panjang: panjang,
            lebar: lebar,
            lantai: lantai,
            kepadatan: kepadatan,
            suhu: suhu
        },
        transaction
    });
}

/**
 * DOC_MASUK BLOCK - When DOC enters a kandang
 */
async function createDocMasukBlock(sequelize, { kodePeternakan, kodeCycle, kodeKandang, kodeDOC, brandDOC, tipeAyam, tanggalMasuk, jumlahDipesan, jumlahDiterima, jumlahMatiPraKandang, jumlahDitempatkan, kondisiAwal, transaction = null }) {
    return await createBlock(sequelize, {
        kodePeternakan,
        kodeCycle,
        kodeKandang,
        tipeBlock: 'DOC_MASUK',
        dataPayload: {
            event: 'DOC_MASUK',
            node: 'NODE_PETERNAKAN',
            kode_doc: kodeDOC,
            kode_kandang: kodeKandang,
            brand_doc: brandDOC,
            tipe_ayam: tipeAyam,
            tanggal_masuk: tanggalMasuk,
            jumlah_dipesan: jumlahDipesan,
            jumlah_diterima: jumlahDiterima,
            jumlah_mati_pra_kandang: jumlahMatiPraKandang,
            jumlah_ditempatkan: jumlahDitempatkan || (jumlahDiterima - (jumlahMatiPraKandang || 0)),
            kondisi_awal: kondisiAwal
        },
        transaction
    });
}

/**
 * LAPORAN_MORTALITY BLOCK - When mortality is reported
 */
async function createMortalityBlock(sequelize, { kodePeternakan, kodeCycle, kodeKandang, kodeStatusKematian, tanggalKejadian, jumlahMati, jumlahReject, keterangan, transaction = null }) {
    const mortalityRate = await calcMortalityRate(sequelize, kodeKandang, transaction);

    return await createBlock(sequelize, {
        kodePeternakan,
        kodeCycle,
        kodeKandang,
        tipeBlock: 'LAPORAN_MORTALITY',
        dataPayload: {
            event: 'LAPORAN_MORTALITY',
            node: 'NODE_PETERNAKAN',
            kode_status_kematian: kodeStatusKematian,
            kode_kandang: kodeKandang,
            tanggal_kejadian: tanggalKejadian,
            jumlah_mati: jumlahMati,
            jumlah_reject: jumlahReject,
            keterangan: keterangan,
            mortality_rate_percent: mortalityRate,
            threshold_exceeded: mortalityRate > 10
        },
        transaction
    });
}

/**
 * PEMAKAIAN_OBAT BLOCK - When medicine is used
 */
async function createPemakaianObatBlock(sequelize, { kodePeternakan, kodeCycle, kodeKandang, kodePemakaianObat, kodePerlengkapan, jenisObat, dosis, jumlahObat, tanggalPenggunaan, transaction = null }) {
    const mortalityRate = await calcMortalityRate(sequelize, kodeKandang, transaction);

    return await createBlock(sequelize, {
        kodePeternakan,
        kodeCycle,
        kodeKandang,
        tipeBlock: 'PEMAKAIAN_OBAT',
        dataPayload: {
            event: 'PEMAKAIAN_OBAT',
            node: 'NODE_PETERNAKAN',
            kode_pemakaian_obat: kodePemakaianObat,
            kode_kandang: kodeKandang,
            kode_perlengkapan: kodePerlengkapan,
            jenis_obat: jenisObat,
            dosis: dosis,
            jumlah_obat: jumlahObat,
            tanggal_penggunaan: tanggalPenggunaan,
            mortality_rate_at_usage: mortalityRate
        },
        transaction
    });
}

/**
 * PANEN BLOCK - When harvest occurs (determines type: PANEN, PANEN_DINI, GAGAL_PANEN)
 */
async function createPanenBlock(sequelize, { kodePeternakan, kodeCycle, kodeKandang, kodePanen, tanggalPanen, totalBerat, totalHarga, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const mortalityRate = await calcMortalityRate(sequelize, kodeKandang, transaction);

    // Check if obat was used
    const [obatResult] = await sequelize.query(
        `SELECT COUNT(*) AS cnt FROM PemakaianObat WHERE KodeKandang = :kodeKandang`,
        { ...queryOpts, type: sequelize.QueryTypes.SELECT, replacements: { kodeKandang } }
    );
    const obatUsed = obatResult ? obatResult.cnt : 0;

    // Get cycle duration info
    const [cycleInfo] = await sequelize.query(
        `SELECT c.DurasiCycle, c.TanggalMulai FROM Cycle c 
         JOIN Kandang k ON k.KodeCycle = c.KodeCycle 
         WHERE k.KodeKandang = :kodeKandang`,
        { ...queryOpts, type: sequelize.QueryTypes.SELECT, replacements: { kodeKandang } }
    );

    // Get actual days
    const [docInfo] = await sequelize.query(
        `SELECT MIN(TanggalMasukKandang) AS firstEntry FROM DOC WHERE KodeKandang = :kodeKandang`,
        { ...queryOpts, type: sequelize.QueryTypes.SELECT, replacements: { kodeKandang } }
    );

    let durasiTarget = cycleInfo ? cycleInfo.DurasiCycle : 35;
    let hariAktual = durasiTarget;
    if (docInfo && docInfo.firstEntry) {
        const start = new Date(docInfo.firstEntry);
        const end = new Date(tanggalPanen);
        hariAktual = Math.floor((end - start) / (1000 * 60 * 60 * 24));
    }

    // Determine panen type
    let tipePanen = 'PANEN';
    if (mortalityRate > 10 && obatUsed === 0) {
        tipePanen = 'GAGAL_PANEN';
    } else if (hariAktual < durasiTarget) {
        tipePanen = 'PANEN_DINI';
    }

    const block = await createBlock(sequelize, {
        kodePeternakan,
        kodeCycle,
        kodeKandang,
        tipeBlock: tipePanen,
        dataPayload: {
            event: tipePanen,
            node: 'NODE_PETERNAKAN',
            kode_panen: kodePanen,
            kode_kandang: kodeKandang,
            tanggal_panen: tanggalPanen,
            total_berat_kg: totalBerat,
            total_harga: totalHarga,
            mortality_rate_final: mortalityRate,
            obat_digunakan: obatUsed > 0,
            durasi_aktual_hari: hariAktual,
            durasi_target_hari: durasiTarget
        },
        transaction
    });

    // Update chain status
    const chainStatus = tipePanen === 'GAGAL_PANEN' ? 'FAILED' : 'COMPLETED';
    await sequelize.query(
        `UPDATE BlockchainIdentity SET StatusChain = :status, CompletedAt = NOW() WHERE KodeCycle = :kodeCycle`,
        { ...queryOpts, replacements: { status: chainStatus, kodeCycle } }
    );

    return block;
}

/**
 * TRANSFER_PROCESSOR BLOCK - When shipment is confirmed (Nota Pengiriman)
 */
async function createTransferBlock(sequelize, { kodePeternakan, kodeCycle, kodeKandang, kodeNotaPengiriman, kodePengiriman, kodePanen, tanggalPenerimaan, perusahaanPengiriman, alamatTujuan, transaction = null }) {
    const queryOpts = {};
    if (transaction) queryOpts.transaction = transaction;

    const block = await createBlock(sequelize, {
        kodePeternakan,
        kodeCycle,
        kodeKandang,
        tipeBlock: 'TRANSFER_PROCESSOR',
        dataPayload: {
            event: 'TRANSFER_PROCESSOR',
            node: 'NODE_PETERNAKAN',
            kode_nota_pengiriman: kodeNotaPengiriman,
            kode_pengiriman: kodePengiriman,
            kode_panen: kodePanen,
            kode_kandang: kodeKandang,
            tanggal_penerimaan: tanggalPenerimaan,
            perusahaan_pengiriman: perusahaanPengiriman,
            alamat_tujuan: alamatTujuan,
            next_node: 'NODE_PROCESSOR',
            transfer_status: 'READY_FOR_HANDOFF'
        },
        transaction
    });

    // Update chain status to TRANSFERRED
    await sequelize.query(
        `UPDATE BlockchainIdentity SET StatusChain = 'TRANSFERRED' WHERE KodeCycle = :kodeCycle`,
        { ...queryOpts, replacements: { kodeCycle } }
    );

    return block;
}

/**
 * Validate chain integrity for a cycle
 */
async function validateChain(sequelize, kodeCycle) {
    const blocks = await sequelize.query(
        `SELECT IdBlock, BlockIndex, CurrentHash, PreviousHash, TipeBlock, DataPayload, CreatedAt 
         FROM ledger_peternakan 
         WHERE KodeCycle = :kodeCycle 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
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
 * Get full traceability data for a kandang/cycle
 * This is used for public tracing (consumer can scan QR code and see full history)
 */
async function getTraceabilityData(sequelize, kodeCycle) {
    // Get chain identity
    const [identity] = await sequelize.query(
        `SELECT bi.*, p.NamaPeternakan, p.LokasiPeternakan 
         FROM BlockchainIdentity bi 
         JOIN Peternakan p ON bi.KodePeternakan = p.KodePeternakan 
         WHERE bi.KodeCycle = :kodeCycle`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
    );

    if (!identity) return null;

    // Get all blocks
    const blocks = await sequelize.query(
        `SELECT KodeBlock, BlockIndex, TipeBlock, PreviousHash, CurrentHash, DataPayload, StatusBlock, CreatedAt 
         FROM ledger_peternakan 
         WHERE KodeCycle = :kodeCycle 
         ORDER BY BlockIndex ASC`,
        { type: sequelize.QueryTypes.SELECT, replacements: { kodeCycle } }
    );

    // Validate chain
    const validation = await validateChain(sequelize, kodeCycle);

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
            peternakan: identity.NamaPeternakan,
            lokasi: identity.LokasiPeternakan,
            statusChain: identity.StatusChain,
            totalBlocks: identity.TotalBlocks,
            createdAt: identity.CreatedAt,
            completedAt: identity.CompletedAt
        },
        blocks,
        timeline,
        validation,
        nodeType: 'NODE_PETERNAKAN',
        nodeDescription: 'Farm / Peternakan (First Node in Supply Chain)'
    };
}

/**
 * Get human-readable summary for a block type
 */
function getBlockSummary(tipeBlock, payload) {
    switch (tipeBlock) {
        case 'GENESIS':
            return `Cycle dimulai (durasi: ${payload.durasi_cycle || '?'} hari)`;
        case 'KANDANG_AKTIF':
            return `Kandang ${payload.kode_kandang || '?'} diaktifkan`;
        case 'DOC_MASUK':
            return `${payload.jumlah_ditempatkan || payload.jumlah_diterima || '?'} ekor DOC masuk kandang (${payload.brand_doc || '?'} - ${payload.tipe_ayam || '?'}, diterima: ${payload.jumlah_diterima || '?'}, DOA: ${payload.jumlah_mati_pra_kandang || 0})`;
        case 'LAPORAN_MORTALITY':
            return `Mortality: ${payload.jumlah_mati || 0} mati, ${payload.jumlah_reject || 0} reject (rate: ${payload.mortality_rate_percent || '?'}%)`;
        case 'PEMAKAIAN_OBAT':
            return `Obat ${payload.jenis_obat || '?'} digunakan (${payload.jumlah_obat || '?'} unit)`;
        case 'PANEN':
            return `Panen sukses: ${payload.total_berat_kg || '?'} kg`;
        case 'PANEN_DINI':
            return `Panen dini: ${payload.total_berat_kg || '?'} kg (hari ke-${payload.durasi_aktual_hari || '?'})`;
        case 'GAGAL_PANEN':
            return `Gagal panen (mortality: ${payload.mortality_rate_final || '?'}%)`;
        case 'TRANSFER_PROCESSOR':
            return `Transfer ke Processor: ${payload.perusahaan_pengiriman || '?'}`;
        default:
            return tipeBlock;
    }
}

module.exports = {
    generateHash,
    createBlock,
    createGenesisBlock,
    createKandangAktifBlock,
    createDocMasukBlock,
    createMortalityBlock,
    createPemakaianObatBlock,
    createPanenBlock,
    createTransferBlock,
    validateChain,
    getTraceabilityData,
    GENESIS_PREV_HASH
};
