const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('smartpoultry_processor', 'root', '', { host: 'localhost', dialect: 'mysql' });
sequelize.query(`SELECT bi.KodeCycleFarm, pr.JenisAyam FROM pengiriman pg LEFT JOIN produksi pr ON pg.IdProduksi = pr.IdProduksi LEFT JOIN orders o ON pr.IdOrder = o.IdOrder LEFT JOIN blockchainidentity bi ON bi.IdOrder = o.IdOrder AND bi.StatusChain IN ('ACTIVE', 'COMPLETED') WHERE pg.StatusPengiriman IN ('DISIAPKAN', 'DIKIRIM')`)
    .then(res => console.log('SUCCESS'))
    .catch(e => console.error('ERROR_WAS: ' + e.message))
    .finally(() => process.exit());
