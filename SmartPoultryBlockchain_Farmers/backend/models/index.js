const sequelize = require('../config/database');
const { DataTypes } = require('sequelize');

// ============================================
// CORE MODELS
// ============================================

const Peternakan = sequelize.define('Peternakan', {
    KodePeternakan: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    NamaPeternakan: { type: DataTypes.STRING(255), allowNull: false },
    LokasiPeternakan: { type: DataTypes.STRING(255), allowNull: false }
});

const Login = sequelize.define('Login', {
    UserID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    Email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    Password: { type: DataTypes.STRING(255), allowNull: false },
    Role: { type: DataTypes.ENUM('admin', 'user'), allowNull: false, defaultValue: 'user' }
});

const Supplier = sequelize.define('Supplier', {
    KodeSupplier: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    NamaSupplier: { type: DataTypes.STRING(100), allowNull: false },
    KontakSupplier: { type: DataTypes.STRING(15), allowNull: false }
});

const Orders = sequelize.define('Orders', {
    KodeOrder: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    KodeSupplier: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalOrder: { type: DataTypes.DATEONLY, allowNull: false },
    StatusOrder: { type: DataTypes.ENUM('PROSES', 'SUDAH DITERIMA'), allowNull: false }
});

const DetailOrder = sequelize.define('DetailOrder', {
    KodeDetailOrder: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeOrder: { type: DataTypes.CHAR(13), allowNull: false },
    JenisBarang: { type: DataTypes.ENUM('DOC', 'PERLENGKAPAN'), allowNull: false },
    NamaBarang: { type: DataTypes.STRING(255) },
    JumlahBarang: { type: DataTypes.INTEGER, allowNull: false },
    HargaSatuan: { type: DataTypes.DECIMAL(12, 2), allowNull: false }
});

const NotaPenerimaan = sequelize.define('NotaPenerimaan', {
    KodePenerimaan: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeOrder: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalPenerimaan: { type: DataTypes.DATEONLY, allowNull: false },
    NamaPenerima: { type: DataTypes.CHAR(30), allowNull: false }
});

const DetailNotaPenerimaan = sequelize.define('DetailNotaPenerimaan', {
    KodeDetailNota: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePenerimaan: { type: DataTypes.CHAR(13), allowNull: false },
    JenisBarang: { type: DataTypes.ENUM('DOC', 'PERLENGKAPAN'), allowNull: false },
    NamaBarang: { type: DataTypes.STRING(100), allowNull: false },
    Jumlah: { type: DataTypes.INTEGER, allowNull: false }
});

// ============================================
// PERLENGKAPAN & WAREHOUSE
// ============================================

const Perlengkapan = sequelize.define('Perlengkapan', {
    KodePerlengkapan: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    NamaPerlengkapan: { type: DataTypes.STRING(100), allowNull: false },
    KategoriPerlengkapan: { type: DataTypes.ENUM('PAKAN', 'PERALATAN', 'OBAT'), allowNull: false },
    Satuan: { type: DataTypes.STRING(20) }
});

const Warehouse = sequelize.define('Warehouse', {
    KodeWarehouse: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    LokasiWarehouse: { type: DataTypes.STRING(255) }
});

const StokWarehouse = sequelize.define('StokWarehouse', {
    KodeWarehouse: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePerlengkapan: { type: DataTypes.CHAR(13), primaryKey: true },
    Jumlah: { type: DataTypes.INTEGER, allowNull: false },
    TanggalMasukPerlengkapan: { type: DataTypes.DATEONLY, allowNull: false }
});

const MasterObat = sequelize.define('MasterObat', {
    KodePerlengkapan: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    JenisObat: { type: DataTypes.STRING(100), allowNull: false },
    Dosis: { type: DataTypes.STRING(100), allowNull: false },
    TanggalKadaluarsa: { type: DataTypes.DATEONLY, allowNull: false },
    HargaObat: { type: DataTypes.DECIMAL(12, 2), allowNull: false }
});

