const sequelize = require('../config/database');
const Processor = require('./Processor');
const User = require('./User');
const Karyawan = require('./Karyawan');
const Order = require('./Order');
const NotaPenerimaan = require('./NotaPenerimaan');
const TugasProduksi = require('./TugasProduksi');
const Produksi = require('./Produksi');
const LaporanMasalah = require('./LaporanMasalah');
const SertifikatHalal = require('./SertifikatHalal');
const QualityControl = require('./QualityControl');
const Pengiriman = require('./Pengiriman');
const NotaPengiriman = require('./NotaPengiriman');
const BlockchainIdentity = require('./BlockchainIdentity');
const LedgerProcessor = require('./LedgerProcessor');
const CodeCounter = require('./CodeCounter');

// ── Associations ──

// Processor ↔ User (multi-tenancy)
Processor.hasMany(User, { foreignKey: 'IdProcessor', as: 'users' });
User.belongsTo(Processor, { foreignKey: 'IdProcessor', as: 'processor' });

// Processor ↔ Karyawan (implicit via User but also direct for queries)
Processor.hasMany(Karyawan, { foreignKey: 'IdProcessor', as: 'karyawan' });
Karyawan.belongsTo(Processor, { foreignKey: 'IdProcessor', as: 'processor' });

// Processor ↔ Order
Processor.hasMany(Order, { foreignKey: 'IdProcessor', as: 'orders' });
Order.belongsTo(Processor, { foreignKey: 'IdProcessor', as: 'processor' });

// User ↔ Karyawan
User.hasOne(Karyawan, { foreignKey: 'IdUser', as: 'karyawan' });
Karyawan.belongsTo(User, { foreignKey: 'IdUser', as: 'user' });

// User ↔ Order
User.hasMany(Order, { foreignKey: 'DibuatOleh', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'DibuatOleh', as: 'pembuat' });

// Order ↔ NotaPenerimaan
Order.hasMany(NotaPenerimaan, { foreignKey: 'IdOrder', as: 'notaPenerimaan' });
NotaPenerimaan.belongsTo(Order, { foreignKey: 'IdOrder', as: 'order' });

// Order ↔ TugasProduksi
Order.hasMany(TugasProduksi, { foreignKey: 'IdOrder', as: 'tugas' });
TugasProduksi.belongsTo(Order, { foreignKey: 'IdOrder', as: 'order' });

// Karyawan ↔ TugasProduksi
Karyawan.hasMany(TugasProduksi, { foreignKey: 'IdKaryawan', as: 'tugas' });
TugasProduksi.belongsTo(Karyawan, { foreignKey: 'IdKaryawan', as: 'karyawan' });

// Order ↔ Produksi
Order.hasMany(Produksi, { foreignKey: 'IdOrder', as: 'produksi' });
Produksi.belongsTo(Order, { foreignKey: 'IdOrder', as: 'order' });

// TugasProduksi ↔ Produksi
TugasProduksi.hasMany(Produksi, { foreignKey: 'IdTugas', as: 'produksi' });
Produksi.belongsTo(TugasProduksi, { foreignKey: 'IdTugas', as: 'tugas' });

// Karyawan ↔ Produksi
Karyawan.hasMany(Produksi, { foreignKey: 'IdKaryawan', as: 'produksi' });
Produksi.belongsTo(Karyawan, { foreignKey: 'IdKaryawan', as: 'karyawan' });

// Produksi ↔ LaporanMasalah
Produksi.hasMany(LaporanMasalah, { foreignKey: 'IdProduksi', as: 'laporanMasalah' });
LaporanMasalah.belongsTo(Produksi, { foreignKey: 'IdProduksi', as: 'produksi' });
Karyawan.hasMany(LaporanMasalah, { foreignKey: 'IdKaryawan', as: 'laporanMasalah' });
LaporanMasalah.belongsTo(Karyawan, { foreignKey: 'IdKaryawan', as: 'karyawan' });

// Produksi ↔ SertifikatHalal
Produksi.hasMany(SertifikatHalal, { foreignKey: 'IdProduksi', as: 'sertifikatHalal' });
SertifikatHalal.belongsTo(Produksi, { foreignKey: 'IdProduksi', as: 'produksi' });
Karyawan.hasMany(SertifikatHalal, { foreignKey: 'IdKaryawan', as: 'sertifikatHalal' });
SertifikatHalal.belongsTo(Karyawan, { foreignKey: 'IdKaryawan', as: 'karyawan' });

// Produksi ↔ QualityControl
Produksi.hasMany(QualityControl, { foreignKey: 'IdProduksi', as: 'qualityChecks' });
QualityControl.belongsTo(Produksi, { foreignKey: 'IdProduksi', as: 'produksi' });
Karyawan.hasMany(QualityControl, { foreignKey: 'IdKaryawan', as: 'qualityChecks' });
QualityControl.belongsTo(Karyawan, { foreignKey: 'IdKaryawan', as: 'karyawan' });

// Produksi ↔ Pengiriman
Produksi.hasMany(Pengiriman, { foreignKey: 'IdProduksi', as: 'pengiriman' });
Pengiriman.belongsTo(Produksi, { foreignKey: 'IdProduksi', as: 'produksi' });

// Pengiriman ↔ NotaPengiriman
Pengiriman.hasMany(NotaPengiriman, { foreignKey: 'IdPengiriman', as: 'nota' });
NotaPengiriman.belongsTo(Pengiriman, { foreignKey: 'IdPengiriman', as: 'pengiriman' });

// Order ↔ BlockchainIdentity
Order.hasMany(BlockchainIdentity, { foreignKey: 'IdOrder', as: 'blockchainIdentities' });
BlockchainIdentity.belongsTo(Order, { foreignKey: 'IdOrder', as: 'order' });

// Processor ↔ BlockchainIdentity
Processor.hasMany(BlockchainIdentity, { foreignKey: 'IdProcessor', as: 'blockchainIdentities' });
BlockchainIdentity.belongsTo(Processor, { foreignKey: 'IdProcessor', as: 'processor' });

// Processor ↔ LedgerProcessor
Processor.hasMany(LedgerProcessor, { foreignKey: 'IdProcessor', as: 'blocks' });
LedgerProcessor.belongsTo(Processor, { foreignKey: 'IdProcessor', as: 'processor' });

// BlockchainIdentity ↔ LedgerProcessor
BlockchainIdentity.hasMany(LedgerProcessor, { foreignKey: 'IdIdentity', as: 'blocks' });
LedgerProcessor.belongsTo(BlockchainIdentity, { foreignKey: 'IdIdentity', as: 'identity' });

// Order ↔ LedgerProcessor
Order.hasMany(LedgerProcessor, { foreignKey: 'IdOrder', as: 'blocks' });
LedgerProcessor.belongsTo(Order, { foreignKey: 'IdOrder', as: 'order' });

// Produksi ↔ LedgerProcessor
Produksi.hasMany(LedgerProcessor, { foreignKey: 'IdProduksi', as: 'blocks' });
LedgerProcessor.belongsTo(Produksi, { foreignKey: 'IdProduksi', as: 'produksi' });

module.exports = {
    sequelize,
    Processor,
    User,
    Karyawan,
    Order,
    NotaPenerimaan,
    TugasProduksi,
    Produksi,
    LaporanMasalah,
    SertifikatHalal,
    QualityControl,
    Pengiriman,
    NotaPengiriman,
    BlockchainIdentity,
    LedgerProcessor,
    CodeCounter,
};
