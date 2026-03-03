-- phpMyAdmin SQL Dump
-- SmartPoultry Kurir Database
-- Database: `smartpoultry_kurir`

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

-- ============================================
-- DATABASE
-- ============================================

CREATE DATABASE IF NOT EXISTS `smartpoultry_kurir` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `smartpoultry_kurir`;

-- ============================================
-- TABLE: PerusahaanKurir (Courier Company / Multi-tenant)
-- ============================================

CREATE TABLE `PerusahaanKurir` (
  `KodePerusahaan` int(11) NOT NULL AUTO_INCREMENT,
  `NamaPerusahaan` varchar(255) NOT NULL,
  `AlamatPerusahaan` varchar(255) NOT NULL,
  `KontakPerusahaan` varchar(15) DEFAULT NULL,
  PRIMARY KEY (`KodePerusahaan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: Login (User Authentication)
-- ============================================

CREATE TABLE `Login` (
  `UserID` int(11) NOT NULL AUTO_INCREMENT,
  `KodePerusahaan` int(11) NOT NULL,
  `Email` varchar(255) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Role` enum('admin','user') NOT NULL DEFAULT 'user',
  PRIMARY KEY (`UserID`),
  UNIQUE KEY `Email` (`Email`),
  KEY `FK_Login_Perusahaan` (`KodePerusahaan`),
  CONSTRAINT `FK_Login_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `PerusahaanKurir` (`KodePerusahaan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: Kurir (Individual Couriers)
-- ============================================

CREATE TABLE `Kurir` (
  `KodeKurir` char(13) NOT NULL,
  `KodePerusahaan` int(11) NOT NULL,
  `NamaKurir` varchar(255) NOT NULL,
  `NoTelp` varchar(15) DEFAULT NULL,
  `StatusKurir` enum('AKTIF','NONAKTIF') NOT NULL DEFAULT 'AKTIF',
  PRIMARY KEY (`KodeKurir`),
  KEY `FK_Kurir_Perusahaan` (`KodePerusahaan`),
  CONSTRAINT `FK_Kurir_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `PerusahaanKurir` (`KodePerusahaan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: Pengiriman (Shipment Records)
-- ============================================

CREATE TABLE `Pengiriman` (
  `KodePengiriman` char(13) NOT NULL,
  `KodePerusahaan` int(11) NOT NULL,
  `KodeKurir` char(13) NOT NULL,
  `TipePengiriman` enum('FARM_TO_PROCESSOR','PROCESSOR_TO_RETAILER') NOT NULL,
  `AsalPengirim` varchar(255) NOT NULL,
  `TujuanPenerima` varchar(255) NOT NULL,
  `AlamatAsal` varchar(255) DEFAULT NULL,
  `AlamatTujuan` varchar(255) DEFAULT NULL,
  `TanggalPickup` date NOT NULL,
  `TanggalEstimasiTiba` date DEFAULT NULL,
  `StatusPengiriman` enum('PICKUP','DALAM_PERJALANAN','TERKIRIM','GAGAL') NOT NULL DEFAULT 'PICKUP',
  `KeteranganPengiriman` varchar(255) DEFAULT NULL,
  `ReferensiEksternal` varchar(50) DEFAULT NULL COMMENT 'Kode Pengiriman dari farm/processor website',
  `UpstreamCycleId` int(11) DEFAULT NULL COMMENT 'KodeCycle from peternakan blockchain for cross-chain linking',
  PRIMARY KEY (`KodePengiriman`),
  KEY `FK_Pengiriman_Perusahaan` (`KodePerusahaan`),
  KEY `FK_Pengiriman_Kurir` (`KodeKurir`),
  CONSTRAINT `FK_Pengiriman_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `PerusahaanKurir` (`KodePerusahaan`),
  CONSTRAINT `FK_Pengiriman_Kurir` FOREIGN KEY (`KodeKurir`) REFERENCES `Kurir` (`KodeKurir`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: BuktiTandaTerima (Proof of Receipt from Sender)
-- ============================================

CREATE TABLE `BuktiTandaTerima` (
  `KodeBukti` char(13) NOT NULL,
  `KodePengiriman` char(13) NOT NULL,
  `TanggalTerima` date NOT NULL,
  `NamaPengirim` varchar(100) NOT NULL,
  `NamaPenerima` varchar(100) NOT NULL COMMENT 'Nama kurir yang menerima',
  `JumlahBarang` int(11) DEFAULT NULL,
  `BeratTotal` float DEFAULT NULL COMMENT 'Berat total dalam kg',
  `Keterangan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`KodeBukti`),
  KEY `FK_Bukti_Pengiriman` (`KodePengiriman`),
  CONSTRAINT `FK_Bukti_Pengiriman` FOREIGN KEY (`KodePengiriman`) REFERENCES `Pengiriman` (`KodePengiriman`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: NotaPengirimanKurir (Delivery Confirmation Note)
-- ============================================

CREATE TABLE `NotaPengirimanKurir` (
  `KodeNota` char(13) NOT NULL,
  `KodePengiriman` char(13) NOT NULL,
  `TanggalSampai` date NOT NULL,
  `NamaPenerima` varchar(100) NOT NULL COMMENT 'Nama penerima di tujuan',
  `KondisiBarang` enum('BAIK','RUSAK_SEBAGIAN','RUSAK_TOTAL') NOT NULL DEFAULT 'BAIK',
  `Keterangan` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`KodeNota`),
  KEY `FK_Nota_Pengiriman` (`KodePengiriman`),
  CONSTRAINT `FK_Nota_Pengiriman` FOREIGN KEY (`KodePengiriman`) REFERENCES `Pengiriman` (`KodePengiriman`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: BlockchainIdentity (Chain Identity)
-- ============================================

CREATE TABLE `BlockchainIdentity` (
  `IdIdentity` int(11) NOT NULL AUTO_INCREMENT,
  `KodeIdentity` varchar(25) NOT NULL,
  `KodePerusahaan` int(11) NOT NULL,
  `KodePengiriman` char(13) NOT NULL,
  `GenesisHash` varchar(64) NOT NULL,
  `LatestBlockHash` varchar(64) DEFAULT NULL,
  `TotalBlocks` int(11) DEFAULT 1,
  `StatusChain` enum('ACTIVE','COMPLETED','FAILED','TRANSFERRED') NOT NULL DEFAULT 'ACTIVE',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `CompletedAt` datetime DEFAULT NULL,
  `UpstreamChainHash` varchar(64) DEFAULT NULL COMMENT 'Latest hash from upstream peternakan chain at linking time',
  `UpstreamNodeType` varchar(30) DEFAULT NULL COMMENT 'Source node type (NODE_PETERNAKAN)',
  `UpstreamCycleId` int(11) DEFAULT NULL COMMENT 'KodeCycle from peternakan blockchain',
  PRIMARY KEY (`IdIdentity`),
  UNIQUE KEY `KodeIdentity` (`KodeIdentity`),
  KEY `FK_BI_Perusahaan` (`KodePerusahaan`),
  KEY `FK_BI_Pengiriman` (`KodePengiriman`),
  CONSTRAINT `FK_BI_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `PerusahaanKurir` (`KodePerusahaan`),
  CONSTRAINT `FK_BI_Pengiriman` FOREIGN KEY (`KodePengiriman`) REFERENCES `Pengiriman` (`KodePengiriman`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: ledger_kurir (Blockchain Ledger)
-- ============================================

CREATE TABLE `ledger_kurir` (
  `IdBlock` int(11) NOT NULL AUTO_INCREMENT,
  `KodeBlock` varchar(25) NOT NULL,
  `KodePerusahaan` int(11) NOT NULL,
  `KodePengiriman` char(13) DEFAULT NULL,
  `TipeBlock` enum('GENESIS','PICKUP_FARM','DELIVERY_PROCESSOR','PICKUP_PROCESSOR','DELIVERY_RETAILER','LINK_UPSTREAM') NOT NULL,
  `BlockIndex` int(11) NOT NULL DEFAULT 0,
  `PreviousHash` varchar(64) NOT NULL,
  `CurrentHash` varchar(64) NOT NULL,
  `DataPayload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`DataPayload`)),
  `Nonce` int(11) DEFAULT 0,
  `StatusBlock` enum('VALIDATED','REJECTED') NOT NULL DEFAULT 'VALIDATED',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `ValidatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`IdBlock`),
  UNIQUE KEY `KodeBlock` (`KodeBlock`),
  KEY `FK_Ledger_Perusahaan` (`KodePerusahaan`),
  KEY `FK_Ledger_Pengiriman` (`KodePengiriman`),
  CONSTRAINT `FK_Ledger_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `PerusahaanKurir` (`KodePerusahaan`),
  CONSTRAINT `FK_Ledger_Pengiriman` FOREIGN KEY (`KodePengiriman`) REFERENCES `Pengiriman` (`KodePengiriman`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- TABLE: CodeCounter (Auto-increment Code Generator)
-- ============================================

CREATE TABLE `CodeCounter` (
  `EntityName` varchar(50) NOT NULL,
  `LastCounter` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`EntityName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ============================================
-- INITIAL DATA: CodeCounter
-- ============================================

INSERT INTO `CodeCounter` (`EntityName`, `LastCounter`) VALUES
('Kurir', 0),
('Pengiriman', 0),
('BuktiTandaTerima', 0),
('NotaPengirimanKurir', 0);

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
