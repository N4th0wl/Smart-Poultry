const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Penjualan = sequelize.define('Penjualan', {
    IdPenjualan: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodePenjualan: { type: DataTypes.STRING(13), allowNull: false, unique: true },
    IdRetailer: { type: DataTypes.INTEGER, allowNull: true },
    TanggalPenjualan: { type: DataTypes.DATEONLY, allowNull: false },
    NamaPembeli: { type: DataTypes.STRING(255), allowNull: true },
    TotalItem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    TotalHarga: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    MetodePembayaran: { type: DataTypes.ENUM('TUNAI', 'TRANSFER', 'QRIS', 'LAINNYA'), allowNull: false, defaultValue: 'TUNAI' },
    StatusPenjualan: { type: DataTypes.ENUM('SELESAI', 'DIBATALKAN'), allowNull: false, defaultValue: 'SELESAI' },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
    DibuatOleh: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'penjualan',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = Penjualan;
