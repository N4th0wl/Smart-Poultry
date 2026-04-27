-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 05, 2026 at 02:23 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE smartpoultry_kurir;
USE smartpoultry_kurir;


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smartpoultry_kurir`
--

-- --------------------------------------------------------

--
-- Table structure for table `blockchainidentity`
--

CREATE TABLE `blockchainidentity` (
  `IdIdentity` int NOT NULL,
  `KodeIdentity` varchar(25) COLLATE utf8mb4_general_ci NOT NULL,
  `KodePerusahaan` int NOT NULL,
  `KodePengiriman` char(13) COLLATE utf8mb4_general_ci NOT NULL,
  `GenesisHash` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `LatestBlockHash` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `TotalBlocks` int DEFAULT '1',
  `StatusChain` enum('ACTIVE','COMPLETED','FAILED','TRANSFERRED') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'ACTIVE',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `CompletedAt` datetime DEFAULT NULL,
  `UpstreamChainHash` varchar(64) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Latest hash from upstream peternakan chain at linking time',
  `UpstreamNodeType` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Source node type (NODE_PETERNAKAN)',
  `UpstreamCycleId` int DEFAULT NULL COMMENT 'KodeCycle from peternakan blockchain'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `buktitandaterima`
--

CREATE TABLE `buktitandaterima` (
  `KodeBukti` char(13) COLLATE utf8mb4_general_ci NOT NULL,
  `KodePengiriman` char(13) COLLATE utf8mb4_general_ci NOT NULL,
  `TanggalTerima` date NOT NULL,
  `NamaPengirim` varchar(100) COLLATE utf8mb4_general_ci NOT NULL,
  `NamaPenerima` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Nama kurir yang menerima',
  `JumlahBarang` int DEFAULT NULL,
  `BeratTotal` float DEFAULT NULL COMMENT 'Berat total dalam kg',
  `Keterangan` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `codecounter`
--

CREATE TABLE `codecounter` (
  `EntityName` varchar(50) COLLATE utf8mb4_general_ci NOT NULL,
  `LastCounter` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `codecounter`
--

INSERT INTO `codecounter` (`EntityName`, `LastCounter`) VALUES
('BuktiTandaTerima', 0),
('Kurir', 0),
('NotaPengirimanKurir', 0),
('Pengiriman', 0);

-- --------------------------------------------------------

--
-- Table structure for table `kurir`
--

CREATE TABLE `kurir` (
  `KodeKurir` char(13) COLLATE utf8mb4_general_ci NOT NULL,
  `KodePerusahaan` int NOT NULL,
  `NamaKurir` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `NoTelp` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `StatusKurir` enum('AKTIF','NONAKTIF') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'AKTIF'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ledger_kurir`
--

