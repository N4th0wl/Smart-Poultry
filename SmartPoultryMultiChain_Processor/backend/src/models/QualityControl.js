const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QualityControl = sequelize.define('QualityControl', {
    IdQC: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeQC: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdProduksi: { type: DataTypes.INTEGER, allowNull: false },
    IdKaryawan: { type: DataTypes.INTEGER, allowNull: true },
    TanggalQC: { type: DataTypes.DATEONLY, allowNull: false },
    Suhu: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    Kelembaban: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    WarnaAyam: { type: DataTypes.STRING(50), allowNull: true },
    BauAyam: { type: DataTypes.ENUM('NORMAL', 'TIDAK_NORMAL'), defaultValue: 'NORMAL' },
    TeksturAyam: { type: DataTypes.ENUM('NORMAL', 'TIDAK_NORMAL'), defaultValue: 'NORMAL' },
    HasilQC: { type: DataTypes.ENUM('LULUS', 'GAGAL'), allowNull: false, defaultValue: 'LULUS' },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'quality_control',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false,
});

module.exports = QualityControl;
