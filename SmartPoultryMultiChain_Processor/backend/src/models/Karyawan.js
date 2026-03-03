const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Karyawan = sequelize.define('Karyawan', {
    IdKaryawan: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeKaryawan: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdUser: { type: DataTypes.INTEGER, allowNull: false },
    IdProcessor: { type: DataTypes.INTEGER, allowNull: true },
    NamaLengkap: { type: DataTypes.STRING(255), allowNull: false },
    Jabatan: { type: DataTypes.STRING(100), allowNull: false },
    NoTelp: { type: DataTypes.STRING(20), allowNull: true },
    StatusKaryawan: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
}, {
    tableName: 'karyawan',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = Karyawan;
