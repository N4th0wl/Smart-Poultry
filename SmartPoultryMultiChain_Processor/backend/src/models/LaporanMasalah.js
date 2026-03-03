const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LaporanMasalah = sequelize.define('LaporanMasalah', {
    IdLaporan: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeLaporan: { type: DataTypes.STRING(13), allowNull: false, unique: true },
    IdProduksi: { type: DataTypes.INTEGER, allowNull: false },
    IdKaryawan: { type: DataTypes.INTEGER, allowNull: true },
    TanggalLaporan: { type: DataTypes.DATEONLY, allowNull: false },
    JenisMasalah: { type: DataTypes.ENUM('KONTAMINASI', 'KERUSAKAN_MESIN', 'KUALITAS_BAHAN', 'KESALAHAN_PROSES', 'SANITASI', 'LAINNYA'), allowNull: false },
    Tingkat: { type: DataTypes.ENUM('RINGAN', 'SEDANG', 'BERAT', 'KRITIS'), allowNull: false, defaultValue: 'SEDANG' },
    DeskripsiMasalah: { type: DataTypes.TEXT, allowNull: false },
    TindakanKorektif: { type: DataTypes.TEXT, allowNull: true },
    StatusLaporan: { type: DataTypes.ENUM('DILAPORKAN', 'DITANGANI', 'SELESAI'), allowNull: false, defaultValue: 'DILAPORKAN' },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'laporan_masalah',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = LaporanMasalah;