// ============================================
// KANDANG & CYCLE
// ============================================

const Cycle = sequelize.define('Cycle', {
    KodeCycle: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    TanggalMulai: { type: DataTypes.DATEONLY, allowNull: false },
    DurasiCycle: { type: DataTypes.INTEGER, allowNull: false },
    SisaHariPanen: { type: DataTypes.INTEGER, allowNull: false }
});

const TimKerja = sequelize.define('TimKerja', {
    KodeTim: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    NamaTim: { type: DataTypes.STRING(100) },
    JumlahAnggota: { type: DataTypes.INTEGER, defaultValue: 0 }
});

const Staf = sequelize.define('Staf', {
    KodeStaf: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeTim: { type: DataTypes.CHAR(13), allowNull: false },
    NamaStaf: { type: DataTypes.STRING(255) },
    PosisiStaf: { type: DataTypes.STRING(100) }
});

const Kandang = sequelize.define('Kandang', {
    KodeKandang: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeCycle: { type: DataTypes.INTEGER, allowNull: false },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    KodeTim: { type: DataTypes.CHAR(13), allowNull: false },
    PanjangKandang: { type: DataTypes.FLOAT },
    LebarKandang: { type: DataTypes.FLOAT },
    LantaiKandang: { type: DataTypes.STRING(20) },
    Kepadatan: { type: DataTypes.FLOAT },
    SuhuKandang: { type: DataTypes.FLOAT }
});

// ============================================
// DOC & MONITORING
// ============================================

const DOC = sequelize.define('DOC', {
    KodeDOC: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePenerimaan: { type: DataTypes.CHAR(13), allowNull: false },
    KodeKandang: { type: DataTypes.CHAR(13) },
    BrandDOC: { type: DataTypes.STRING(55) },
    TipeAyam: { type: DataTypes.STRING(55) },
    TanggalMasukKandang: { type: DataTypes.DATEONLY },
    JumlahDipesan: { type: DataTypes.INTEGER, allowNull: false },
    JumlahDiterima: { type: DataTypes.INTEGER, allowNull: false },
    JumlahMatiPraKandang: { type: DataTypes.INTEGER, defaultValue: 0 },
    KondisiAwal: { type: DataTypes.STRING(255) }
});

const StatusKandang = sequelize.define('StatusKandang', {
    KodeStatus: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeKandang: { type: DataTypes.CHAR(13), allowNull: false },
    UmurAyam: { type: DataTypes.INTEGER },
    Populasi: { type: DataTypes.INTEGER },
    BeratRataRata: { type: DataTypes.FLOAT },
    TanggalPemeriksaan: { type: DataTypes.DATEONLY, allowNull: false }
});

const Performance = sequelize.define('Performance', {
    KodePerformance: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeKandang: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalPerformance: { type: DataTypes.DATEONLY, allowNull: false },
    ActualAverageDailyGain: { type: DataTypes.FLOAT },
    ActualFeedIntake: { type: DataTypes.FLOAT },
    ActualWaterIntake: { type: DataTypes.FLOAT },
    KeteranganPerformance: { type: DataTypes.STRING(255) }
});

const StatusKematian = sequelize.define('StatusKematian', {
    KodeStatusKematian: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeKandang: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalKejadian: { type: DataTypes.DATEONLY, allowNull: false },
    JumlahMati: { type: DataTypes.INTEGER },
    JumlahReject: { type: DataTypes.INTEGER },
    BuktiKematian: { type: DataTypes.BLOB },
    Keterangan: { type: DataTypes.STRING(200) }
});

const PemakaianObat = sequelize.define('PemakaianObat', {
    KodePemakaianObat: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePerlengkapan: { type: DataTypes.CHAR(13), allowNull: false },
    KodeKandang: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalPenggunaan: { type: DataTypes.DATEONLY, allowNull: false },
    JumlahObat: { type: DataTypes.INTEGER, allowNull: false }
});

