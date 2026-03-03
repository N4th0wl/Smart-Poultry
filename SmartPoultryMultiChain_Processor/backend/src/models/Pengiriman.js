const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Pengiriman = sequelize.define('Pengiriman', {
    IdPengiriman: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodePengiriman: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdProduksi: { type: DataTypes.INTEGER, allowNull: false },
    TujuanPengiriman: { type: DataTypes.STRING(500), allowNull: false },
    NamaPenerima: { type: DataTypes.STRING(255), allowNull: false },
    KontakPenerima: { type: DataTypes.STRING(20), allowNull: true },
    TanggalKirim: { type: DataTypes.DATEONLY, allowNull: false },
    TanggalSampai: { type: DataTypes.DATEONLY, allowNull: true },
    JumlahKirim: { type: DataTypes.INTEGER, allowNull: false },
    BeratKirim: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    MetodePengiriman: { type: DataTypes.ENUM('DIANTAR', 'DIAMBIL', 'EKSPEDISI'), allowNull: false, defaultValue: 'DIANTAR' },
    NamaEkspedisi: { type: DataTypes.STRING(100), allowNull: true },
    StatusPengiriman: { type: DataTypes.ENUM('DISIAPKAN', 'DIKIRIM', 'TERKIRIM', 'GAGAL'), allowNull: false, defaultValue: 'DISIAPKAN' },
    Catatan: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'pengiriman',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = Pengiriman;
