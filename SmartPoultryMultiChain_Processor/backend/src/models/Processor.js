const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Processor = sequelize.define('Processor', {
    IdProcessor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeProcessor: { type: DataTypes.STRING(13), allowNull: false, unique: true },
    NamaProcessor: { type: DataTypes.STRING(255), allowNull: false },
    AlamatProcessor: { type: DataTypes.TEXT, allowNull: true },
    KontakProcessor: { type: DataTypes.STRING(100), allowNull: true },
}, {
    tableName: 'processor',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = Processor;
