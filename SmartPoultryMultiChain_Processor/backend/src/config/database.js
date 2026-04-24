const { Sequelize } = require('sequelize');
require('dotenv').config();

let sequelize;

if (process.env.MYSQL_URL || process.env.DATABASE_URL) {
    sequelize = new Sequelize(process.env.MYSQL_URL || process.env.DATABASE_URL, {
        dialect: 'mysql',
        logging: false,
        pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
        timezone: '+07:00',
    });
} else {
    sequelize = new Sequelize(
        process.env.MYSQL_DATABASE,
        process.env.MYSQL_USER,
        process.env.MYSQL_PASSWORD,
        {
            host: process.env.MYSQL_HOST,
            port: process.env.MYSQL_PORT,
            dialect: 'mysql',
            logging: false,
            pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
            timezone: '+07:00',
        }
    );
}

module.exports = sequelize;
