const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// ============================================
// CORE MODELS
// ============================================

const PerusahaanKurir = sequelize.define('PerusahaanKurir', {
    KodePerusahaan: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    NamaPerusahaan: { type: DataTypes.STRING(255), allowNull: false },
    AlamatPerusahaan: { type: DataTypes.STRING(255), allowNull: false },
    KontakPerusahaan: { type: DataTypes.STRING(15) }
});

const Login = sequelize.define('Login', {
    UserID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodePerusahaan: { type: DataTypes.INTEGER, allowNull: false },
    Email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    Password: { type: DataTypes.STRING(255), allowNull: false },
    Role: { type: DataTypes.ENUM('admin', 'user'), allowNull: false, defaultValue: 'user' }
});

const Kurir = sequelize.define('Kurir', {
    KodeKurir: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePerusahaan: { type: DataTypes.INTEGER, allowNull: false },
    NamaKurir: { type: DataTypes.STRING(255), allowNull: false },
    NoTelp: { type: DataTypes.STRING(15) },
    StatusKurir: { type: DataTypes.ENUM('AKTIF', 'NONAKTIF'), allowNull: false, defaultValue: 'AKTIF' }
});

// ============================================
// PENGIRIMAN & NOTA
// ============================================

const Pengiriman = sequelize.define('Pengiriman', {
    KodePengiriman: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePerusahaan: { type: DataTypes.INTEGER, allowNull: false },
    KodeKurir: { type: DataTypes.CHAR(13), allowNull: false },
    TipePengiriman: { type: DataTypes.ENUM('FARM_TO_PROCESSOR', 'PROCESSOR_TO_RETAILER'), allowNull: false },
    AsalPengirim: { type: DataTypes.STRING(255), allowNull: false },
    TujuanPenerima: { type: DataTypes.STRING(255), allowNull: false },
    AlamatAsal: { type: DataTypes.STRING(255) },
    AlamatTujuan: { type: DataTypes.STRING(255) },
    TanggalPickup: { type: DataTypes.DATEONLY, allowNull: false },
    TanggalEstimasiTiba: { type: DataTypes.DATEONLY },
    StatusPengiriman: { type: DataTypes.ENUM('PICKUP', 'DALAM_PERJALANAN', 'TERKIRIM', 'GAGAL'), allowNull: false, defaultValue: 'PICKUP' },
    KeteranganPengiriman: { type: DataTypes.STRING(255) },
    ReferensiEksternal: { type: DataTypes.STRING(50) },
    UpstreamCycleId: { type: DataTypes.INTEGER, allowNull: true }
});

const BuktiTandaTerima = sequelize.define('BuktiTandaTerima', {
    KodeBukti: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePengiriman: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalTerima: { type: DataTypes.DATEONLY, allowNull: false },
    NamaPengirim: { type: DataTypes.STRING(100), allowNull: false },
    NamaPenerima: { type: DataTypes.STRING(100), allowNull: false },
    JumlahBarang: { type: DataTypes.INTEGER },
    BeratTotal: { type: DataTypes.FLOAT },
    Keterangan: { type: DataTypes.STRING(255) }
});

const NotaPengirimanKurir = sequelize.define('NotaPengirimanKurir', {
    KodeNota: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePengiriman: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalSampai: { type: DataTypes.DATEONLY, allowNull: false },
    NamaPenerima: { type: DataTypes.STRING(100), allowNull: false },
    KondisiBarang: { type: DataTypes.ENUM('BAIK', 'RUSAK_SEBAGIAN', 'RUSAK_TOTAL'), allowNull: false, defaultValue: 'BAIK' },
    Keterangan: { type: DataTypes.STRING(255) }
});

// ============================================
// BLOCKCHAIN
// ============================================

