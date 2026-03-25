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

--
-- Dumping data for table `ledger_kurir`
--

INSERT INTO `ledger_kurir` (`IdBlock`, `KodeBlock`, `KodePerusahaan`, `KodePengiriman`, `TipeBlock`, `BlockIndex`, `PreviousHash`, `CurrentHash`, `DataPayload`, `Nonce`, `StatusBlock`, `CreatedAt`, `ValidatedAt`) VALUES
(1, 'BLK-KUR-000000001-0000', 1, 'PKR-000000001', 'GENESIS', 0, 'f7962e22c825474bfe5a0b063dc5b05c3eb57bedaa79c0f49a7a5c92e6160d6e', '7fb3311fef21118de9b937cb70d789d2f8c88bdfd33220b1f713cb9731d08c22', '{\"event\":\"GENESIS\",\"node\":\"NODE_KURIR\",\"pengiriman_id\":\"PKR-000000001\",\"tipe_pengiriman\":\"FARM_TO_PROCESSOR\",\"asal_pengirim\":\"Peternakan Rudy\",\"tujuan_penerima\":\"PT Ayam Potong SmartPoultry\",\"tanggal_pickup\":\"2026-03-13\",\"kode_kurir\":\"KUR-000000001\",\"upstream_linked\":true,\"upstream_cycle_id\":1,\"upstream_chain_hash\":\"f7962e22c825474bfe5a0b063dc5b05c3eb57bedaa79c0f49a7a5c92e6160d6e\",\"chain_continuity\":\"LINKED\"}', 0, 'VALIDATED', '2026-03-12 02:29:47', '2026-03-12 02:29:47'),
(2, 'BLK-KUR-000000001-0001', 1, 'PKR-000000001', 'LINK_UPSTREAM', 1, '7fb3311fef21118de9b937cb70d789d2f8c88bdfd33220b1f713cb9731d08c22', '5a15ab36c780b33f2a24cd1e3331bc14f2714047536582e5b15cc9d5989a054c', '{\"event\":\"LINK_UPSTREAM\",\"node\":\"NODE_KURIR\",\"description\":\"Chain link anchor to upstream Peternakan blockchain\",\"upstream_node\":\"NODE_PETERNAKAN\",\"upstream_cycle_id\":1,\"upstream_chain_identity\":\"CHAIN-000001\",\"upstream_peternakan\":\"Peternakan Rudy\",\"upstream_lokasi\":\"Gading Serpong\",\"upstream_genesis_hash\":\"85955d640ba019096b87d2dc6041f5415909a65fe56fcc2a5ef55b245d1b80e2\",\"upstream_latest_hash\":\"f7962e22c825474bfe5a0b063dc5b05c3eb57bedaa79c0f49a7a5c92e6160d6e\",\"upstream_total_blocks\":7,\"upstream_status\":\"TRANSFERRED\",\"upstream_block_types\":[\"GENESIS\",\"KANDANG_AKTIF\",\"DOC_MASUK\",\"PEMAKAIAN_OBAT\",\"LAPORAN_MORTALITY\",\"PANEN_DINI\",\"TRANSFER_PROCESSOR\"],\"link_timestamp\":\"2026-03-11T19:29:47.328Z\",\"chain_continuity\":\"VERIFIED\"}', 0, 'VALIDATED', '2026-03-12 02:29:47', '2026-03-12 02:29:47'),
(3, 'BLK-KUR-000000001-0002', 1, 'PKR-000000001', 'PICKUP_FARM', 2, '5a15ab36c780b33f2a24cd1e3331bc14f2714047536582e5b15cc9d5989a054c', '051a253ea27bc621ac0372bbbabcde2b7b63330c0e9924ca043989b5450398f2', '{\"event\":\"PICKUP_FARM\",\"node\":\"NODE_KURIR\",\"kode_bukti\":\"BTT-000000001\",\"nama_pengirim\":\"Peternakan Rudy\",\"nama_penerima_kurir\":\"Brandon\",\"jumlah_barang\":\"1\",\"berat_total_kg\":\"100\",\"tanggal_terima\":\"2026-03-12\",\"keterangan\":\"\",\"source_node\":\"NODE_PETERNAKAN\",\"target_node\":\"NODE_PROCESSOR\"}', 0, 'VALIDATED', '2026-03-12 02:30:44', '2026-03-12 02:30:44'),
(4, 'BLK-KUR-000000001-0003', 1, 'PKR-000000001', 'DELIVERY_PROCESSOR', 3, '051a253ea27bc621ac0372bbbabcde2b7b63330c0e9924ca043989b5450398f2', '7f9c9fdef3693c14d239c737d176d76bf8346f83ad222a57b8bbe51a37bfea16', '{\"event\":\"DELIVERY_PROCESSOR\",\"node\":\"NODE_KURIR\",\"kode_nota\":\"NPK-000000001\",\"nama_penerima_processor\":\"Asep\",\"kondisi_barang\":\"BAIK\",\"tanggal_sampai\":\"2026-02-13\",\"keterangan\":\"\",\"chain_handoff\":\"FARM_CHAIN_COMPLETED\",\"next_chain\":\"PROCESSOR_CHAIN_START\",\"transfer_status\":\"HANDOFF_TO_PROCESSOR\"}', 0, 'VALIDATED', '2026-03-12 02:30:57', '2026-03-12 02:30:57'),
(5, 'BLK-KUR-000000002-0000', 1, 'PKR-000000002', 'GENESIS', 0, '13571c964b5c36b36a308621a01719395bacde9889132a6e888175598afa6c18', 'eb52dfdd00e8e6cd9dbe71ea602ceeee1a1d27e0d426d1773bbc4b1c4e7fd4fb', '{\"event\":\"GENESIS\",\"node\":\"NODE_KURIR\",\"pengiriman_id\":\"PKR-000000002\",\"tipe_pengiriman\":\"FARM_TO_PROCESSOR\",\"asal_pengirim\":\"Peternakan Rudy\",\"tujuan_penerima\":\"PT Ayam Potong SmartPoultry\",\"tanggal_pickup\":\"2026-03-15\",\"kode_kurir\":\"KUR-000000001\",\"upstream_linked\":true,\"upstream_cycle_id\":2,\"upstream_chain_hash\":\"13571c964b5c36b36a308621a01719395bacde9889132a6e888175598afa6c18\",\"upstream_node_type\":\"NODE_PETERNAKAN\",\"chain_continuity\":\"LINKED\"}', 0, 'VALIDATED', '2026-03-15 10:51:37', '2026-03-15 10:51:37'),
(6, 'BLK-KUR-000000002-0001', 1, 'PKR-000000002', 'LINK_UPSTREAM', 1, 'eb52dfdd00e8e6cd9dbe71ea602ceeee1a1d27e0d426d1773bbc4b1c4e7fd4fb', 'ed896a16c8d9cefb9e5e113fdf1302fbd781a305e0e9b6f14164619fcfb499df', '{\"event\":\"LINK_UPSTREAM\",\"node\":\"NODE_KURIR\",\"description\":\"Chain link anchor to upstream Peternakan blockchain\",\"upstream_node\":\"NODE_PETERNAKAN\",\"upstream_cycle_id\":2,\"upstream_chain_identity\":\"CHAIN-000002\",\"upstream_entity\":\"Peternakan Rudy\",\"upstream_genesis_hash\":\"ba346d485d292374f53fdf9698df3a27f1ce78ec4b7aa519d8b90e88f4c3ed58\",\"upstream_latest_hash\":\"13571c964b5c36b36a308621a01719395bacde9889132a6e888175598afa6c18\",\"upstream_total_blocks\":5,\"upstream_status\":\"TRANSFERRED\",\"link_timestamp\":\"2026-03-15T03:51:37.829Z\",\"chain_continuity\":\"VERIFIED\"}', 0, 'VALIDATED', '2026-03-15 10:51:37', '2026-03-15 10:51:37'),
(7, 'BLK-KUR-000000002-0002', 1, 'PKR-000000002', 'PICKUP_FARM', 2, 'ed896a16c8d9cefb9e5e113fdf1302fbd781a305e0e9b6f14164619fcfb499df', 'ffa2dd0f5621107ea5aeb825c8af063f1987f5762a1c626c337b0d3b2bafcb67', '{\"event\":\"PICKUP_FARM\",\"node\":\"NODE_KURIR\",\"kode_bukti\":\"BTT-000000002\",\"nama_pengirim\":\"Peternakan Rudy\",\"nama_penerima_kurir\":\"Brandon\",\"jumlah_barang\":\"100\",\"berat_total_kg\":\"99.6\",\"tanggal_terima\":\"2026-03-15\",\"keterangan\":\"\",\"source_node\":\"NODE_PETERNAKAN\",\"target_node\":\"NODE_PROCESSOR\"}', 0, 'VALIDATED', '2026-03-15 10:52:01', '2026-03-15 10:52:01'),
(8, 'BLK-KUR-000000002-0003', 1, 'PKR-000000002', 'DELIVERY_PROCESSOR', 3, 'ffa2dd0f5621107ea5aeb825c8af063f1987f5762a1c626c337b0d3b2bafcb67', '524934ae2c5c30962896553b9601a4180dd7563097a8de4659fe8a48ff3ff9f5', '{\"event\":\"DELIVERY_PROCESSOR\",\"node\":\"NODE_KURIR\",\"kode_nota\":\"NPK-000000002\",\"nama_penerima_processor\":\"Ivan\",\"kondisi_barang\":\"BAIK\",\"tanggal_sampai\":\"2026-03-15\",\"keterangan\":\"\",\"chain_handoff\":\"FARM_CHAIN_COMPLETED\",\"next_chain\":\"PROCESSOR_CHAIN_START\",\"transfer_status\":\"HANDOFF_TO_PROCESSOR\"}', 0, 'VALIDATED', '2026-03-15 10:52:12', '2026-03-15 10:52:12');

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
  MODIFY `UserID` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `perusahaankurir`
--
ALTER TABLE `perusahaankurir`
  MODIFY `KodePerusahaan` int NOT NULL AUTO_INCREMENT;

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
