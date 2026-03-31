const { Sequelize } = require('sequelize');
const s = new Sequelize('smartpoultry_processor', 'root', '', { host: 'localhost', dialect: 'mysql' });
s.query('SHOW COLUMNS FROM pengiriman WHERE Field = "StatusPengiriman"')
    .then(r => {
        require('fs').writeFileSync('col_log2.txt', JSON.stringify(r[0], null, 2));
        console.log('Done');
    })
    .catch(e => console.error(e.message))
    .finally(() => process.exit());
