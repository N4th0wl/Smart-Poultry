const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CodeCounter = sequelize.define('CodeCounter', {
    EntityName: { type: DataTypes.STRING(50), primaryKey: true },
    LastCounter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
    tableName: 'CodeCounter',
    timestamps: false,
});

module.exports = CodeCounter;
