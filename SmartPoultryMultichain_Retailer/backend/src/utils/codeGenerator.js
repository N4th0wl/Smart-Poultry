/**
 * Code Generator Utility
 * Generates unique codes for all entities using CodeCounter table
 * Pattern: PREFIX-{9 digit padded counter}
 * Total length: 13 characters (3 prefix + 1 dash + 9 digits)
 * 
 * Consistent with the Farm and Processor website pattern.
 */

const CODE_CONFIG = {
    Retailer: { prefix: 'RTL' },
    User: { prefix: 'USR' },
    Order: { prefix: 'ORD' },
    NotaPenerimaan: { prefix: 'NTP' },
    Gudang: { prefix: 'GDG' },
    Penjualan: { prefix: 'PJL' },
    BlockchainIdentity: { prefix: 'BCI' },
    LedgerRetailer: { prefix: 'BLK' },
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

    // Upsert: insert the row if it doesn't exist, then atomically increment
    await sequelize.query(
        `INSERT INTO CodeCounter (EntityName, LastCounter) VALUES (:entityName, 1)
         ON DUPLICATE KEY UPDATE LastCounter = LastCounter + 1`,
        { replacements: { entityName }, type: sequelize.QueryTypes.INSERT, transaction }
    );

    const results = await sequelize.query(
        `SELECT LastCounter FROM CodeCounter WHERE EntityName = :entityName`,
        { replacements: { entityName }, type: sequelize.QueryTypes.SELECT, transaction }
    );

    const row = results[0];
    if (!row || row.LastCounter === undefined) {
        throw new Error(`CodeCounter not found for entity: ${entityName}`);
    }

    const counter = row.LastCounter;
    return `${config.prefix}-${String(counter).padStart(9, '0')}`;
}

// Convenience functions for each entity
const generateKodeRetailer = (seq, t) => generateCode(seq, 'Retailer', t);
const generateKodeUser = (seq, t) => generateCode(seq, 'User', t);
const generateKodeOrder = (seq, t) => generateCode(seq, 'Order', t);
const generateKodeNotaPenerimaan = (seq, t) => generateCode(seq, 'NotaPenerimaan', t);
const generateKodeGudang = (seq, t) => generateCode(seq, 'Gudang', t);
const generateKodePenjualan = (seq, t) => generateCode(seq, 'Penjualan', t);
const generateKodeIdentity = (seq, t) => generateCode(seq, 'BlockchainIdentity', t);
const generateKodeBlock = (seq, t) => generateCode(seq, 'LedgerRetailer', t);

module.exports = {
    CODE_CONFIG,
    generateCode,
    generateKodeRetailer,
    generateKodeUser,
    generateKodeOrder,
    generateKodeNotaPenerimaan,
    generateKodeGudang,
    generateKodePenjualan,
    generateKodeIdentity,
    generateKodeBlock,
};