const PemakaianPerlengkapan = sequelize.define('PemakaianPerlengkapan', {
    KodePemakaian: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePerlengkapan: { type: DataTypes.CHAR(13), allowNull: false },
    KodeKandang: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalPemakaian: { type: DataTypes.DATEONLY, allowNull: false },
    JumlahPemakaian: { type: DataTypes.INTEGER, allowNull: false }
});

// ============================================
// PANEN & PENGIRIMAN
// ============================================

const Panen = sequelize.define('Panen', {
    KodePanen: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeKandang: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalPanen: { type: DataTypes.DATEONLY, allowNull: false },
    TotalBerat: { type: DataTypes.FLOAT },
    TotalHarga: { type: DataTypes.DECIMAL(14, 2) }
});

const Pengiriman = sequelize.define('Pengiriman', {
    KodePengiriman: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePanen: { type: DataTypes.CHAR(13), allowNull: false },
    KodeKandang: { type: DataTypes.CHAR(13), allowNull: false },
    KodeStaf: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalPengiriman: { type: DataTypes.DATEONLY, allowNull: false },
    NamaPerusahaanPengiriman: { type: DataTypes.STRING(50) },
    AlamatTujuan: { type: DataTypes.STRING(255) }
});

const NotaPengiriman = sequelize.define('NotaPengiriman', {
    KodeNotaPengiriman: { type: DataTypes.CHAR(13), primaryKey: true },
    KodePengiriman: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalPenerimaan: { type: DataTypes.DATEONLY, allowNull: false }
});

// ============================================
// PEMAKAIAN FEED
// ============================================

const PemakaianFeed = sequelize.define('PemakaianFeed', {
    KodePemakaianFeed: { type: DataTypes.CHAR(13), primaryKey: true },
    KodeKandang: { type: DataTypes.CHAR(13), allowNull: false },
    TanggalPemakaian: { type: DataTypes.DATEONLY, allowNull: false }
});

const DetailFeed = sequelize.define('DetailFeed', {
    KodeDetailFeed: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodePemakaianFeed: { type: DataTypes.CHAR(13), allowNull: false },
    KodePerlengkapan: { type: DataTypes.CHAR(13), allowNull: false },
    JumlahPakan: { type: DataTypes.INTEGER, allowNull: false }
});

// ============================================
// BLOCKCHAIN
// ============================================

const LedgerPeternakan = sequelize.define('ledger_peternakan', {
    IdBlock: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    KodeBlock: { type: DataTypes.STRING(25), unique: true, allowNull: false },
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    KodeCycle: { type: DataTypes.INTEGER },
    KodeKandang: { type: DataTypes.CHAR(13) },
    TipeBlock: {
        type: DataTypes.ENUM('GENESIS', 'KANDANG_AKTIF', 'DOC_MASUK', 'LAPORAN_MORTALITY',
            'PEMAKAIAN_OBAT', 'PANEN', 'PANEN_DINI', 'GAGAL_PANEN', 'TRANSFER_PROCESSOR'),
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
    KodePeternakan: { type: DataTypes.INTEGER, allowNull: false },
    KodeCycle: { type: DataTypes.INTEGER, allowNull: false },
    GenesisHash: { type: DataTypes.STRING(64), allowNull: false },
    LatestBlockHash: { type: DataTypes.STRING(64) },
    TotalBlocks: { type: DataTypes.INTEGER, defaultValue: 1 },
    StatusChain: { type: DataTypes.ENUM('ACTIVE', 'COMPLETED', 'FAILED', 'TRANSFERRED'), allowNull: false, defaultValue: 'ACTIVE' },
    CreatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    CompletedAt: { type: DataTypes.DATE }
});

// ============================================
// CODE COUNTER
// ============================================

const CodeCounter = sequelize.define('CodeCounter', {
    EntityName: { type: DataTypes.STRING(50), primaryKey: true },
    LastCounter: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
});

const ToDo = require('./todo');

// ============================================
// ASSOCIATIONS
// ============================================

// Peternakan associations
Login.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
Supplier.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
Orders.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
Kandang.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
Warehouse.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
TimKerja.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
Perlengkapan.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
ToDo.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });

