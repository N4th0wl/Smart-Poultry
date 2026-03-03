const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlockchainIdentity = sequelize.define('BlockchainIdentity', {
    IdIdentity: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeIdentity: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdOrder: { type: DataTypes.INTEGER, allowNull: true },
    IdRetailer: { type: DataTypes.INTEGER, allowNull: true },
    KodeProcessor: { type: DataTypes.STRING(25), allowNull: true },
    KodeOrderProcessor: { type: DataTypes.STRING(25), allowNull: true },
    ProcessorLastBlockHash: { type: DataTypes.STRING(64), allowNull: true },
    GenesisHash: { type: DataTypes.STRING(64), allowNull: false },
    LatestBlockHash: { type: DataTypes.STRING(64), allowNull: true },
    TotalBlocks: { type: DataTypes.INTEGER, defaultValue: 1 },
    StatusChain: { type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'FAILED'), allowNull: false, defaultValue: 'ACTIVE' },
    CompletedAt: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: 'blockchainidentity',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false,
});

module.exports = BlockchainIdentity;
