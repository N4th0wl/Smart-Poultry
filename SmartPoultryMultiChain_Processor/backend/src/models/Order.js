const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
    IdOrder: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeOrder: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdProcessor: { type: DataTypes.INTEGER, allowNull: true },
    NamaPeternakan: { type: DataTypes.STRING(255), allowNull: false },
    AlamatPeternakan: { type: DataTypes.STRING(500), allowNull: true },
    KontakPeternakan: { type: DataTypes.STRING(20), allowNull: true },
    JenisAyam: { type: DataTypes.STRING(100), allowNull: false },
    JumlahPesanan: { type: DataTypes.INTEGER, allowNull: false },
    Satuan: { type: DataTypes.ENUM('EKOR', 'KG'), allowNull: false, defaultValue: 'EKOR' },
    TanggalOrder: { type: DataTypes.DATEONLY, allowNull: false },
    TanggalDibutuhkan: { type: DataTypes.DATEONLY, allowNull: false },
    HargaSatuan: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    TotalHarga: { type: DataTypes.DECIMAL(15, 2), defaultValue: 0 },
    StatusOrder: { type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'DIKIRIM', 'DITERIMA', 'DITOLAK', 'SELESAI'), allowNull: false, defaultValue: 'PENDING' },
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
