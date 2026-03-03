/**
 * Code Generator Utility
 * Generates unique codes for all entities using CodeCounter table
 * Pattern: PREFIX-{9 digit padded counter}
 */

const CODE_CONFIG = {
    Supplier: { prefix: 'SUP' },
    Orders: { prefix: 'ORD' },
    DetailOrder: { prefix: 'DOR' },
    NotaPenerimaan: { prefix: 'NPR' },
    DetailNotaPenerimaan: { prefix: 'DNP' },
    Perlengkapan: { prefix: 'PER' },
    Warehouse: { prefix: 'WRH' },
    TimKerja: { prefix: 'TIM' },
    Staf: { prefix: 'STF' },
    Kandang: { prefix: 'KDG' },
    DOC: { prefix: 'DOC' },
    StatusKandang: { prefix: 'STS' },
    Performance: { prefix: 'PFC' },
    PengukuranAyam: { prefix: 'PGK' },
    PemakaianPerlengkapan: { prefix: 'PMK' },
    PemakaianObat: { prefix: 'POB' },
    StatusKematian: { prefix: 'SMT' },
    Panen: { prefix: 'PAN' },
    PemakaianFeed: { prefix: 'PFD' },
    Pengiriman: { prefix: 'PNG' },
    NotaPengiriman: { prefix: 'NPG' }
};

/**
 * Generate the next unique code for an entity.
 * Atomically increments the counter in CodeCounter table.
 * @param {object} sequelize - Sequelize instance
 * @param {string} entityName - Entity name (must match CodeCounter.EntityName)
 * @param {object} [transaction] - Optional Sequelize transaction
 * @returns {Promise<string>} The generated code (e.g., 'SUP-000000001')
 */
async function generateCode(sequelize, entityName, transaction) {
    const config = CODE_CONFIG[entityName];
    if (!config) {
        throw new Error(`Unknown entity: ${entityName}`);
    }

    const { CodeCounter } = sequelize.models;
    if (!CodeCounter) {
        throw new Error('CodeCounter model not found in sequelize instance');
    }

    // Ensure the counter exists
    await CodeCounter.findOrCreate({
        where: { EntityName: entityName },
        defaults: { LastCounter: 0 },
        transaction
    });

    // Increment and get the returned model instance. Note for mysql it might not return the updated row on increment.
    // Instead we do an UPDATE and then SELECT.
    await CodeCounter.increment('LastCounter', {
        by: 1,
        where: { EntityName: entityName },
        transaction
    });

    const rows = await CodeCounter.findOne({
        where: { EntityName: entityName },
        transaction
    });

    if (!rows || rows.LastCounter === undefined) {
        throw new Error(`CodeCounter not found for entity: ${entityName}`);
    }

    const counter = rows.LastCounter;
    return `${config.prefix}-${String(counter).padStart(9, '0')}`;
}

// Convenience functions for each entity
const generateKodeSupplier = (seq, t) => generateCode(seq, 'Supplier', t);
const generateKodeOrder = (seq, t) => generateCode(seq, 'Orders', t);
const generateKodeDetailOrder = (seq, t) => generateCode(seq, 'DetailOrder', t);
const generateKodePenerimaan = (seq, t) => generateCode(seq, 'NotaPenerimaan', t);
const generateKodeDetailNota = (seq, t) => generateCode(seq, 'DetailNotaPenerimaan', t);
const generateKodePerlengkapan = (seq, t) => generateCode(seq, 'Perlengkapan', t);
const generateKodeWarehouse = (seq, t) => generateCode(seq, 'Warehouse', t);
const generateKodeTim = (seq, t) => generateCode(seq, 'TimKerja', t);
const generateKodeStaf = (seq, t) => generateCode(seq, 'Staf', t);
const generateKodeKandang = (seq, t) => generateCode(seq, 'Kandang', t);
const generateKodeDOC = (seq, t) => generateCode(seq, 'DOC', t);
const generateKodeStatus = (seq, t) => generateCode(seq, 'StatusKandang', t);
const generateKodePerformance = (seq, t) => generateCode(seq, 'Performance', t);
const generateKodePengukuran = (seq, t) => generateCode(seq, 'PengukuranAyam', t);
const generateKodePemakaian = (seq, t) => generateCode(seq, 'PemakaianPerlengkapan', t);
const generateKodePemakaianObat = (seq, t) => generateCode(seq, 'PemakaianObat', t);
const generateKodeStatusKematian = (seq, t) => generateCode(seq, 'StatusKematian', t);
const generateKodePanen = (seq, t) => generateCode(seq, 'Panen', t);
const generateKodePemakaianFeed = (seq, t) => generateCode(seq, 'PemakaianFeed', t);
const generateKodePengiriman = (seq, t) => generateCode(seq, 'Pengiriman', t);
const generateKodeNotaPengiriman = (seq, t) => generateCode(seq, 'NotaPengiriman', t);

module.exports = {
    CODE_CONFIG,
    generateCode,
    generateKodeSupplier,
    generateKodeOrder,
    generateKodeDetailOrder,
    generateKodePenerimaan,
    generateKodeDetailNota,
    generateKodePerlengkapan,
    generateKodeWarehouse,
    generateKodeTim,
    generateKodeStaf,
    generateKodeKandang,
    generateKodeDOC,
    generateKodeStatus,
    generateKodePerformance,
    generateKodePengukuran,
    generateKodePemakaian,
    generateKodePemakaianObat,
    generateKodeStatusKematian,
    generateKodePanen,
    generateKodePemakaianFeed,
    generateKodePengiriman,
    generateKodeNotaPengiriman
};
