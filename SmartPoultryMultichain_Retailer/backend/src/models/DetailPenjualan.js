const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetailPenjualan = sequelize.define('DetailPenjualan', {
    IdDetail: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    IdPenjualan: { type: DataTypes.INTEGER, allowNull: false },
    IdGudang: { type: DataTypes.INTEGER, allowNull: false },
    NamaProduk: { type: DataTypes.STRING(255), allowNull: false },
    JumlahJual: { type: DataTypes.INTEGER, allowNull: false },
    HargaSatuan: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    Subtotal: { type: DataTypes.DECIMAL(15, 2), allowNull: false },
}, {
    tableName: 'detail_penjualan',
    timestamps: false,
});

module.exports = DetailPenjualan;
