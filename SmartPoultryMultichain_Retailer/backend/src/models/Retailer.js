const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Retailer = sequelize.define('Retailer', {
    IdRetailer: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeRetailer: { type: DataTypes.STRING(13), allowNull: false, unique: true },
    NamaRetailer: { type: DataTypes.STRING(255), allowNull: false },
    AlamatRetailer: { type: DataTypes.TEXT, allowNull: true },
    KontakRetailer: { type: DataTypes.STRING(100), allowNull: true },
}, {
    tableName: 'retailer',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = Retailer;
