const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    IdUser: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeUser: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdRetailer: { type: DataTypes.INTEGER, allowNull: true },
    Email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    Password: { type: DataTypes.STRING(255), allowNull: false },
    NamaLengkap: { type: DataTypes.STRING(255), allowNull: true },
    Role: { type: DataTypes.ENUM('ADMIN', 'RETAILER'), allowNull: false, defaultValue: 'RETAILER' },
    StatusAkun: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE'), allowNull: false, defaultValue: 'ACTIVE' },
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: 'UpdatedAt',
});

module.exports = User;
