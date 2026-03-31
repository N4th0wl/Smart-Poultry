const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
    IdOrder: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeOrder: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdRetailer: { type: DataTypes.INTEGER, allowNull: true },
    NamaProcessor: { type: DataTypes.STRING(255), allowNull: false },
    AlamatProcessor: { type: DataTypes.STRING(500), allowNull: true },
    KontakProcessor: { type: DataTypes.STRING(20), allowNull: true },
    NamaProduk: { type: DataTypes.STRING(255), allowNull: false },
    JenisProduk: { type: DataTypes.STRING(100), allowNull: false },
    JumlahPesanan: { type: DataTypes.INTEGER, allowNull: false },
    Satuan: { type: DataTypes.ENUM('KG', 'PCS', 'PACK', 'BOX'), allowNull: false, defaultValue: 'KG' },
    TanggalOrder: { type: DataTypes.DATEONLY, allowNull: false },
    TanggalDibutuhkan: { type: DataTypes.DATEONLY, allowNull: false },
    HargaSatuan: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    TotalHarga: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    StatusOrder: { type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'DIPROSES', 'DIKIRIM', 'DITERIMA', 'DITOLAK', 'SELESAI'), allowNull: false, defaultValue: 'PENDING' },
    PenerimaOrder: { type: DataTypes.STRING(255), allowNull: true },
    TanggalDiterima: { type: DataTypes.DATEONLY, allowNull: true },
    JumlahDiterima: { type: DataTypes.INTEGER, allowNull: true },
    KondisiTerima: { type: DataTypes.TEXT, allowNull: true },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
    DibuatOleh: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'orders',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = Order;
