const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produksi = sequelize.define('Produksi', {
    IdProduksi: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeProduksi: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdOrder: { type: DataTypes.INTEGER, allowNull: false },
    IdTugas: { type: DataTypes.INTEGER, allowNull: true },
    IdKaryawan: { type: DataTypes.INTEGER, allowNull: true },
    TanggalProduksi: { type: DataTypes.DATEONLY, allowNull: false },
    JenisAyam: { type: DataTypes.STRING(100), allowNull: false },
    JumlahInput: { type: DataTypes.INTEGER, allowNull: false },
    JumlahOutput: { type: DataTypes.INTEGER, allowNull: false },
    BeratTotal: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    Varian: { type: DataTypes.STRING(100), allowNull: true },
    SertifikatHalal: { type: DataTypes.ENUM('ADA', 'TIDAK_ADA'), allowNull: false, defaultValue: 'TIDAK_ADA' },
    StatusProduksi: { type: DataTypes.ENUM('PROSES', 'QUALITY_CHECK', 'LULUS_QC', 'GAGAL_QC', 'SELESAI'), allowNull: false, defaultValue: 'PROSES' },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'produksi',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = Produksi;
