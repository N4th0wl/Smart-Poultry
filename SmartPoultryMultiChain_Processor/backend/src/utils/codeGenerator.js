/**
 * Code Generator Utility
 * Generates unique codes for all entities using CodeCounter table
 * Pattern: PREFIX-{9 digit padded counter}
 * Total length: 13 characters (3 prefix + 1 dash + 9 digits)
 * 
 * Consistent with the Farm (Peternakan) website pattern.
 */

const CODE_CONFIG = {
    Processor: { prefix: 'PRC' },
    User: { prefix: 'USR' },
    Karyawan: { prefix: 'KRY' },
    Order: { prefix: 'ORD' },
    NotaPenerimaan: { prefix: 'NTP' },
    TugasProduksi: { prefix: 'TGS' },
    Produksi: { prefix: 'PRD' },
    LaporanMasalah: { prefix: 'LPM' },
    SertifikatHalal: { prefix: 'SHC' },
    QualityControl: { prefix: 'QCK' },
    Pengiriman: { prefix: 'PKR' },
    NotaPengiriman: { prefix: 'NTA' },
    BlockchainIdentity: { prefix: 'BCI' },
    LedgerProcessor: { prefix: 'BLK' },
};

/**
 * Generate the next unique code for an entity.
 * Atomically increments the counter in CodeCounter table.
 * @param {object} sequelize - Sequelize instance
 * @param {string} entityName - Entity name (must match CodeCounter.EntityName)
 * @param {object} [transaction] - Optional Sequelize transaction
 * @returns {Promise<string>} The generated code (e.g., 'USR-000000001')
 */
async function generateCode(sequelize, entityName, transaction) {
    const config = CODE_CONFIG[entityName];
    if (!config) {
        throw new Error(`Unknown entity: ${entityName}`);
    }

    // Atomically increment counter and get new value
    await sequelize.query(
        `UPDATE CodeCounter SET LastCounter = LastCounter + 1 WHERE EntityName = :entityName`,
        { replacements: { entityName }, type: sequelize.QueryTypes.UPDATE, transaction }
    );

    const [rows] = await sequelize.query(
        `SELECT LastCounter FROM CodeCounter WHERE EntityName = :entityName`,
        { replacements: { entityName }, type: sequelize.QueryTypes.SELECT, transaction }
    );

    if (!rows || rows.LastCounter === undefined) {
        throw new Error(`CodeCounter not found for entity: ${entityName}`);
    }

    const counter = rows.LastCounter;
    return `${config.prefix}-${String(counter).padStart(9, '0')}`;
}

// Convenience functions for each entity
const generateKodeProcessor = (seq, t) => generateCode(seq, 'Processor', t);
const generateKodeUser = (seq, t) => generateCode(seq, 'User', t);
const generateKodeKaryawan = (seq, t) => generateCode(seq, 'Karyawan', t);
const generateKodeOrder = (seq, t) => generateCode(seq, 'Order', t);
const generateKodeNotaPenerimaan = (seq, t) => generateCode(seq, 'NotaPenerimaan', t);
const generateKodeTugas = (seq, t) => generateCode(seq, 'TugasProduksi', t);
const generateKodeProduksi = (seq, t) => generateCode(seq, 'Produksi', t);
const generateKodeLaporan = (seq, t) => generateCode(seq, 'LaporanMasalah', t);
const generateKodeSertifikat = (seq, t) => generateCode(seq, 'SertifikatHalal', t);
const generateKodeQC = (seq, t) => generateCode(seq, 'QualityControl', t);
const generateKodePengiriman = (seq, t) => generateCode(seq, 'Pengiriman', t);
const generateKodeNota = (seq, t) => generateCode(seq, 'NotaPengiriman', t);
const generateKodeIdentity = (seq, t) => generateCode(seq, 'BlockchainIdentity', t);
const generateKodeBlock = (seq, t) => generateCode(seq, 'LedgerProcessor', t);

module.exports = {
    CODE_CONFIG,
    generateCode,
    generateKodeProcessor,
    generateKodeUser,
    generateKodeKaryawan,
    generateKodeOrder,
    generateKodeNotaPenerimaan,
    generateKodeTugas,
    generateKodeProduksi,
    generateKodeLaporan,
    generateKodeSertifikat,
    generateKodeQC,
    generateKodePengiriman,
    generateKodeNota,
    generateKodeIdentity,
    generateKodeBlock,
};
