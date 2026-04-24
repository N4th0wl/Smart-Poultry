-- Migration for Processor Database (smartpoultry_processor)
-- Run this query to update the StatusPengiriman enum, adding 'DIKIRIM_KURIR'

ALTER TABLE pengiriman 
MODIFY COLUMN StatusPengiriman ENUM('DISIAPKAN', 'DIKIRIM', 'DIKIRIM_KURIR', 'TERKIRIM', 'GAGAL') NOT NULL DEFAULT 'DISIAPKAN';