// Orders associations
Orders.belongsTo(Supplier, { foreignKey: 'KodeSupplier' });
DetailOrder.belongsTo(Orders, { foreignKey: 'KodeOrder' });
Orders.hasMany(DetailOrder, { foreignKey: 'KodeOrder' });

// NotaPenerimaan associations
NotaPenerimaan.belongsTo(Orders, { foreignKey: 'KodeOrder' });
DetailNotaPenerimaan.belongsTo(NotaPenerimaan, { foreignKey: 'KodePenerimaan' });

// Kandang associations
Kandang.belongsTo(Cycle, { foreignKey: 'KodeCycle' });
Kandang.belongsTo(TimKerja, { foreignKey: 'KodeTim' });
Kandang.hasMany(Panen, { foreignKey: 'KodeKandang' });
Kandang.hasMany(DOC, { foreignKey: 'KodeKandang' });
Kandang.hasMany(StatusKandang, { foreignKey: 'KodeKandang' });
Kandang.hasMany(StatusKematian, { foreignKey: 'KodeKandang' });
Kandang.hasMany(PemakaianPerlengkapan, { foreignKey: 'KodeKandang' });
Kandang.hasMany(PemakaianObat, { foreignKey: 'KodeKandang' });
Kandang.hasMany(Performance, { foreignKey: 'KodeKandang' });

// Staf associations
TimKerja.hasMany(Staf, { foreignKey: 'KodeTim' });
Staf.belongsTo(TimKerja, { foreignKey: 'KodeTim' });

// DOC associations
DOC.belongsTo(NotaPenerimaan, { foreignKey: 'KodePenerimaan' });
DOC.belongsTo(Kandang, { foreignKey: 'KodeKandang' });

// Panen associations
Panen.belongsTo(Kandang, { foreignKey: 'KodeKandang' });
Panen.hasMany(Pengiriman, { foreignKey: 'KodePanen' });
Pengiriman.belongsTo(Panen, { foreignKey: 'KodePanen' });
Pengiriman.belongsTo(Kandang, { foreignKey: 'KodeKandang' });
Pengiriman.belongsTo(Staf, { foreignKey: 'KodeStaf' });
Pengiriman.hasMany(NotaPengiriman, { foreignKey: 'KodePengiriman' });
NotaPengiriman.belongsTo(Pengiriman, { foreignKey: 'KodePengiriman' });

// Supplier associations (bidirectional)
Supplier.hasMany(Orders, { foreignKey: 'KodeSupplier' });

// Blockchain associations
LedgerPeternakan.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
LedgerPeternakan.belongsTo(Cycle, { foreignKey: 'KodeCycle' });
BlockchainIdentity.belongsTo(Peternakan, { foreignKey: 'KodePeternakan' });
BlockchainIdentity.belongsTo(Cycle, { foreignKey: 'KodeCycle' });

module.exports = {
    sequelize,
    Peternakan,
    Login,
    Supplier,
    Orders,
    DetailOrder,
    NotaPenerimaan,
    DetailNotaPenerimaan,
    Perlengkapan,
    Warehouse,
    StokWarehouse,
    MasterObat,
    Cycle,
    TimKerja,
    Staf,
    Kandang,
    DOC,
    StatusKandang,
    Performance,
    StatusKematian,
    PemakaianObat,
    PemakaianPerlengkapan,
    PemakaianFeed,
    DetailFeed,
    Panen,
    Pengiriman,
    NotaPengiriman,
    LedgerPeternakan,
    BlockchainIdentity,
    CodeCounter,
    ToDo
};
