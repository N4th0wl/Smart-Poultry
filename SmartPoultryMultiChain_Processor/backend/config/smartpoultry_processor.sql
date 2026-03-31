-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 15, 2026 at 04:31 AM
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
-- Database: `smartpoultry_processor`
--

-- --------------------------------------------------------

--
-- Table structure for table `blockchainidentity`
--

CREATE TABLE `blockchainidentity` (
  `IdIdentity` int NOT NULL,
  `KodeIdentity` char(13) NOT NULL,
  `IdOrder` int NOT NULL,
  `IdProcessor` int DEFAULT NULL,
  `KodePeternakan` varchar(25) DEFAULT NULL COMMENT 'Link ke KodePeternakan dari website Farm',
  `KodeCycleFarm` varchar(25) DEFAULT NULL COMMENT 'Link ke KodeCycle dari website Farm',
  `FarmLastBlockHash` varchar(64) DEFAULT NULL COMMENT 'Hash block terakhir dari chain peternakan',
  `GenesisHash` varchar(64) NOT NULL,
  `LatestBlockHash` varchar(64) DEFAULT NULL,
  `TotalBlocks` int DEFAULT '1',
  `StatusChain` enum('ACTIVE','COMPLETED','FAILED','TRANSFERRED') NOT NULL DEFAULT 'ACTIVE',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `CompletedAt` datetime DEFAULT NULL
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
('BlockchainIdentity', 0),
('Karyawan', 0),
('LaporanMasalah', 0),
('LedgerProcessor', 0),
('NotaPenerimaan', 0),
('NotaPengiriman', 0),
('Order', 0),
('Pengiriman', 0),
('Processor', 0),
('Produksi', 0),
('QualityControl', 0),
('SertifikatHalal', 0),
('TugasProduksi', 0),
('User', 0);

-- --------------------------------------------------------

--
-- Table structure for table `karyawan`
--

CREATE TABLE `karyawan` (
  `IdKaryawan` int NOT NULL,
  `KodeKaryawan` char(13) NOT NULL,
  `IdUser` int NOT NULL,
  `IdProcessor` int DEFAULT NULL,
  `NamaLengkap` varchar(255) NOT NULL,
  `Jabatan` varchar(100) NOT NULL,
  `NoTelp` varchar(20) DEFAULT NULL,
  `StatusKaryawan` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `laporan_masalah`
--

CREATE TABLE `laporan_masalah` (
  `IdLaporan` int NOT NULL,
  `KodeLaporan` char(13) NOT NULL,
  `IdProduksi` int NOT NULL,
  `IdKaryawan` int DEFAULT NULL,
  `TanggalLaporan` date NOT NULL,
  `JenisMasalah` enum('KONTAMINASI','KERUSAKAN_MESIN','KUALITAS_BAHAN','KESALAHAN_PROSES','SANITASI','LAINNYA') NOT NULL,
  `Tingkat` enum('RINGAN','SEDANG','BERAT','KRITIS') NOT NULL DEFAULT 'SEDANG',
  `DeskripsiMasalah` text NOT NULL,
  `TindakanKorektif` text,
  `StatusLaporan` enum('DILAPORKAN','DITANGANI','SELESAI') NOT NULL DEFAULT 'DILAPORKAN',
  `Catatan` text,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `ledger_processor`
--

CREATE TABLE `ledger_processor` (
  `IdBlock` int NOT NULL,
  `KodeBlock` char(13) NOT NULL,
  `IdIdentity` int NOT NULL,
  `IdProcessor` int DEFAULT NULL,
  `IdOrder` int DEFAULT NULL,
  `IdProduksi` int DEFAULT NULL,
  `TipeBlock` enum('RECEIVE_FROM_FARM','NOTA_PENERIMAAN','PROCESSING','HALAL_CHECK','QUALITY_CHECK','LAPORAN_MASALAH','TRANSFER_TO_RETAIL') NOT NULL,
  `BlockIndex` int NOT NULL DEFAULT '0',
  `PreviousHash` varchar(64) NOT NULL,
  `CurrentHash` varchar(64) NOT NULL,
  `DataPayload` longtext NOT NULL,
  `Nonce` int DEFAULT '0',
  `StatusBlock` enum('VALIDATED','REJECTED') NOT NULL DEFAULT 'VALIDATED',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `ValidatedAt` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nota_penerimaan`
--

CREATE TABLE `nota_penerimaan` (
  `IdNotaPenerimaan` int NOT NULL,
  `KodeNotaPenerimaan` char(13) NOT NULL,
  `IdOrder` int NOT NULL,
  `KodeNotaPengirimanFarm` varchar(13) DEFAULT NULL COMMENT 'Kode Nota Pengiriman dari website peternakan',
  `KodeCycleFarm` varchar(25) DEFAULT NULL COMMENT 'Kode Cycle dari peternakan untuk link chain',
  `TanggalPenerimaan` date NOT NULL,
  `NamaPengirim` varchar(255) DEFAULT NULL,
  `NamaPenerima` varchar(255) NOT NULL,
  `JumlahDikirim` int DEFAULT NULL,
  `JumlahDiterima` int NOT NULL,
  `JumlahRusak` int DEFAULT '0',
  `KondisiAyam` enum('BAIK','CUKUP','BURUK') NOT NULL DEFAULT 'BAIK',
  `SuhuSaatTerima` decimal(5,2) DEFAULT NULL,
  `CatatanPenerimaan` text,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `nota_pengiriman`
--

CREATE TABLE `nota_pengiriman` (
  `IdNota` int NOT NULL,
  `KodeNota` char(13) NOT NULL,
  `IdPengiriman` int NOT NULL,
  `TanggalNota` date NOT NULL,
  `NamaBarang` varchar(255) NOT NULL,
  `Varian` varchar(100) DEFAULT NULL,
  `Jumlah` int NOT NULL,
  `Satuan` enum('KG','EKOR','PCS') NOT NULL DEFAULT 'KG',
  `HargaSatuan` decimal(15,2) NOT NULL,
  `TotalHarga` decimal(15,2) NOT NULL,
  `StatusNota` enum('DRAFT','LUNAS','BATAL') NOT NULL DEFAULT 'DRAFT',
  `Catatan` text,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orders`
--

CREATE TABLE `orders` (
  `IdOrder` int NOT NULL,
  `KodeOrder` char(13) NOT NULL,
  `IdProcessor` int DEFAULT NULL,
  `NamaPeternakan` varchar(255) NOT NULL,
  `AlamatPeternakan` text,
  `KontakPeternakan` varchar(100) DEFAULT NULL,
  `JenisAyam` varchar(100) NOT NULL,
  `JumlahPesanan` int NOT NULL,
  `Satuan` enum('EKOR','KG') NOT NULL DEFAULT 'EKOR',
  `TanggalOrder` date NOT NULL,
  `TanggalDibutuhkan` date NOT NULL,
  `HargaSatuan` decimal(15,2) DEFAULT '0.00',
  `TotalHarga` decimal(15,2) DEFAULT '0.00',
  `StatusOrder` enum('PENDING','CONFIRMED','DIKIRIM','DITERIMA','SELESAI','DITOLAK') NOT NULL DEFAULT 'PENDING',
  `PenerimaOrder` varchar(255) DEFAULT NULL,
  `JumlahDiterima` int DEFAULT NULL,
  `KondisiTerima` text,
  `TanggalDiterima` date DEFAULT NULL,
  `Catatan` text,
  `DibuatOleh` int DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pengiriman`
--

CREATE TABLE `pengiriman` (
  `IdPengiriman` int NOT NULL,
  `KodePengiriman` char(13) NOT NULL,
  `IdProduksi` int NOT NULL,
  `TujuanPengiriman` text NOT NULL,
  `NamaPenerima` varchar(255) NOT NULL,
  `KontakPenerima` varchar(100) DEFAULT NULL,
  `TanggalKirim` date NOT NULL,
  `TanggalSampai` date DEFAULT NULL,
  `JumlahKirim` int NOT NULL,
  `BeratKirim` decimal(10,2) DEFAULT '0.00',
  `MetodePengiriman` enum('DIANTAR','DIAMBIL','EKSPEDISI') NOT NULL DEFAULT 'DIANTAR',
  `NamaEkspedisi` varchar(255) DEFAULT NULL,
  `StatusPengiriman` enum('DISIAPKAN','DIKIRIM','DIKIRIM_KURIR','DALAM_PERJALANAN','TERKIRIM','GAGAL') NOT NULL DEFAULT 'DISIAPKAN',
  `Catatan` text,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `processor`
--

CREATE TABLE `processor` (
  `IdProcessor` int NOT NULL,
  `KodeProcessor` char(13) NOT NULL,
  `NamaProcessor` varchar(255) NOT NULL,
  `AlamatProcessor` text,
  `KontakProcessor` varchar(100) DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `produksi`
--

CREATE TABLE `produksi` (
  `IdProduksi` int NOT NULL,
  `KodeProduksi` char(13) NOT NULL,
  `IdOrder` int NOT NULL,
  `IdTugas` int DEFAULT NULL,
  `IdKaryawan` int DEFAULT NULL,
  `TanggalProduksi` date NOT NULL,
  `JenisAyam` varchar(100) NOT NULL,
  `JumlahInput` int NOT NULL,
  `JumlahOutput` int NOT NULL,
  `BeratTotal` decimal(10,2) DEFAULT '0.00',
  `Varian` varchar(100) DEFAULT NULL,
  `SertifikatHalal` enum('ADA','TIDAK_ADA') NOT NULL DEFAULT 'TIDAK_ADA',
  `StatusProduksi` enum('PROSES','QUALITY_CHECK','LULUS_QC','GAGAL_QC','SELESAI') NOT NULL DEFAULT 'PROSES',
  `Catatan` text,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `quality_control`
--

CREATE TABLE `quality_control` (
  `IdQC` int NOT NULL,
  `KodeQC` char(13) NOT NULL,
  `IdProduksi` int NOT NULL,
  `IdKaryawan` int DEFAULT NULL,
  `TanggalQC` date NOT NULL,
  `Suhu` decimal(5,2) DEFAULT NULL,
  `Kelembaban` decimal(5,2) DEFAULT NULL,
  `WarnaAyam` varchar(100) DEFAULT NULL,
  `BauAyam` enum('NORMAL','TIDAK_NORMAL') NOT NULL DEFAULT 'NORMAL',
  `TeksturAyam` enum('NORMAL','TIDAK_NORMAL') NOT NULL DEFAULT 'NORMAL',
  `HasilQC` enum('LULUS','GAGAL') NOT NULL,
  `Catatan` text,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sertifikat_halal`
--

CREATE TABLE `sertifikat_halal` (
  `IdSertifikat` int NOT NULL,
  `KodeSertifikat` char(13) NOT NULL,
  `IdProduksi` int NOT NULL,
  `IdKaryawan` int DEFAULT NULL,
  `TanggalPengecekan` date NOT NULL,
  `NomorSertifikat` varchar(100) DEFAULT NULL,
  `LembagaPenerbit` varchar(255) DEFAULT NULL,
  `TanggalTerbit` date DEFAULT NULL,
  `TanggalExpired` date DEFAULT NULL,
  `StatusHalal` enum('VALID','EXPIRED','TIDAK_ADA','DALAM_PROSES') NOT NULL DEFAULT 'DALAM_PROSES',
  `MetodePenyembelihan` enum('MANUAL','MESIN','SEMI_MESIN') DEFAULT NULL,
  `HasilVerifikasi` enum('LOLOS','TIDAK_LOLOS','PENDING') NOT NULL DEFAULT 'PENDING',
  `Catatan` text,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `tugas_produksi`
--

CREATE TABLE `tugas_produksi` (
  `IdTugas` int NOT NULL,
  `KodeTugas` char(13) NOT NULL,
  `IdOrder` int NOT NULL,
  `IdKaryawan` int DEFAULT NULL,
  `NamaTugas` varchar(255) NOT NULL,
  `DeskripsiTugas` text,
  `JenisTugas` enum('PEMOTONGAN','PENCABUTAN_BULU','PEMBERSIHAN','PENGEMASAN','PENYIMPANAN','LAINNYA') NOT NULL,
  `StatusTugas` enum('BELUM_DIKERJAKAN','SEDANG_DIKERJAKAN','SELESAI','DIBATALKAN') NOT NULL DEFAULT 'BELUM_DIKERJAKAN',
  `TanggalMulai` date DEFAULT NULL,
  `TanggalSelesai` date DEFAULT NULL,
  `Catatan` text,
  `DitugaskanOleh` int DEFAULT NULL,
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `IdUser` int NOT NULL,
  `KodeUser` char(13) NOT NULL,
  `IdProcessor` int DEFAULT NULL,
  `Email` varchar(255) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Role` enum('ADMIN','KARYAWAN') NOT NULL DEFAULT 'KARYAWAN',
  `StatusAkun` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `CreatedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  ADD PRIMARY KEY (`IdIdentity`),
  ADD UNIQUE KEY `KodeIdentity` (`KodeIdentity`),
  ADD KEY `fk_blockchain_order` (`IdOrder`),
  ADD KEY `fk_blockchain_processor` (`IdProcessor`);

--
-- Indexes for table `codecounter`
--
ALTER TABLE `codecounter`
  ADD PRIMARY KEY (`EntityName`);

--
-- Indexes for table `karyawan`
--
ALTER TABLE `karyawan`
  ADD PRIMARY KEY (`IdKaryawan`),
  ADD UNIQUE KEY `KodeKaryawan` (`KodeKaryawan`),
  ADD KEY `fk_karyawan_user` (`IdUser`),
  ADD KEY `fk_karyawan_processor` (`IdProcessor`);

--
-- Indexes for table `laporan_masalah`
--
ALTER TABLE `laporan_masalah`
  ADD PRIMARY KEY (`IdLaporan`),
  ADD UNIQUE KEY `KodeLaporan` (`KodeLaporan`),
  ADD KEY `fk_laporan_produksi` (`IdProduksi`),
  ADD KEY `fk_laporan_karyawan` (`IdKaryawan`);

--
-- Indexes for table `ledger_processor`
--
ALTER TABLE `ledger_processor`
  ADD PRIMARY KEY (`IdBlock`),
  ADD UNIQUE KEY `KodeBlock` (`KodeBlock`),
  ADD KEY `fk_ledger_identity` (`IdIdentity`),
  ADD KEY `fk_ledger_order` (`IdOrder`),
  ADD KEY `fk_ledger_produksi` (`IdProduksi`),
  ADD KEY `fk_ledger_processor` (`IdProcessor`);

--
-- Indexes for table `nota_penerimaan`
--
ALTER TABLE `nota_penerimaan`
  ADD PRIMARY KEY (`IdNotaPenerimaan`),
  ADD UNIQUE KEY `KodeNotaPenerimaan` (`KodeNotaPenerimaan`),
  ADD KEY `fk_notapenerimaan_order` (`IdOrder`);

--
-- Indexes for table `nota_pengiriman`
--
ALTER TABLE `nota_pengiriman`
  ADD PRIMARY KEY (`IdNota`),
  ADD UNIQUE KEY `KodeNota` (`KodeNota`),
  ADD KEY `fk_nota_pengiriman` (`IdPengiriman`);

--
-- Indexes for table `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`IdOrder`),
  ADD UNIQUE KEY `KodeOrder` (`KodeOrder`),
  ADD KEY `fk_order_user` (`DibuatOleh`),
  ADD KEY `fk_order_processor` (`IdProcessor`);

--
-- Indexes for table `pengiriman`
--
ALTER TABLE `pengiriman`
  ADD PRIMARY KEY (`IdPengiriman`),
  ADD UNIQUE KEY `KodePengiriman` (`KodePengiriman`),
  ADD KEY `fk_pengiriman_produksi` (`IdProduksi`);

--
-- Indexes for table `processor`
--
ALTER TABLE `processor`
  ADD PRIMARY KEY (`IdProcessor`),
  ADD UNIQUE KEY `KodeProcessor` (`KodeProcessor`);

--
-- Indexes for table `produksi`
--
ALTER TABLE `produksi`
  ADD PRIMARY KEY (`IdProduksi`),
  ADD UNIQUE KEY `KodeProduksi` (`KodeProduksi`),
  ADD KEY `fk_produksi_order` (`IdOrder`),
  ADD KEY `fk_produksi_tugas` (`IdTugas`),
  ADD KEY `fk_produksi_karyawan` (`IdKaryawan`);

--
-- Indexes for table `quality_control`
--
ALTER TABLE `quality_control`
  ADD PRIMARY KEY (`IdQC`),
  ADD UNIQUE KEY `KodeQC` (`KodeQC`),
  ADD KEY `fk_qc_produksi` (`IdProduksi`),
  ADD KEY `fk_qc_karyawan` (`IdKaryawan`);

--
-- Indexes for table `sertifikat_halal`
--
ALTER TABLE `sertifikat_halal`
  ADD PRIMARY KEY (`IdSertifikat`),
  ADD UNIQUE KEY `KodeSertifikat` (`KodeSertifikat`),
  ADD KEY `fk_sertifikat_produksi` (`IdProduksi`),
  ADD KEY `fk_sertifikat_karyawan` (`IdKaryawan`);

--
-- Indexes for table `tugas_produksi`
--
ALTER TABLE `tugas_produksi`
  ADD PRIMARY KEY (`IdTugas`),
  ADD UNIQUE KEY `KodeTugas` (`KodeTugas`),
  ADD KEY `fk_tugas_order` (`IdOrder`),
  ADD KEY `fk_tugas_karyawan` (`IdKaryawan`),
  ADD KEY `fk_tugas_user` (`DitugaskanOleh`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`IdUser`),
  ADD UNIQUE KEY `KodeUser` (`KodeUser`),
  ADD UNIQUE KEY `Email` (`Email`),
  ADD KEY `fk_user_processor` (`IdProcessor`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  MODIFY `IdIdentity` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `karyawan`
--
ALTER TABLE `karyawan`
  MODIFY `IdKaryawan` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `laporan_masalah`
--
ALTER TABLE `laporan_masalah`
  MODIFY `IdLaporan` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `ledger_processor`
--
ALTER TABLE `ledger_processor`
  MODIFY `IdBlock` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nota_penerimaan`
--
ALTER TABLE `nota_penerimaan`
  MODIFY `IdNotaPenerimaan` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `nota_pengiriman`
--
ALTER TABLE `nota_pengiriman`
  MODIFY `IdNota` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `orders`
--
ALTER TABLE `orders`
  MODIFY `IdOrder` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pengiriman`
--
ALTER TABLE `pengiriman`
  MODIFY `IdPengiriman` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `processor`
--
ALTER TABLE `processor`
  MODIFY `IdProcessor` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `produksi`
--
ALTER TABLE `produksi`
  MODIFY `IdProduksi` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `quality_control`
--
ALTER TABLE `quality_control`
  MODIFY `IdQC` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sertifikat_halal`
--
ALTER TABLE `sertifikat_halal`
  MODIFY `IdSertifikat` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tugas_produksi`
--
ALTER TABLE `tugas_produksi`
  MODIFY `IdTugas` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `IdUser` int NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `blockchainidentity`
--
ALTER TABLE `blockchainidentity`
  ADD CONSTRAINT `fk_blockchain_order` FOREIGN KEY (`IdOrder`) REFERENCES `orders` (`IdOrder`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_blockchain_processor` FOREIGN KEY (`IdProcessor`) REFERENCES `processor` (`IdProcessor`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `karyawan`
--
ALTER TABLE `karyawan`
  ADD CONSTRAINT `fk_karyawan_processor` FOREIGN KEY (`IdProcessor`) REFERENCES `processor` (`IdProcessor`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_karyawan_user` FOREIGN KEY (`IdUser`) REFERENCES `users` (`IdUser`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `laporan_masalah`
--
ALTER TABLE `laporan_masalah`
  ADD CONSTRAINT `fk_laporan_karyawan` FOREIGN KEY (`IdKaryawan`) REFERENCES `karyawan` (`IdKaryawan`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_laporan_produksi` FOREIGN KEY (`IdProduksi`) REFERENCES `produksi` (`IdProduksi`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `ledger_processor`
--
ALTER TABLE `ledger_processor`
  ADD CONSTRAINT `fk_ledger_identity` FOREIGN KEY (`IdIdentity`) REFERENCES `blockchainidentity` (`IdIdentity`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ledger_order` FOREIGN KEY (`IdOrder`) REFERENCES `orders` (`IdOrder`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ledger_processor` FOREIGN KEY (`IdProcessor`) REFERENCES `processor` (`IdProcessor`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ledger_produksi` FOREIGN KEY (`IdProduksi`) REFERENCES `produksi` (`IdProduksi`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `nota_penerimaan`
--
ALTER TABLE `nota_penerimaan`
  ADD CONSTRAINT `fk_notapenerimaan_order` FOREIGN KEY (`IdOrder`) REFERENCES `orders` (`IdOrder`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `nota_pengiriman`
--
ALTER TABLE `nota_pengiriman`
  ADD CONSTRAINT `fk_nota_pengiriman` FOREIGN KEY (`IdPengiriman`) REFERENCES `pengiriman` (`IdPengiriman`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `fk_order_processor` FOREIGN KEY (`IdProcessor`) REFERENCES `processor` (`IdProcessor`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_order_user` FOREIGN KEY (`DibuatOleh`) REFERENCES `users` (`IdUser`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `pengiriman`
--
ALTER TABLE `pengiriman`
  ADD CONSTRAINT `fk_pengiriman_produksi` FOREIGN KEY (`IdProduksi`) REFERENCES `produksi` (`IdProduksi`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `produksi`
--
ALTER TABLE `produksi`
  ADD CONSTRAINT `fk_produksi_karyawan` FOREIGN KEY (`IdKaryawan`) REFERENCES `karyawan` (`IdKaryawan`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_produksi_order` FOREIGN KEY (`IdOrder`) REFERENCES `orders` (`IdOrder`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_produksi_tugas` FOREIGN KEY (`IdTugas`) REFERENCES `tugas_produksi` (`IdTugas`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `quality_control`
--
ALTER TABLE `quality_control`
  ADD CONSTRAINT `fk_qc_karyawan` FOREIGN KEY (`IdKaryawan`) REFERENCES `karyawan` (`IdKaryawan`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_qc_produksi` FOREIGN KEY (`IdProduksi`) REFERENCES `produksi` (`IdProduksi`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `sertifikat_halal`
--
ALTER TABLE `sertifikat_halal`
  ADD CONSTRAINT `fk_sertifikat_karyawan` FOREIGN KEY (`IdKaryawan`) REFERENCES `karyawan` (`IdKaryawan`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_sertifikat_produksi` FOREIGN KEY (`IdProduksi`) REFERENCES `produksi` (`IdProduksi`) ON DELETE RESTRICT ON UPDATE CASCADE;

--
-- Constraints for table `tugas_produksi`
--
ALTER TABLE `tugas_produksi`
  ADD CONSTRAINT `fk_tugas_karyawan` FOREIGN KEY (`IdKaryawan`) REFERENCES `karyawan` (`IdKaryawan`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tugas_order` FOREIGN KEY (`IdOrder`) REFERENCES `orders` (`IdOrder`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_tugas_user` FOREIGN KEY (`DitugaskanOleh`) REFERENCES `users` (`IdUser`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_user_processor` FOREIGN KEY (`IdProcessor`) REFERENCES `processor` (`IdProcessor`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
