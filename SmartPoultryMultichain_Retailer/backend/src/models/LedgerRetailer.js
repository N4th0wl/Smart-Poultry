const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LedgerRetailer = sequelize.define('LedgerRetailer', {
    IdBlock: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeBlock: { type: DataTypes.STRING(25), allowNull: false, unique: true },
    IdIdentity: { type: DataTypes.INTEGER, allowNull: false },
    IdRetailer: { type: DataTypes.INTEGER, allowNull: true },
    IdOrder: { type: DataTypes.INTEGER, allowNull: true },
    IdGudang: { type: DataTypes.INTEGER, allowNull: true },
    IdPenjualan: { type: DataTypes.INTEGER, allowNull: true },
    TipeBlock: {
        type: DataTypes.ENUM(
            'RECEIVE_FROM_COURIER',
            'NOTA_PENERIMAAN',
            'STOCK_IN',
            'SALE_RECORDED',
            'STOCK_OUT'
        ),
        allowNull: false
    },
    BlockIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    PreviousHash: { type: DataTypes.STRING(64), allowNull: false },
    CurrentHash: { type: DataTypes.STRING(64), allowNull: false },
    DataPayload: { type: DataTypes.TEXT('long'), allowNull: false },
    Nonce: { type: DataTypes.INTEGER, defaultValue: 0 },
    StatusBlock: { type: DataTypes.ENUM('VALIDATED', 'REJECTED'), allowNull: false, defaultValue: 'VALIDATED' },
    ValidatedAt: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: 'ledger_retailer',
    timestamps: true,
    createdAt: 'CreatedAt',
    updatedAt: false,
});

module.exports = LedgerRetailer;