CREATE TABLE `ledger_kurir` (
  `IdBlock` int NOT NULL,
  `KodeBlock` varchar(25) COLLATE utf8mb4_general_ci NOT NULL,
  `KodePerusahaan` int NOT NULL,
  `KodePengiriman` char(13) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `TipeBlock` enum('GENESIS','PICKUP_FARM','DELIVERY_PROCESSOR','PICKUP_PROCESSOR','DELIVERY_RETAILER','LINK_UPSTREAM') COLLATE utf8mb4_general_ci NOT NULL,
  `BlockIndex` int NOT NULL DEFAULT '0',
  `PreviousHash` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `CurrentHash` varchar(64) COLLATE utf8mb4_general_ci NOT NULL,
  `DataPayload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `Nonce` int DEFAULT '0',
  `StatusBlock` enum('VALIDATED','REJECTED') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'VALIDATED',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `ValidatedAt` datetime DEFAULT CURRENT_TIMESTAMP
) ;

-- --------------------------------------------------------

--
-- Table structure for table `login`
--

CREATE TABLE `login` (
  `UserID` int NOT NULL,
  `KodePerusahaan` int NOT NULL,
  `Email` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `Password` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `Role` enum('admin','user') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `login`
--

INSERT INTO `login` (`UserID`, `KodePerusahaan`, `Email`, `Password`, `Role`) VALUES
(1, 1, 'kurirrudy@gmail.com', '$2b$10$Z.NvMn5R50Kx4/qfp7EHFuFKUNLZBDBv4ELdX4OPnOOcMPTh8w6h.', 'user');

-- --------------------------------------------------------

--
-- Table structure for table `notapengirimankurir`
--

CREATE TABLE `notapengirimankurir` (
  `KodeNota` char(13) COLLATE utf8mb4_general_ci NOT NULL,
  `KodePengiriman` char(13) COLLATE utf8mb4_general_ci NOT NULL,
  `TanggalSampai` date NOT NULL,
  `NamaPenerima` varchar(100) COLLATE utf8mb4_general_ci NOT NULL COMMENT 'Nama penerima di tujuan',
  `KondisiBarang` enum('BAIK','RUSAK_SEBAGIAN','RUSAK_TOTAL') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'BAIK',
  `Keterangan` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pengiriman`
--

CREATE TABLE `pengiriman` (
  `KodePengiriman` char(13) COLLATE utf8mb4_general_ci NOT NULL,
  `KodePerusahaan` int NOT NULL,
  `KodeKurir` char(13) COLLATE utf8mb4_general_ci NOT NULL,
  `TipePengiriman` enum('FARM_TO_PROCESSOR','PROCESSOR_TO_RETAILER') COLLATE utf8mb4_general_ci NOT NULL,
  `AsalPengirim` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `TujuanPenerima` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `AlamatAsal` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `AlamatTujuan` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `TanggalPickup` date NOT NULL,
  `TanggalEstimasiTiba` date DEFAULT NULL,
  `StatusPengiriman` enum('PICKUP','DALAM_PERJALANAN','TERKIRIM','GAGAL') COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'PICKUP',
  `KeteranganPengiriman` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `ReferensiEksternal` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Kode Pengiriman dari farm/processor website',
  `UpstreamCycleId` int DEFAULT NULL COMMENT 'KodeCycle from peternakan blockchain for cross-chain linking'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `perusahaankurir`
--

CREATE TABLE `perusahaankurir` (
  `KodePerusahaan` int NOT NULL,
  `NamaPerusahaan` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `AlamatPerusahaan` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `KontakPerusahaan` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `perusahaankurir`
--

INSERT INTO `perusahaankurir` (`KodePerusahaan`, `NamaPerusahaan`, `AlamatPerusahaan`, `KontakPerusahaan`) VALUES
(1, 'KurirRudy', 'Gading Serpong', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  ADD PRIMARY KEY (`IdIdentity`),
  ADD UNIQUE KEY `KodeIdentity` (`KodeIdentity`),
  ADD KEY `FK_BI_Perusahaan` (`KodePerusahaan`),
  ADD KEY `FK_BI_Pengiriman` (`KodePengiriman`);

--
-- Indexes for table `buktitandaterima`
--
ALTER TABLE `buktitandaterima`
  ADD PRIMARY KEY (`KodeBukti`),
  ADD KEY `FK_Bukti_Pengiriman` (`KodePengiriman`);

--
-- Indexes for table `codecounter`
--
ALTER TABLE `codecounter`
  ADD PRIMARY KEY (`EntityName`);

--
-- Indexes for table `kurir`
--
ALTER TABLE `kurir`
  ADD PRIMARY KEY (`KodeKurir`),
  ADD KEY `FK_Kurir_Perusahaan` (`KodePerusahaan`);

--
-- Indexes for table `ledger_kurir`
--
ALTER TABLE `ledger_kurir`
  ADD PRIMARY KEY (`IdBlock`),
  ADD UNIQUE KEY `KodeBlock` (`KodeBlock`),
  ADD KEY `FK_Ledger_Perusahaan` (`KodePerusahaan`),
  ADD KEY `FK_Ledger_Pengiriman` (`KodePengiriman`);

--
-- Indexes for table `login`
--
ALTER TABLE `login`
  ADD PRIMARY KEY (`UserID`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD KEY `FK_Login_Perusahaan` (`KodePerusahaan`);

--
-- Indexes for table `notapengirimankurir`
--
ALTER TABLE `notapengirimankurir`
  ADD PRIMARY KEY (`KodeNota`),
  ADD KEY `FK_Nota_Pengiriman` (`KodePengiriman`);

--
-- Indexes for table `pengiriman`
--
ALTER TABLE `pengiriman`
  ADD PRIMARY KEY (`KodePengiriman`),
  ADD KEY `FK_Pengiriman_Perusahaan` (`KodePerusahaan`),
  ADD KEY `FK_Pengiriman_Kurir` (`KodeKurir`);

--
-- Indexes for table `perusahaankurir`
--
ALTER TABLE `perusahaankurir`
  ADD PRIMARY KEY (`KodePerusahaan`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  MODIFY `IdIdentity` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ledger_kurir`
--
ALTER TABLE `ledger_kurir`
  MODIFY `IdBlock` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `login`
--
ALTER TABLE `login`
  MODIFY `UserID` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `perusahaankurir`
--
ALTER TABLE `perusahaankurir`
  MODIFY `KodePerusahaan` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  ADD CONSTRAINT `FK_BI_Pengiriman` FOREIGN KEY (`KodePengiriman`) REFERENCES `pengiriman` (`KodePengiriman`),
  ADD CONSTRAINT `FK_BI_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `perusahaankurir` (`KodePerusahaan`);

--
-- Constraints for table `buktitandaterima`
--
ALTER TABLE `buktitandaterima`
  ADD CONSTRAINT `FK_Bukti_Pengiriman` FOREIGN KEY (`KodePengiriman`) REFERENCES `pengiriman` (`KodePengiriman`);

--
-- Constraints for table `kurir`
--
ALTER TABLE `kurir`
  ADD CONSTRAINT `FK_Kurir_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `perusahaankurir` (`KodePerusahaan`);

--
-- Constraints for table `ledger_kurir`
--
ALTER TABLE `ledger_kurir`
  ADD CONSTRAINT `FK_Ledger_Pengiriman` FOREIGN KEY (`KodePengiriman`) REFERENCES `pengiriman` (`KodePengiriman`),
  ADD CONSTRAINT `FK_Ledger_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `perusahaankurir` (`KodePerusahaan`);

--
-- Constraints for table `login`
--
ALTER TABLE `login`
  ADD CONSTRAINT `FK_Login_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `perusahaankurir` (`KodePerusahaan`);

--
-- Constraints for table `notapengirimankurir`
--
ALTER TABLE `notapengirimankurir`
  ADD CONSTRAINT `FK_Nota_Pengiriman` FOREIGN KEY (`KodePengiriman`) REFERENCES `pengiriman` (`KodePengiriman`);

--
-- Constraints for table `pengiriman`
--
ALTER TABLE `pengiriman`
  ADD CONSTRAINT `FK_Pengiriman_Kurir` FOREIGN KEY (`KodeKurir`) REFERENCES `kurir` (`KodeKurir`),
  ADD CONSTRAINT `FK_Pengiriman_Perusahaan` FOREIGN KEY (`KodePerusahaan`) REFERENCES `perusahaankurir` (`KodePerusahaan`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
