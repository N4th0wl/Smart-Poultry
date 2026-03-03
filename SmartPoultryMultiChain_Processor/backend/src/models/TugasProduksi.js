const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TugasProduksi = sequelize.define('TugasProduksi', {
    IdTugas: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeTugas: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdOrder: { type: DataTypes.INTEGER, allowNull: false },
    IdKaryawan: { type: DataTypes.INTEGER, allowNull: true },
    NamaTugas: { type: DataTypes.STRING(255), allowNull: false },
    DeskripsiTugas: { type: DataTypes.TEXT, allowNull: true },
    JenisTugas: { type: DataTypes.ENUM('PEMOTONGAN', 'PENCABUTAN_BULU', 'PEMBERSIHAN', 'PENGEMASAN', 'PENYIMPANAN', 'LAINNYA'), allowNull: false },
    StatusTugas: { type: DataTypes.ENUM('BELUM_DIKERJAKAN', 'SEDANG_DIKERJAKAN', 'SELESAI', 'DIBATALKAN'), allowNull: false, defaultValue: 'BELUM_DIKERJAKAN' },
    TanggalMulai: { type: DataTypes.DATEONLY, allowNull: true },
    TanggalSelesai: { type: DataTypes.DATEONLY, allowNull: true },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
    DitugaskanOleh: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'tugas_produksi',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = TugasProduksi;
