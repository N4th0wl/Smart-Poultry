const sequelize = require('../config/database');
const Retailer = require('./Retailer');
const User = require('./User');
const Order = require('./Order');
const NotaPenerimaan = require('./NotaPenerimaan');
const Gudang = require('./Gudang');
const Penjualan = require('./Penjualan');
const DetailPenjualan = require('./DetailPenjualan');
const BlockchainIdentity = require('./BlockchainIdentity');
const LedgerRetailer = require('./LedgerRetailer');
const CodeCounter = require('./CodeCounter');

// ── Associations ──

// Retailer ↔ User
Retailer.hasMany(User, { foreignKey: 'IdRetailer', as: 'users' });
User.belongsTo(Retailer, { foreignKey: 'IdRetailer', as: 'retailer' });

// Retailer ↔ Order
Retailer.hasMany(Order, { foreignKey: 'IdRetailer', as: 'orders' });
Order.belongsTo(Retailer, { foreignKey: 'IdRetailer', as: 'retailer' });

// User ↔ Order (pembuat)
User.hasMany(Order, { foreignKey: 'DibuatOleh', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'DibuatOleh', as: 'pembuat' });

// Order ↔ NotaPenerimaan
Order.hasMany(NotaPenerimaan, { foreignKey: 'IdOrder', as: 'notaPenerimaan' });
NotaPenerimaan.belongsTo(Order, { foreignKey: 'IdOrder', as: 'order' });

// Retailer ↔ NotaPenerimaan
Retailer.hasMany(NotaPenerimaan, { foreignKey: 'IdRetailer', as: 'notaPenerimaan' });
NotaPenerimaan.belongsTo(Retailer, { foreignKey: 'IdRetailer', as: 'retailer' });

// Retailer ↔ Gudang
Retailer.hasMany(Gudang, { foreignKey: 'IdRetailer', as: 'gudang' });
Gudang.belongsTo(Retailer, { foreignKey: 'IdRetailer', as: 'retailer' });

// Retailer ↔ Penjualan
Retailer.hasMany(Penjualan, { foreignKey: 'IdRetailer', as: 'penjualan' });
Penjualan.belongsTo(Retailer, { foreignKey: 'IdRetailer', as: 'retailer' });

// User ↔ Penjualan (pembuat)
User.hasMany(Penjualan, { foreignKey: 'DibuatOleh', as: 'penjualan' });
Penjualan.belongsTo(User, { foreignKey: 'DibuatOleh', as: 'pembuat' });

// Penjualan ↔ DetailPenjualan
Penjualan.hasMany(DetailPenjualan, { foreignKey: 'IdPenjualan', as: 'details' });
DetailPenjualan.belongsTo(Penjualan, { foreignKey: 'IdPenjualan', as: 'penjualan' });

// Gudang ↔ DetailPenjualan
Gudang.hasMany(DetailPenjualan, { foreignKey: 'IdGudang', as: 'detailPenjualan' });
DetailPenjualan.belongsTo(Gudang, { foreignKey: 'IdGudang', as: 'gudang' });

// Order ↔ BlockchainIdentity
Order.hasMany(BlockchainIdentity, { foreignKey: 'IdOrder', as: 'blockchainIdentities' });
BlockchainIdentity.belongsTo(Order, { foreignKey: 'IdOrder', as: 'order' });

// Retailer ↔ BlockchainIdentity
Retailer.hasMany(BlockchainIdentity, { foreignKey: 'IdRetailer', as: 'blockchainIdentities' });
BlockchainIdentity.belongsTo(Retailer, { foreignKey: 'IdRetailer', as: 'retailer' });

// Retailer ↔ LedgerRetailer
Retailer.hasMany(LedgerRetailer, { foreignKey: 'IdRetailer', as: 'blocks' });
LedgerRetailer.belongsTo(Retailer, { foreignKey: 'IdRetailer', as: 'retailer' });

// BlockchainIdentity ↔ LedgerRetailer
BlockchainIdentity.hasMany(LedgerRetailer, { foreignKey: 'IdIdentity', as: 'blocks' });
LedgerRetailer.belongsTo(BlockchainIdentity, { foreignKey: 'IdIdentity', as: 'identity' });

// Order ↔ LedgerRetailer
Order.hasMany(LedgerRetailer, { foreignKey: 'IdOrder', as: 'blocks' });
LedgerRetailer.belongsTo(Order, { foreignKey: 'IdOrder', as: 'order' });

// Gudang ↔ LedgerRetailer
Gudang.hasMany(LedgerRetailer, { foreignKey: 'IdGudang', as: 'blocks' });
LedgerRetailer.belongsTo(Gudang, { foreignKey: 'IdGudang', as: 'gudang' });

// Penjualan ↔ LedgerRetailer
Penjualan.hasMany(LedgerRetailer, { foreignKey: 'IdPenjualan', as: 'blocks' });
LedgerRetailer.belongsTo(Penjualan, { foreignKey: 'IdPenjualan', as: 'penjualan' });

module.exports = {
    sequelize,
    Retailer,
    User,
    Order,
    NotaPenerimaan,
    Gudang,
    Penjualan,
    DetailPenjualan,
    BlockchainIdentity,
    LedgerRetailer,
    CodeCounter,
};
