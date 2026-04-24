-- ============================================
-- MIGRATION: Cross-Chain Linking Support
-- ============================================
-- Adds fields to BlockchainIdentity and ledger_kurir to support
-- cross-chain linking with Peternakan blockchain.
-- Run this on smartpoultry_kurir database.
-- ============================================

USE `smartpoultry_kurir`;

-- 1. Add upstream chain reference to BlockchainIdentity
ALTER TABLE `BlockchainIdentity`
  ADD COLUMN `UpstreamChainHash` varchar(64) DEFAULT NULL COMMENT 'Latest hash from peternakan chain at linking time',
  ADD COLUMN `UpstreamNodeType` varchar(30) DEFAULT NULL COMMENT 'Source node type (NODE_PETERNAKAN)',
  ADD COLUMN `UpstreamCycleId` int(11) DEFAULT NULL COMMENT 'KodeCycle from peternakan blockchain';

-- 2. Add LINK_UPSTREAM to ledger_kurir TipeBlock enum
ALTER TABLE `ledger_kurir` 
  MODIFY COLUMN `TipeBlock` enum('GENESIS','PICKUP_FARM','DELIVERY_PROCESSOR','PICKUP_PROCESSOR','DELIVERY_RETAILER','LINK_UPSTREAM') NOT NULL;

-- 3. Add upstream reference to Pengiriman for easier cross-lookup  
-- (ReferensiEksternal already exists, but add specific cycle reference)
ALTER TABLE `Pengiriman`
  ADD COLUMN `UpstreamCycleId` int(11) DEFAULT NULL COMMENT 'KodeCycle from peternakan system';

COMMIT;
