-- SmartPoultry Processor Database Schema
-- ========================================

CREATE DATABASE IF NOT EXISTS smartpoultry_processor;
USE smartpoultry_processor;

-- =====================================================
-- CODE COUNTER TABLE
-- Used by application to generate sequential codes
-- =====================================================
CREATE TABLE IF NOT EXISTS CodeCounter (
  EntityName VARCHAR(50) PRIMARY KEY,
  LastCounter INT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- PROCESSOR TABLE (Multi-Tenancy)
-- Each processor is an isolated tenant
-- Like Peternakan in the farm website
-- =====================================================
CREATE TABLE IF NOT EXISTS processor (
  IdProcessor INT AUTO_INCREMENT PRIMARY KEY,
  KodeProcessor CHAR(13) NOT NULL UNIQUE,
  NamaProcessor VARCHAR(255) NOT NULL,
  AlamatProcessor TEXT DEFAULT NULL,
  KontakProcessor VARCHAR(100) DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Users (Login)
-- ADMIN users have IdProcessor = NULL (platform-level)
-- KARYAWAN users belong to a specific processor
CREATE TABLE IF NOT EXISTS users (
  IdUser INT AUTO_INCREMENT PRIMARY KEY,
  KodeUser CHAR(13) NOT NULL UNIQUE,
  IdProcessor INT DEFAULT NULL,
  Email VARCHAR(255) NOT NULL UNIQUE,
  Password VARCHAR(255) NOT NULL,
  Role ENUM('ADMIN','KARYAWAN') NOT NULL DEFAULT 'KARYAWAN',
  StatusAkun ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_processor FOREIGN KEY (IdProcessor) REFERENCES processor(IdProcessor) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Karyawan (Employees) — scoped to processor
CREATE TABLE IF NOT EXISTS karyawan (
  IdKaryawan INT AUTO_INCREMENT PRIMARY KEY,
  KodeKaryawan CHAR(13) NOT NULL UNIQUE,
  IdUser INT NOT NULL,
  IdProcessor INT DEFAULT NULL,
  NamaLengkap VARCHAR(255) NOT NULL,
  Jabatan VARCHAR(100) NOT NULL,
  NoTelp VARCHAR(20) DEFAULT NULL,
  StatusKaryawan ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_karyawan_user FOREIGN KEY (IdUser) REFERENCES users(IdUser) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_karyawan_processor FOREIGN KEY (IdProcessor) REFERENCES processor(IdProcessor) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Orders (from Farm) — scoped to processor
CREATE TABLE IF NOT EXISTS orders (
  IdOrder INT AUTO_INCREMENT PRIMARY KEY,
  KodeOrder CHAR(13) NOT NULL UNIQUE,
  IdProcessor INT DEFAULT NULL,
  NamaPeternakan VARCHAR(255) NOT NULL,
  AlamatPeternakan TEXT DEFAULT NULL,
  KontakPeternakan VARCHAR(100) DEFAULT NULL,
  JenisAyam VARCHAR(100) NOT NULL,
  JumlahPesanan INT NOT NULL,
  Satuan ENUM('EKOR','KG') NOT NULL DEFAULT 'EKOR',
  TanggalOrder DATE NOT NULL,
  TanggalDibutuhkan DATE NOT NULL,
  HargaSatuan DECIMAL(15,2) DEFAULT 0,
  TotalHarga DECIMAL(15,2) DEFAULT 0,
  StatusOrder ENUM('PENDING','CONFIRMED','DIKIRIM','DITERIMA','SELESAI','DITOLAK') NOT NULL DEFAULT 'PENDING',
  PenerimaOrder VARCHAR(255) DEFAULT NULL,
  JumlahDiterima INT DEFAULT NULL,
  KondisiTerima TEXT DEFAULT NULL,
  TanggalDiterima DATE DEFAULT NULL,
  Catatan TEXT DEFAULT NULL,
  DibuatOleh INT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_user FOREIGN KEY (DibuatOleh) REFERENCES users(IdUser) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_order_processor FOREIGN KEY (IdProcessor) REFERENCES processor(IdProcessor) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- NOTA PENERIMAAN (Reception Note from Farm)
-- =====================================================
CREATE TABLE IF NOT EXISTS nota_penerimaan (
  IdNotaPenerimaan INT AUTO_INCREMENT PRIMARY KEY,
  KodeNotaPenerimaan CHAR(13) NOT NULL UNIQUE,
  IdOrder INT NOT NULL,
  KodeNotaPengirimanFarm VARCHAR(13) DEFAULT NULL COMMENT 'Kode Nota Pengiriman dari website peternakan',
  KodeCycleFarm VARCHAR(25) DEFAULT NULL COMMENT 'Kode Cycle dari peternakan untuk link chain',
  TanggalPenerimaan DATE NOT NULL,
  NamaPengirim VARCHAR(255) DEFAULT NULL,
  NamaPenerima VARCHAR(255) NOT NULL,
  JumlahDikirim INT DEFAULT NULL,
  JumlahDiterima INT NOT NULL,
  JumlahRusak INT DEFAULT 0,
  KondisiAyam ENUM('BAIK','CUKUP','BURUK') NOT NULL DEFAULT 'BAIK',
  SuhuSaatTerima DECIMAL(5,2) DEFAULT NULL,
  CatatanPenerimaan TEXT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_notapenerimaan_order FOREIGN KEY (IdOrder) REFERENCES orders(IdOrder) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tugas Produksi (Production Tasks)
CREATE TABLE IF NOT EXISTS tugas_produksi (
  IdTugas INT AUTO_INCREMENT PRIMARY KEY,
  KodeTugas CHAR(13) NOT NULL UNIQUE,
  IdOrder INT NOT NULL,
  IdKaryawan INT DEFAULT NULL,
  NamaTugas VARCHAR(255) NOT NULL,
  DeskripsiTugas TEXT DEFAULT NULL,
  JenisTugas ENUM('PEMOTONGAN','PENCABUTAN_BULU','PEMBERSIHAN','PENGEMASAN','PENYIMPANAN','LAINNYA') NOT NULL,
  StatusTugas ENUM('BELUM_DIKERJAKAN','SEDANG_DIKERJAKAN','SELESAI','DIBATALKAN') NOT NULL DEFAULT 'BELUM_DIKERJAKAN',
  TanggalMulai DATE DEFAULT NULL,
  TanggalSelesai DATE DEFAULT NULL,
  Catatan TEXT DEFAULT NULL,
  DitugaskanOleh INT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_tugas_order FOREIGN KEY (IdOrder) REFERENCES orders(IdOrder) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_tugas_karyawan FOREIGN KEY (IdKaryawan) REFERENCES karyawan(IdKaryawan) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_tugas_user FOREIGN KEY (DitugaskanOleh) REFERENCES users(IdUser) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Produksi (Production Records)
CREATE TABLE IF NOT EXISTS produksi (
  IdProduksi INT AUTO_INCREMENT PRIMARY KEY,
  KodeProduksi CHAR(13) NOT NULL UNIQUE,
  IdOrder INT NOT NULL,
  IdTugas INT DEFAULT NULL,
  IdKaryawan INT DEFAULT NULL,
  TanggalProduksi DATE NOT NULL,
  JenisAyam VARCHAR(100) NOT NULL,
  JumlahInput INT NOT NULL,
  JumlahOutput INT NOT NULL,
  BeratTotal DECIMAL(10,2) DEFAULT 0,
  Varian VARCHAR(100) DEFAULT NULL,
  SertifikatHalal ENUM('ADA','TIDAK_ADA') NOT NULL DEFAULT 'TIDAK_ADA',
  StatusProduksi ENUM('PROSES','QUALITY_CHECK','LULUS_QC','GAGAL_QC','SELESAI') NOT NULL DEFAULT 'PROSES',
  Catatan TEXT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_produksi_order FOREIGN KEY (IdOrder) REFERENCES orders(IdOrder) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_produksi_tugas FOREIGN KEY (IdTugas) REFERENCES tugas_produksi(IdTugas) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_produksi_karyawan FOREIGN KEY (IdKaryawan) REFERENCES karyawan(IdKaryawan) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- LAPORAN MASALAH (Production Issue/Problem Reports)
-- =====================================================
CREATE TABLE IF NOT EXISTS laporan_masalah (
  IdLaporan INT AUTO_INCREMENT PRIMARY KEY,
  KodeLaporan CHAR(13) NOT NULL UNIQUE,
  IdProduksi INT NOT NULL,
  IdKaryawan INT DEFAULT NULL,
  TanggalLaporan DATE NOT NULL,
  JenisMasalah ENUM('KONTAMINASI','KERUSAKAN_MESIN','KUALITAS_BAHAN','KESALAHAN_PROSES','SANITASI','LAINNYA') NOT NULL,
  Tingkat ENUM('RINGAN','SEDANG','BERAT','KRITIS') NOT NULL DEFAULT 'SEDANG',
  DeskripsiMasalah TEXT NOT NULL,
  TindakanKorektif TEXT DEFAULT NULL,
  StatusLaporan ENUM('DILAPORKAN','DITANGANI','SELESAI') NOT NULL DEFAULT 'DILAPORKAN',
  Catatan TEXT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_laporan_produksi FOREIGN KEY (IdProduksi) REFERENCES produksi(IdProduksi) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_laporan_karyawan FOREIGN KEY (IdKaryawan) REFERENCES karyawan(IdKaryawan) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- SERTIFIKAT HALAL (Halal Certificate Verification)
-- =====================================================
CREATE TABLE IF NOT EXISTS sertifikat_halal (
  IdSertifikat INT AUTO_INCREMENT PRIMARY KEY,
  KodeSertifikat CHAR(13) NOT NULL UNIQUE,
  IdProduksi INT NOT NULL,
  IdKaryawan INT DEFAULT NULL,
  TanggalPengecekan DATE NOT NULL,
  NomorSertifikat VARCHAR(100) DEFAULT NULL,
  LembagaPenerbit VARCHAR(255) DEFAULT NULL,
  TanggalTerbit DATE DEFAULT NULL,
  TanggalExpired DATE DEFAULT NULL,
  StatusHalal ENUM('VALID','EXPIRED','TIDAK_ADA','DALAM_PROSES') NOT NULL DEFAULT 'DALAM_PROSES',
  MetodePenyembelihan ENUM('MANUAL','MESIN','SEMI_MESIN') DEFAULT NULL,
  HasilVerifikasi ENUM('LOLOS','TIDAK_LOLOS','PENDING') NOT NULL DEFAULT 'PENDING',
  Catatan TEXT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_sertifikat_produksi FOREIGN KEY (IdProduksi) REFERENCES produksi(IdProduksi) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sertifikat_karyawan FOREIGN KEY (IdKaryawan) REFERENCES karyawan(IdKaryawan) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quality Control
CREATE TABLE IF NOT EXISTS quality_control (
  IdQC INT AUTO_INCREMENT PRIMARY KEY,
  KodeQC CHAR(13) NOT NULL UNIQUE,
  IdProduksi INT NOT NULL,
  IdKaryawan INT DEFAULT NULL,
  TanggalQC DATE NOT NULL,
  Suhu DECIMAL(5,2) DEFAULT NULL,
  Kelembaban DECIMAL(5,2) DEFAULT NULL,
  WarnaAyam VARCHAR(100) DEFAULT NULL,
  BauAyam ENUM('NORMAL','TIDAK_NORMAL') NOT NULL DEFAULT 'NORMAL',
  TeksturAyam ENUM('NORMAL','TIDAK_NORMAL') NOT NULL DEFAULT 'NORMAL',
  HasilQC ENUM('LULUS','GAGAL') NOT NULL,
  Catatan TEXT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_qc_produksi FOREIGN KEY (IdProduksi) REFERENCES produksi(IdProduksi) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_qc_karyawan FOREIGN KEY (IdKaryawan) REFERENCES karyawan(IdKaryawan) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pengiriman (Shipments to Retail)
CREATE TABLE IF NOT EXISTS pengiriman (
  IdPengiriman INT AUTO_INCREMENT PRIMARY KEY,
  KodePengiriman CHAR(13) NOT NULL UNIQUE,
  IdProduksi INT NOT NULL,
  TujuanPengiriman TEXT NOT NULL,
  NamaPenerima VARCHAR(255) NOT NULL,
  KontakPenerima VARCHAR(100) DEFAULT NULL,
  TanggalKirim DATE NOT NULL,
  TanggalSampai DATE DEFAULT NULL,
  JumlahKirim INT NOT NULL,
  BeratKirim DECIMAL(10,2) DEFAULT 0,
  MetodePengiriman ENUM('DIANTAR','DIAMBIL','EKSPEDISI') NOT NULL DEFAULT 'DIANTAR',
  NamaEkspedisi VARCHAR(255) DEFAULT NULL,
  StatusPengiriman ENUM('DISIAPKAN','DALAM_PERJALANAN','SAMPAI','GAGAL') NOT NULL DEFAULT 'DISIAPKAN',
  Catatan TEXT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pengiriman_produksi FOREIGN KEY (IdProduksi) REFERENCES produksi(IdProduksi) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nota Pengiriman (Delivery Invoices to Retail)
CREATE TABLE IF NOT EXISTS nota_pengiriman (
  IdNota INT AUTO_INCREMENT PRIMARY KEY,
  KodeNota CHAR(13) NOT NULL UNIQUE,
  IdPengiriman INT NOT NULL,
  TanggalNota DATE NOT NULL,
  NamaBarang VARCHAR(255) NOT NULL,
  Varian VARCHAR(100) DEFAULT NULL,
  Jumlah INT NOT NULL,
  Satuan ENUM('KG','EKOR','PCS') NOT NULL DEFAULT 'KG',
  HargaSatuan DECIMAL(15,2) NOT NULL,
  TotalHarga DECIMAL(15,2) NOT NULL,
  StatusNota ENUM('DRAFT','LUNAS','BATAL') NOT NULL DEFAULT 'DRAFT',
  Catatan TEXT DEFAULT NULL,
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_nota_pengiriman FOREIGN KEY (IdPengiriman) REFERENCES pengiriman(IdPengiriman) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- BLOCKCHAIN IDENTITY — scoped to processor
-- =====================================================
CREATE TABLE IF NOT EXISTS blockchainidentity (
  IdIdentity INT AUTO_INCREMENT PRIMARY KEY,
  KodeIdentity CHAR(13) NOT NULL UNIQUE,
  IdOrder INT NOT NULL,
  IdProcessor INT DEFAULT NULL,
  KodePeternakan VARCHAR(25) DEFAULT NULL COMMENT 'Link ke KodePeternakan dari website Farm',
  KodeCycleFarm VARCHAR(25) DEFAULT NULL COMMENT 'Link ke KodeCycle dari website Farm',
  FarmLastBlockHash VARCHAR(64) DEFAULT NULL COMMENT 'Hash block terakhir dari chain peternakan',
  GenesisHash VARCHAR(64) NOT NULL,
  LatestBlockHash VARCHAR(64) DEFAULT NULL,
  TotalBlocks INT DEFAULT 1,
  StatusChain ENUM('ACTIVE','COMPLETED','FAILED','TRANSFERRED') NOT NULL DEFAULT 'ACTIVE',
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  CompletedAt DATETIME DEFAULT NULL,
  CONSTRAINT fk_blockchain_order FOREIGN KEY (IdOrder) REFERENCES orders(IdOrder) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_blockchain_processor FOREIGN KEY (IdProcessor) REFERENCES processor(IdProcessor) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================
-- LEDGER PROCESSOR (Blockchain Blocks) — scoped to processor
-- =====================================================
CREATE TABLE IF NOT EXISTS ledger_processor (
  IdBlock INT AUTO_INCREMENT PRIMARY KEY,
  KodeBlock CHAR(13) NOT NULL UNIQUE,
  IdIdentity INT NOT NULL,
  IdProcessor INT DEFAULT NULL,
  IdOrder INT DEFAULT NULL,
  IdProduksi INT DEFAULT NULL,
  TipeBlock ENUM(
    'RECEIVE_FROM_FARM',
    'NOTA_PENERIMAAN',
    'PROCESSING',
    'HALAL_CHECK',
    'QUALITY_CHECK',
    'LAPORAN_MASALAH',
    'TRANSFER_TO_RETAIL'
  ) NOT NULL,
  BlockIndex INT NOT NULL DEFAULT 0,
  PreviousHash VARCHAR(64) NOT NULL,
  CurrentHash VARCHAR(64) NOT NULL,
  DataPayload LONGTEXT NOT NULL,
  Nonce INT DEFAULT 0,
  StatusBlock ENUM('VALIDATED','REJECTED') NOT NULL DEFAULT 'VALIDATED',
  CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  ValidatedAt DATETIME DEFAULT NULL,
  CONSTRAINT fk_ledger_identity FOREIGN KEY (IdIdentity) REFERENCES blockchainidentity(IdIdentity) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_ledger_order FOREIGN KEY (IdOrder) REFERENCES orders(IdOrder) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_ledger_produksi FOREIGN KEY (IdProduksi) REFERENCES produksi(IdProduksi) ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_ledger_processor FOREIGN KEY (IdProcessor) REFERENCES processor(IdProcessor) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Initialize counters for all entities
INSERT INTO CodeCounter (EntityName, LastCounter) VALUES
('Processor', 0),
('User', 0),
('Karyawan', 0),
('Order', 0),
('TugasProduksi', 0),
('Produksi', 0),
('QualityControl', 0),
('Pengiriman', 0),
('NotaPengiriman', 0),
('BlockchainIdentity', 0),
('LedgerProcessor', 0),
('NotaPenerimaan', 0),
('LaporanMasalah', 0),
('SertifikatHalal', 0)
ON DUPLICATE KEY UPDATE EntityName = VALUES(EntityName);

-- =====================================================
-- CODE GENERATION PATTERNS (For Reference)
-- =====================================================
-- These patterns are implemented in backend/src/utils/codeGenerator.js
-- All codes follow the pattern: PREFIX-{9 digit padded ID}
-- Total length: 13 characters (3 prefix + 1 dash + 9 digits)
-- 
-- Table                 | Column               | Pattern
-- ----------------------|----------------------|------------------
-- processor             | KodeProcessor        | PRC-000000001
-- users                 | KodeUser             | USR-000000001
-- karyawan              | KodeKaryawan         | KRY-000000001
-- orders                | KodeOrder            | ORD-000000001
-- nota_penerimaan       | KodeNotaPenerimaan   | NTP-000000001
-- tugas_produksi        | KodeTugas            | TGS-000000001
-- produksi              | KodeProduksi         | PRD-000000001
-- laporan_masalah       | KodeLaporan          | LPM-000000001
-- sertifikat_halal      | KodeSertifikat       | SHC-000000001
-- quality_control       | KodeQC               | QCK-000000001
-- pengiriman            | KodePengiriman       | PKR-000000001
-- nota_pengiriman       | KodeNota             | NTA-000000001
-- blockchainidentity    | KodeIdentity         | BCI-000000001
-- ledger_processor      | KodeBlock            | BLK-000000001
-- =====================================================
