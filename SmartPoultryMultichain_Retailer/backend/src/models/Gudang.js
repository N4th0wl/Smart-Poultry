const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Gudang = sequelize.define('Gudang', {
    IdGudang: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeGudang: { type: DataTypes.STRING(13), allowNull: false, unique: true },
    IdRetailer: { type: DataTypes.INTEGER, allowNull: true },
    NamaProduk: { type: DataTypes.STRING(255), allowNull: false },
    JenisProduk: { type: DataTypes.STRING(100), allowNull: false },
    StokMasuk: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    StokKeluar: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    StokSaatIni: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    Satuan: { type: DataTypes.ENUM('KG', 'PCS', 'PACK', 'BOX'), allowNull: false, defaultValue: 'KG' },
    HargaJual: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    LokasiGudang: { type: DataTypes.STRING(255), allowNull: true },
    TanggalMasuk: { type: DataTypes.DATEONLY, allowNull: true },
    TanggalKadaluarsa: { type: DataTypes.DATEONLY, allowNull: true },
    StatusStok: { type: DataTypes.ENUM('TERSEDIA', 'HABIS', 'HAMPIR_HABIS'), allowNull: false, defaultValue: 'TERSEDIA' },
}, {
    tableName: 'gudang',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = Gudang;
