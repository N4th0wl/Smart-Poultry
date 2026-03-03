-- ============================================================================
-- SmartPoultry Retailer Database Schema
-- Database: smartpoultry_retailer
-- ============================================================================

CREATE DATABASE IF NOT EXISTS smartpoultry_retailer;
USE smartpoultry_retailer;

-- ============================================================================
-- 1. Retailer
-- ============================================================================
CREATE TABLE IF NOT EXISTS retailer (
    IdRetailer INT AUTO_INCREMENT PRIMARY KEY,
    KodeRetailer VARCHAR(13) NOT NULL UNIQUE,
    NamaRetailer VARCHAR(255) NOT NULL,
    AlamatRetailer TEXT,
    KontakRetailer VARCHAR(100),
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 2. Users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    IdUser INT AUTO_INCREMENT PRIMARY KEY,
    KodeUser VARCHAR(25) NOT NULL UNIQUE,
    IdRetailer INT,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Password VARCHAR(255) NOT NULL,
    NamaLengkap VARCHAR(255),
    Role ENUM('ADMIN', 'RETAILER') NOT NULL DEFAULT 'RETAILER',
    StatusAkun ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (IdRetailer) REFERENCES retailer(IdRetailer) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 3. Orders (pembelian dari processor)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
    IdOrder INT AUTO_INCREMENT PRIMARY KEY,
    KodeOrder VARCHAR(25) NOT NULL UNIQUE,
    IdRetailer INT,
    NamaProcessor VARCHAR(255) NOT NULL,
    AlamatProcessor VARCHAR(500),
    KontakProcessor VARCHAR(20),
    NamaProduk VARCHAR(255) NOT NULL,
    JenisProduk VARCHAR(100) NOT NULL,
    JumlahPesanan INT NOT NULL,
    Satuan ENUM('KG', 'PCS', 'PACK', 'BOX') NOT NULL DEFAULT 'KG',
    TanggalOrder DATE NOT NULL,
    TanggalDibutuhkan DATE NOT NULL,
    HargaSatuan DECIMAL(12,2) DEFAULT 0,
    TotalHarga DECIMAL(15,2) DEFAULT 0,
    StatusOrder ENUM('PENDING', 'CONFIRMED', 'DIKIRIM', 'DITERIMA', 'DITOLAK', 'SELESAI') NOT NULL DEFAULT 'PENDING',
    PenerimaOrder VARCHAR(255),
    TanggalDiterima DATE,
    JumlahDiterima INT,
    KondisiTerima TEXT,
    Catatan TEXT,
    DibuatOleh INT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (IdRetailer) REFERENCES retailer(IdRetailer) ON DELETE SET NULL,
    FOREIGN KEY (DibuatOleh) REFERENCES users(IdUser) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 4. Nota Penerimaan
-- ============================================================================
CREATE TABLE IF NOT EXISTS nota_penerimaan (
    IdNotaPenerimaan INT AUTO_INCREMENT PRIMARY KEY,
    KodeNotaPenerimaan VARCHAR(13) NOT NULL UNIQUE,
    IdOrder INT NOT NULL,
    IdRetailer INT,
    KodeNotaPengirimanProcessor VARCHAR(25),
    TanggalPenerimaan DATE NOT NULL,
    NamaPengirim VARCHAR(255),
    NamaPenerima VARCHAR(255) NOT NULL,
    JumlahDikirim INT,
    JumlahDiterima INT NOT NULL,
    JumlahRusak INT DEFAULT 0,
    KondisiBarang ENUM('BAIK', 'CUKUP', 'BURUK') NOT NULL DEFAULT 'BAIK',
    SuhuSaatTerima DECIMAL(5,2),
    CatatanPenerimaan TEXT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (IdOrder) REFERENCES orders(IdOrder) ON DELETE CASCADE,
    FOREIGN KEY (IdRetailer) REFERENCES retailer(IdRetailer) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 5. Gudang (Warehouse/Stock)
-- ============================================================================
CREATE TABLE IF NOT EXISTS gudang (
    IdGudang INT AUTO_INCREMENT PRIMARY KEY,
    KodeGudang VARCHAR(13) NOT NULL UNIQUE,
    IdRetailer INT,
    NamaProduk VARCHAR(255) NOT NULL,
    JenisProduk VARCHAR(100) NOT NULL,
    StokMasuk INT NOT NULL DEFAULT 0,
    StokKeluar INT NOT NULL DEFAULT 0,
    StokSaatIni INT NOT NULL DEFAULT 0,
    Satuan ENUM('KG', 'PCS', 'PACK', 'BOX') NOT NULL DEFAULT 'KG',
    HargaJual DECIMAL(12,2) DEFAULT 0,
    LokasiGudang VARCHAR(255),
    TanggalMasuk DATE,
    TanggalKadaluarsa DATE,
    StatusStok ENUM('TERSEDIA', 'HABIS', 'HAMPIR_HABIS') NOT NULL DEFAULT 'TERSEDIA',
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (IdRetailer) REFERENCES retailer(IdRetailer) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 6. Penjualan (Sales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS penjualan (
    IdPenjualan INT AUTO_INCREMENT PRIMARY KEY,
    KodePenjualan VARCHAR(13) NOT NULL UNIQUE,
    IdRetailer INT,
    TanggalPenjualan DATE NOT NULL,
    NamaPembeli VARCHAR(255),
    TotalItem INT NOT NULL DEFAULT 0,
    TotalHarga DECIMAL(15,2) DEFAULT 0,
    MetodePembayaran ENUM('TUNAI', 'TRANSFER', 'QRIS', 'LAINNYA') NOT NULL DEFAULT 'TUNAI',
    StatusPenjualan ENUM('SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'SELESAI',
    Catatan TEXT,
    DibuatOleh INT,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (IdRetailer) REFERENCES retailer(IdRetailer) ON DELETE SET NULL,
    FOREIGN KEY (DibuatOleh) REFERENCES users(IdUser) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 7. Detail Penjualan
-- ============================================================================
CREATE TABLE IF NOT EXISTS detail_penjualan (
    IdDetail INT AUTO_INCREMENT PRIMARY KEY,
    IdPenjualan INT NOT NULL,
    IdGudang INT NOT NULL,
    NamaProduk VARCHAR(255) NOT NULL,
    JumlahJual INT NOT NULL,
    HargaSatuan DECIMAL(12,2) NOT NULL,
    Subtotal DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (IdPenjualan) REFERENCES penjualan(IdPenjualan) ON DELETE CASCADE,
    FOREIGN KEY (IdGudang) REFERENCES gudang(IdGudang) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 8. Blockchain Identity
-- ============================================================================
CREATE TABLE IF NOT EXISTS blockchainidentity (
    IdIdentity INT AUTO_INCREMENT PRIMARY KEY,
    KodeIdentity VARCHAR(25) NOT NULL UNIQUE,
    IdOrder INT,
    IdRetailer INT,
    KodeProcessor VARCHAR(25),
    KodeOrderProcessor VARCHAR(25),
    ProcessorLastBlockHash VARCHAR(64),
    GenesisHash VARCHAR(64) NOT NULL,
    LatestBlockHash VARCHAR(64),
    TotalBlocks INT DEFAULT 1,
    StatusChain ENUM('ACTIVE', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'ACTIVE',
    CompletedAt DATETIME,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (IdOrder) REFERENCES orders(IdOrder) ON DELETE SET NULL,
    FOREIGN KEY (IdRetailer) REFERENCES retailer(IdRetailer) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 9. Ledger Retailer (Blockchain Blocks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_retailer (
    IdBlock INT AUTO_INCREMENT PRIMARY KEY,
    KodeBlock VARCHAR(25) NOT NULL UNIQUE,
    IdIdentity INT NOT NULL,
    IdRetailer INT,
    IdOrder INT,
    IdGudang INT,
    IdPenjualan INT,
    TipeBlock ENUM('RECEIVE_FROM_PROCESSOR', 'NOTA_PENERIMAAN', 'STOCK_IN', 'SALE_RECORDED', 'STOCK_OUT') NOT NULL,
    BlockIndex INT NOT NULL DEFAULT 0,
    PreviousHash VARCHAR(64) NOT NULL,
    CurrentHash VARCHAR(64) NOT NULL,
    DataPayload LONGTEXT NOT NULL,
    Nonce INT DEFAULT 0,
    StatusBlock ENUM('VALIDATED', 'REJECTED') NOT NULL DEFAULT 'VALIDATED',
    ValidatedAt DATETIME,
    CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (IdIdentity) REFERENCES blockchainidentity(IdIdentity) ON DELETE CASCADE,
    FOREIGN KEY (IdRetailer) REFERENCES retailer(IdRetailer) ON DELETE SET NULL,
    FOREIGN KEY (IdOrder) REFERENCES orders(IdOrder) ON DELETE SET NULL,
    FOREIGN KEY (IdGudang) REFERENCES gudang(IdGudang) ON DELETE SET NULL,
    FOREIGN KEY (IdPenjualan) REFERENCES penjualan(IdPenjualan) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- 10. Code Counter
-- ============================================================================
CREATE TABLE IF NOT EXISTS CodeCounter (
    EntityName VARCHAR(50) PRIMARY KEY,
    LastCounter INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO CodeCounter (EntityName, LastCounter) VALUES
    ('Retailer', 0),
    ('User', 0),
    ('Order', 0),
    ('NotaPenerimaan', 0),
    ('Gudang', 0),
    ('Penjualan', 0),
    ('BlockchainIdentity', 0),
    ('LedgerRetailer', 0)
ON DUPLICATE KEY UPDATE LastCounter = LastCounter;
