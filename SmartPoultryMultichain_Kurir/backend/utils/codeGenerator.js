/**
 * Code Generator Utility
 * Generates unique codes for all entities using CodeCounter table
 * Pattern: PREFIX-{9 digit padded counter}
 */

const CODE_CONFIG = {
    Kurir: { prefix: 'KUR' },
    Pengiriman: { prefix: 'PKR' },
    BuktiTandaTerima: { prefix: 'BTT' },
    NotaPengirimanKurir: { prefix: 'NPK' }
};

/**
 * Generate the next unique code for an entity.
 * Atomically increments the counter in CodeCounter table.
 * @param {object} sequelize - Sequelize instance
 * @param {string} entityName - Entity name (must match CodeCounter.EntityName)
 * @param {object} [transaction] - Optional Sequelize transaction
 * @returns {Promise<string>} The generated code (e.g., 'KUR-000000001')
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
const generateKodeKurir = (seq, t) => generateCode(seq, 'Kurir', t);
const generateKodePengiriman = (seq, t) => generateCode(seq, 'Pengiriman', t);
const generateKodeBukti = (seq, t) => generateCode(seq, 'BuktiTandaTerima', t);
const generateKodeNota = (seq, t) => generateCode(seq, 'NotaPengirimanKurir', t);

module.exports = {
    CODE_CONFIG,
    generateCode,
    generateKodeKurir,
    generateKodePengiriman,
    generateKodeBukti,
    generateKodeNota
};