const LedgerKurir = sequelize.define('ledger_kurir', {
    IdBlock: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeBlock: { type: DataTypes.STRING(25), unique: true, allowNull: false },
    KodePerusahaan: { type: DataTypes.INTEGER, allowNull: false },
    KodePengiriman: { type: DataTypes.CHAR(13) },
    TipeBlock: {
        type: DataTypes.ENUM('GENESIS', 'PICKUP_FARM', 'DELIVERY_PROCESSOR', 'PICKUP_PROCESSOR', 'DELIVERY_RETAILER', 'LINK_UPSTREAM'),
        allowNull: false
    },
    BlockIndex: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    PreviousHash: { type: DataTypes.STRING(64), allowNull: false },
    CurrentHash: { type: DataTypes.STRING(64), allowNull: false },
    DataPayload: { type: DataTypes.JSON, allowNull: false },
    Nonce: { type: DataTypes.INTEGER, defaultValue: 0 },
    StatusBlock: { type: DataTypes.ENUM('VALIDATED', 'REJECTED'), allowNull: false, defaultValue: 'VALIDATED' },
    CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    ValidatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

const BlockchainIdentity = sequelize.define('BlockchainIdentity', {
    IdIdentity: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeIdentity: { type: DataTypes.STRING(25), unique: true, allowNull: false },
    KodePerusahaan: { type: DataTypes.INTEGER, allowNull: false },
    KodePengiriman: { type: DataTypes.CHAR(13), allowNull: false },
    GenesisHash: { type: DataTypes.STRING(64), allowNull: false },
    LatestBlockHash: { type: DataTypes.STRING(64) },
    TotalBlocks: { type: DataTypes.INTEGER, defaultValue: 1 },
    StatusChain: { type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'FAILED', 'TRANSFERRED'), allowNull: false, defaultValue: 'ACTIVE' },
    CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    CompletedAt: { type: DataTypes.DATE },
    UpstreamChainHash: { type: DataTypes.STRING(64), allowNull: true },
    UpstreamNodeType: { type: DataTypes.STRING(30), allowNull: true },
    UpstreamCycleId: { type: DataTypes.INTEGER, allowNull: true }
});

// ============================================
// CODE COUNTER
// ============================================

const CodeCounter = sequelize.define('CodeCounter', {
    EntityName: { type: DataTypes.STRING(50), primaryKey: true },
    LastCounter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
});

// ============================================
// ASSOCIATIONS
// ============================================

// PerusahaanKurir associations
Login.belongsTo(PerusahaanKurir, { foreignKey: 'KodePerusahaan' });
PerusahaanKurir.hasMany(Login, { foreignKey: 'KodePerusahaan' });

Kurir.belongsTo(PerusahaanKurir, { foreignKey: 'KodePerusahaan' });
PerusahaanKurir.hasMany(Kurir, { foreignKey: 'KodePerusahaan' });

Pengiriman.belongsTo(PerusahaanKurir, { foreignKey: 'KodePerusahaan' });
PerusahaanKurir.hasMany(Pengiriman, { foreignKey: 'KodePerusahaan' });

// Kurir associations
Pengiriman.belongsTo(Kurir, { foreignKey: 'KodeKurir' });
Kurir.hasMany(Pengiriman, { foreignKey: 'KodeKurir' });

// Pengiriman associations
BuktiTandaTerima.belongsTo(Pengiriman, { foreignKey: 'KodePengiriman' });
Pengiriman.hasOne(BuktiTandaTerima, { foreignKey: 'KodePengiriman' });

NotaPengirimanKurir.belongsTo(Pengiriman, { foreignKey: 'KodePengiriman' });
Pengiriman.hasOne(NotaPengirimanKurir, { foreignKey: 'KodePengiriman' });

// Blockchain associations
LedgerKurir.belongsTo(PerusahaanKurir, { foreignKey: 'KodePerusahaan' });
LedgerKurir.belongsTo(Pengiriman, { foreignKey: 'KodePengiriman' });
BlockchainIdentity.belongsTo(PerusahaanKurir, { foreignKey: 'KodePerusahaan' });
BlockchainIdentity.belongsTo(Pengiriman, { foreignKey: 'KodePengiriman' });

module.exports = {
    sequelize,
    PerusahaanKurir,
    Login,
    Kurir,
    Pengiriman,
    BuktiTandaTerima,
    NotaPengirimanKurir,
    LedgerKurir,
    BlockchainIdentity,
    CodeCounter
};
