const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SertifikatHalal = sequelize.define('SertifikatHalal', {
    IdSertifikat: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeSertifikat: { type: DataTypes.STRING(13), allowNull: false, unique: true },
    IdProduksi: { type: DataTypes.INTEGER, allowNull: false },
    IdKaryawan: { type: DataTypes.INTEGER, allowNull: true },
    TanggalPengecekan: { type: DataTypes.DATEONLY, allowNull: false },
    NomorSertifikat: { type: DataTypes.STRING(100), allowNull: true },
    LembagaPenerbit: { type: DataTypes.STRING(255), allowNull: true },
    TanggalTerbit: { type: DataTypes.DATEONLY, allowNull: true },
    TanggalExpired: { type: DataTypes.DATEONLY, allowNull: true },
    StatusHalal: { type: DataTypes.ENUM('VALID', 'EXPIRED', 'TIDAK_ADA', 'DALAM_PROSES'), allowNull: false, defaultValue: 'DALAM_PROSES' },
    MetodePenyembelihan: { type: DataTypes.ENUM('MANUAL', 'MESIN', 'SEMI_MESIN'), allowNull: true },
    HasilVerifikasi: { type: DataTypes.ENUM('LOLOS', 'TIDAK_LOLOS', 'PENDING'), allowNull: false, defaultValue: 'PENDING' },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'sertifikat_halal',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = SertifikatHalal;
