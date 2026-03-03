const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NotaPenerimaan = sequelize.define('NotaPenerimaan', {
    IdNotaPenerimaan: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeNotaPenerimaan: { type: DataTypes.STRING(13), allowNull: false, unique: true },
    IdOrder: { type: DataTypes.INTEGER, allowNull: false },
    KodeNotaPengirimanFarm: { type: DataTypes.STRING(13), allowNull: true },
    KodeCycleFarm: { type: DataTypes.STRING(25), allowNull: true },
    TanggalPenerimaan: { type: DataTypes.DATEONLY, allowNull: false },
    NamaPengirim: { type: DataTypes.STRING(255), allowNull: true },
    NamaPenerima: { type: DataTypes.STRING(255), allowNull: false },
    JumlahDikirim: { type: DataTypes.INTEGER, allowNull: true },
    JumlahDiterima: { type: DataTypes.INTEGER, allowNull: false },
    JumlahRusak: { type: DataTypes.INTEGER, defaultValue: 0 },
    KondisiAyam: { type: DataTypes.ENUM('BAIK', 'CUKUP', 'BURUK'), allowNull: false, defaultValue: 'BAIK' },
    SuhuSaatTerima: { type: DataTypes.DECIMAL(5, 2), allowNull: true },
    CatatanPenerimaan: { type: DataTypes.TEXT, allowNull: true },
}, {
    tableName: 'nota_penerimaan',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = NotaPenerimaan;
