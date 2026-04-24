-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 05, 2026 at 02:24 AM
-- Server version: 8.4.3
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `smartpoultry_retailer`
--

-- --------------------------------------------------------

--
-- Table structure for table `blockchainidentity`
--

CREATE TABLE `blockchainidentity` (
  `IdIdentity` int NOT NULL,
  `KodeIdentity` varchar(25) NOT NULL,
  `IdOrder` int DEFAULT NULL,
  `IdRetailer` int DEFAULT NULL,
  `KodeProcessor` varchar(25) DEFAULT NULL,
  `KodeOrderProcessor` varchar(25) DEFAULT NULL,
  `ProcessorLastBlockHash` varchar(64) DEFAULT NULL,
  `GenesisHash` varchar(64) NOT NULL,
  `LatestBlockHash` varchar(64) DEFAULT NULL,
  `TotalBlocks` int DEFAULT '1',
  `StatusChain` enum('ACTIVE','COMPLETED','FAILED') NOT NULL DEFAULT 'ACTIVE',
  `CompletedAt` datetime DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `codecounter`
--

CREATE TABLE `codecounter` (
  `EntityName` varchar(50) NOT NULL,
  `LastCounter` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `codecounter`
--

INSERT INTO `codecounter` (`EntityName`, `LastCounter`) VALUES
('Order', 1),
('Retailer', 1),
('User', 1);

-- --------------------------------------------------------

--
-- Table structure for table `detail_penjualan`
--

CREATE TABLE `detail_penjualan` (
  `IdDetail` int NOT NULL,
  `IdPenjualan` int NOT NULL,
  `IdGudang` int NOT NULL,
  `NamaProduk` varchar(255) NOT NULL,
  `JumlahJual` int NOT NULL,
  `HargaSatuan` decimal(12,2) NOT NULL,
  `Subtotal` decimal(15,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `gudang`
--

CREATE TABLE `gudang` (
  `IdGudang` int NOT NULL,
  `KodeGudang` varchar(13) NOT NULL,
  `IdRetailer` int DEFAULT NULL,
  `NamaProduk` varchar(255) NOT NULL,
  `JenisProduk` varchar(100) NOT NULL,
  `StokMasuk` int NOT NULL DEFAULT '0',
  `StokKeluar` int NOT NULL DEFAULT '0',
  `StokSaatIni` int NOT NULL DEFAULT '0',
  `Satuan` enum('KG','PCS','PACK','BOX') NOT NULL DEFAULT 'KG',
  `HargaJual` decimal(12,2) DEFAULT '0.00',
  `LokasiGudang` varchar(255) DEFAULT NULL,
  `TanggalMasuk` date DEFAULT NULL,
  `TanggalKadaluarsa` date DEFAULT NULL,
  `StatusStok` enum('TERSEDIA','HABIS','HAMPIR_HABIS') NOT NULL DEFAULT 'TERSEDIA',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ledger_retailer`
--

CREATE TABLE `ledger_retailer` (
  `IdBlock` int NOT NULL,
  `KodeBlock` varchar(25) NOT NULL,
  `IdIdentity` int NOT NULL,
  `IdRetailer` int DEFAULT NULL,
  `IdOrder` int DEFAULT NULL,
  `IdGudang` int DEFAULT NULL,
  `IdPenjualan` int DEFAULT NULL,
  `TipeBlock` enum('RECEIVE_FROM_PROCESSOR','NOTA_PENERIMAAN','STOCK_IN','SALE_RECORDED','STOCK_OUT') NOT NULL,
  `BlockIndex` int NOT NULL DEFAULT '0',
  `PreviousHash` varchar(64) NOT NULL,
  `CurrentHash` varchar(64) NOT NULL,
  `DataPayload` longtext NOT NULL,
  `Nonce` int DEFAULT '0',
  `StatusBlock` enum('VALIDATED','REJECTED') NOT NULL DEFAULT 'VALIDATED',
  `ValidatedAt` datetime DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nota_penerimaan`
--

CREATE TABLE `nota_penerimaan` (
  `IdNotaPenerimaan` int NOT NULL,
  `KodeNotaPenerimaan` varchar(13) NOT NULL,
  `IdOrder` int NOT NULL,
  `IdRetailer` int DEFAULT NULL,
  `KodeNotaPengirimanProcessor` varchar(25) DEFAULT NULL,
  `TanggalPenerimaan` date NOT NULL,
  `NamaPengirim` varchar(255) DEFAULT NULL,
  `NamaPenerima` varchar(255) NOT NULL,
  `JumlahDikirim` int DEFAULT NULL,
  `JumlahDiterima` int NOT NULL,
  `JumlahRusak` int DEFAULT '0',
  `KondisiBarang` enum('BAIK','CUKUP','BURUK') NOT NULL DEFAULT 'BAIK',
  `SuhuSaatTerima` decimal(5,2) DEFAULT NULL,
  `CatatanPenerimaan` text,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `IdOrder` int NOT NULL,
  `KodeOrder` varchar(25) NOT NULL,
  `IdRetailer` int DEFAULT NULL,
  `NamaProcessor` varchar(255) NOT NULL,
  `AlamatProcessor` varchar(500) DEFAULT NULL,
  `KontakProcessor` varchar(20) DEFAULT NULL,
  `NamaProduk` varchar(255) NOT NULL,
  `JenisProduk` varchar(100) NOT NULL,
  `JumlahPesanan` int NOT NULL,
  `Satuan` enum('KG','PCS','PACK','BOX') NOT NULL DEFAULT 'KG',
  `TanggalOrder` date NOT NULL,
  `TanggalDibutuhkan` date NOT NULL,
  `HargaSatuan` decimal(12,2) DEFAULT '0.00',
  `TotalHarga` decimal(15,2) DEFAULT '0.00',
  `StatusOrder` enum('PENDING','CONFIRMED','DIPROSES','DIKIRIM','DITERIMA','DITOLAK','SELESAI') NOT NULL DEFAULT 'PENDING',
  `PenerimaOrder` varchar(255) DEFAULT NULL,
  `TanggalDiterima` date DEFAULT NULL,
  `JumlahDiterima` int DEFAULT NULL,
  `KondisiTerima` text,
  `Catatan` text,
  `DibuatOleh` int DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `orders`
--

INSERT INTO `orders` (`IdOrder`, `KodeOrder`, `IdRetailer`, `NamaProcessor`, `AlamatProcessor`, `KontakProcessor`, `NamaProduk`, `JenisProduk`, `JumlahPesanan`, `Satuan`, `TanggalOrder`, `TanggalDibutuhkan`, `HargaSatuan`, `TotalHarga`, `StatusOrder`, `PenerimaOrder`, `TanggalDiterima`, `JumlahDiterima`, `KondisiTerima`, `Catatan`, `DibuatOleh`, `CreatedAt`, `UpdatedAt`) VALUES
(1, 'ORD-000000001', 1, 'PT Ayam Potong SmartPoultry', 'Jl. Industri No. 1, Jakarta', '021-5551234', 'Whole Chicken', 'Ayam Utuh', 100, 'KG', '2026-03-31', '2026-04-01', 35000.00, 3500000.00, 'DIPROSES', NULL, NULL, NULL, NULL, 'Ayam', 1, '2026-03-31 12:24:32', '2026-03-31 12:31:34');

-- --------------------------------------------------------

--
-- Table structure for table `penjualan`
--

CREATE TABLE `penjualan` (
  `IdPenjualan` int NOT NULL,
  `KodePenjualan` varchar(13) NOT NULL,
  `IdRetailer` int DEFAULT NULL,
  `TanggalPenjualan` date NOT NULL,
  `NamaPembeli` varchar(255) DEFAULT NULL,
  `TotalItem` int NOT NULL DEFAULT '0',
  `TotalHarga` decimal(15,2) DEFAULT '0.00',
  `MetodePembayaran` enum('TUNAI','TRANSFER','QRIS','LAINNYA') NOT NULL DEFAULT 'TUNAI',
  `StatusPenjualan` enum('SELESAI','DIBATALKAN') NOT NULL DEFAULT 'SELESAI',
  `Catatan` text,
  `DibuatOleh` int DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `retailer`
--

CREATE TABLE `retailer` (
  `IdRetailer` int NOT NULL,
  `KodeRetailer` varchar(13) NOT NULL,
  `NamaRetailer` varchar(255) NOT NULL,
  `AlamatRetailer` text,
  `KontakRetailer` varchar(100) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `retailer`
--

INSERT INTO `retailer` (`IdRetailer`, `KodeRetailer`, `NamaRetailer`, `AlamatRetailer`, `KontakRetailer`, `CreatedAt`, `UpdatedAt`) VALUES
(1, 'RTL-000000001', 'Toko Ayam Pak Rudy', 'Gading Serpong', '08XXXXXXXXXX', '2026-03-31 09:35:30', '2026-03-31 09:35:30');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `IdUser` int NOT NULL,
  `KodeUser` varchar(25) NOT NULL,
  `IdRetailer` int DEFAULT NULL,
  `Email` varchar(255) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `NamaLengkap` varchar(255) DEFAULT NULL,
  `Role` enum('ADMIN','RETAILER') NOT NULL DEFAULT 'RETAILER',
  `StatusAkun` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`IdUser`, `KodeUser`, `IdRetailer`, `Email`, `Password`, `NamaLengkap`, `Role`, `StatusAkun`, `CreatedAt`, `UpdatedAt`) VALUES
(1, 'USR-000000001', 1, 'retailerrudy@gmail.com', '$2b$10$XVgbIUQjPLq.T7FpNogL7.dgOOKSP3X2LypzjbysJ8OzcgWUWyfZK', 'Toko Ayam Pak Rudy', 'ADMIN', 'ACTIVE', '2026-03-31 09:35:30', '2026-03-31 09:35:30');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  ADD PRIMARY KEY (`IdIdentity`),
  ADD UNIQUE KEY `KodeIdentity` (`KodeIdentity`),
  ADD KEY `IdOrder` (`IdOrder`),
  ADD KEY `IdRetailer` (`IdRetailer`);

--
-- Indexes for table `codecounter`
--
ALTER TABLE `codecounter`
  ADD PRIMARY KEY (`EntityName`);

--
-- Indexes for table `detail_penjualan`
--
ALTER TABLE `detail_penjualan`
  ADD PRIMARY KEY (`IdDetail`),
  ADD KEY `IdPenjualan` (`IdPenjualan`),
  ADD KEY `IdGudang` (`IdGudang`);

--
-- Indexes for table `gudang`
--
ALTER TABLE `gudang`
  ADD PRIMARY KEY (`IdGudang`),
  ADD UNIQUE KEY `KodeGudang` (`KodeGudang`),
  ADD KEY `IdRetailer` (`IdRetailer`);

--
-- Indexes for table `ledger_retailer`
--
ALTER TABLE `ledger_retailer`
  ADD PRIMARY KEY (`IdBlock`),
  ADD UNIQUE KEY `KodeBlock` (`KodeBlock`),
  ADD KEY `IdIdentity` (`IdIdentity`),
  ADD KEY `IdRetailer` (`IdRetailer`),
  ADD KEY `IdOrder` (`IdOrder`),
  ADD KEY `IdGudang` (`IdGudang`),
  ADD KEY `IdPenjualan` (`IdPenjualan`);

--
-- Indexes for table `nota_penerimaan`
--
ALTER TABLE `nota_penerimaan`
  ADD PRIMARY KEY (`IdNotaPenerimaan`),
  ADD UNIQUE KEY `KodeNotaPenerimaan` (`KodeNotaPenerimaan`),
  ADD KEY `IdOrder` (`IdOrder`),
  ADD KEY `IdRetailer` (`IdRetailer`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`IdOrder`),
  ADD UNIQUE KEY `KodeOrder` (`KodeOrder`),
  ADD KEY `IdRetailer` (`IdRetailer`),
  ADD KEY `DibuatOleh` (`DibuatOleh`);

--
-- Indexes for table `penjualan`
--
ALTER TABLE `penjualan`
  ADD PRIMARY KEY (`IdPenjualan`),
  ADD UNIQUE KEY `KodePenjualan` (`KodePenjualan`),
  ADD KEY `IdRetailer` (`IdRetailer`),
  ADD KEY `DibuatOleh` (`DibuatOleh`);

--
-- Indexes for table `retailer`
--
ALTER TABLE `retailer`
  ADD PRIMARY KEY (`IdRetailer`),
  ADD UNIQUE KEY `KodeRetailer` (`KodeRetailer`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`IdUser`),
  ADD UNIQUE KEY `KodeUser` (`KodeUser`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD KEY `IdRetailer` (`IdRetailer`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  MODIFY `IdIdentity` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `detail_penjualan`
--
ALTER TABLE `detail_penjualan`
  MODIFY `IdDetail` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `gudang`
--
ALTER TABLE `gudang`
  MODIFY `IdGudang` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ledger_retailer`
--
ALTER TABLE `ledger_retailer`
  MODIFY `IdBlock` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nota_penerimaan`
--
ALTER TABLE `nota_penerimaan`
  MODIFY `IdNotaPenerimaan` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `IdOrder` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `penjualan`
--
ALTER TABLE `penjualan`
  MODIFY `IdPenjualan` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `retailer`
--
ALTER TABLE `retailer`
  MODIFY `IdRetailer` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `IdUser` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  ADD CONSTRAINT `blockchainidentity_ibfk_1` FOREIGN KEY (`IdOrder`) REFERENCES `orders` (`IdOrder`) ON DELETE SET NULL,
  ADD CONSTRAINT `blockchainidentity_ibfk_2` FOREIGN KEY (`IdRetailer`) REFERENCES `retailer` (`IdRetailer`) ON DELETE SET NULL;

--
-- Constraints for table `detail_penjualan`
--
ALTER TABLE `detail_penjualan`
  ADD CONSTRAINT `detail_penjualan_ibfk_1` FOREIGN KEY (`IdPenjualan`) REFERENCES `penjualan` (`IdPenjualan`) ON DELETE CASCADE,
  ADD CONSTRAINT `detail_penjualan_ibfk_2` FOREIGN KEY (`IdGudang`) REFERENCES `gudang` (`IdGudang`) ON DELETE CASCADE;

--
-- Constraints for table `gudang`
--
ALTER TABLE `gudang`
  ADD CONSTRAINT `gudang_ibfk_1` FOREIGN KEY (`IdRetailer`) REFERENCES `retailer` (`IdRetailer`) ON DELETE SET NULL;

--
-- Constraints for table `ledger_retailer`
--
ALTER TABLE `ledger_retailer`
  ADD CONSTRAINT `ledger_retailer_ibfk_1` FOREIGN KEY (`IdIdentity`) REFERENCES `blockchainidentity` (`IdIdentity`) ON DELETE CASCADE,
  ADD CONSTRAINT `ledger_retailer_ibfk_2` FOREIGN KEY (`IdRetailer`) REFERENCES `retailer` (`IdRetailer`) ON DELETE SET NULL,
  ADD CONSTRAINT `ledger_retailer_ibfk_3` FOREIGN KEY (`IdOrder`) REFERENCES `orders` (`IdOrder`) ON DELETE SET NULL,
  ADD CONSTRAINT `ledger_retailer_ibfk_4` FOREIGN KEY (`IdGudang`) REFERENCES `gudang` (`IdGudang`) ON DELETE SET NULL,
  ADD CONSTRAINT `ledger_retailer_ibfk_5` FOREIGN KEY (`IdPenjualan`) REFERENCES `penjualan` (`IdPenjualan`) ON DELETE SET NULL;

--
-- Constraints for table `nota_penerimaan`
--
ALTER TABLE `nota_penerimaan`
  ADD CONSTRAINT `nota_penerimaan_ibfk_1` FOREIGN KEY (`IdOrder`) REFERENCES `orders` (`IdOrder`) ON DELETE CASCADE,
  ADD CONSTRAINT `nota_penerimaan_ibfk_2` FOREIGN KEY (`IdRetailer`) REFERENCES `retailer` (`IdRetailer`) ON DELETE SET NULL;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`IdRetailer`) REFERENCES `retailer` (`IdRetailer`) ON DELETE SET NULL,
  ADD CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`DibuatOleh`) REFERENCES `users` (`IdUser`) ON DELETE SET NULL;

--
-- Constraints for table `penjualan`
--
ALTER TABLE `penjualan`
  ADD CONSTRAINT `penjualan_ibfk_1` FOREIGN KEY (`IdRetailer`) REFERENCES `retailer` (`IdRetailer`) ON DELETE SET NULL,
  ADD CONSTRAINT `penjualan_ibfk_2` FOREIGN KEY (`DibuatOleh`) REFERENCES `users` (`IdUser`) ON DELETE SET NULL;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`IdRetailer`) REFERENCES `retailer` (`IdRetailer`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
