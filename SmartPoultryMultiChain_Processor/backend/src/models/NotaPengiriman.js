const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotaPengiriman = sequelize.define('NotaPengiriman', {
    IdNota: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeNota: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdPengiriman: { type: DataTypes.INTEGER, allowNull: false },
    TanggalNota: { type: DataTypes.DATEONLY, allowNull: false },
    NamaBarang: { type: DataTypes.STRING(100), allowNull: false },
    Varian: { type: DataTypes.STRING(100), allowNull: true },
    Jumlah: { type: DataTypes.INTEGER, allowNull: false },
    Satuan: { type: DataTypes.ENUM('EKOR', 'KG', 'PCS', 'DUS'), allowNull: false, defaultValue: 'KG' },
    HargaSatuan: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    TotalHarga: { type: DataTypes.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
    StatusNota: { type: DataTypes.ENUM('DRAFT', 'FINAL', 'DIBAYAR'), allowNull: false, defaultValue: 'DRAFT' },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'nota_pengiriman',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = NotaPengiriman;
