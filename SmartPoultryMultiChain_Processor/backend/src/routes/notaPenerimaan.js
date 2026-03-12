const express = require('express');
const router = express.Router();
const { NotaPenerimaan, Order, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeNotaPenerimaan, generateKodeBlock, generateKodeOrder, generateKodeIdentity } = require('../utils/codeGenerator');
const { createNotaPenerimaanBlock, createReceiveFromFarmBlock, generateHash } = require('../utils/blockchain');
const { authMiddleware, adminOnly } = require('../middlewares/auth');
const { getKurirConnection } = require('../config/crossChainDatabase');
const { Sequelize } = require('sequelize');

// GET /api/nota-penerimaan
router.get('/', authMiddleware, async (req, res) => {
    try {
        // --- AUTO SYNC LOGIC FROM KURIR ---
        try {
            const kurirConn = getKurirConnection();
            if (kurirConn) {
                // Fetch TERKIRIM or SELESAI shipments from Kurir
                const deliveredShipments = await kurirConn.query(
                    `SELECT p.KodePengiriman, p.UpstreamCycleId, n.TanggalSampai, p.AsalPengirim, n.NamaPenerima, b.JumlahBarang, n.KondisiBarang, n.Keterangan, bi.UpstreamChainHash, bi.LatestBlockHash AS KurirLatestBlockHash
                     FROM Pengiriman p
                     JOIN NotaPengirimanKurir n ON p.KodePengiriman = n.KodePengiriman
                     LEFT JOIN BuktiTandaTerima b ON p.KodePengiriman = b.KodePengiriman
                     LEFT JOIN BlockchainIdentity bi ON p.KodePengiriman = bi.KodePengiriman
                     WHERE p.TipePengiriman = 'FARM_TO_PROCESSOR' AND (p.StatusPengiriman = 'TERKIRIM' OR p.StatusPengiriman = 'SELESAI')`,
                     { type: Sequelize.QueryTypes.SELECT }
                );

                for (const ship of deliveredShipments) {
                    if (!ship.UpstreamCycleId) continue;
                    
                    let identity = await BlockchainIdentity.findOne({
                        where: { KodeCycleFarm: ship.UpstreamCycleId } // Don't filter by StatusChain to catch already TRANSFERRED/COMPLETED chains if need be, but active is safer. We'll just check KodeCycleFarm.
                    });

                    let orderId = identity ? identity.IdOrder : null;
                    let currIdentityId = identity ? identity.IdIdentity : null;

                    if (!identity) {
                        // AUTO CREATE ORDER & IDENTITY
                        const t = await sequelize.transaction();
                        try {
                            const kodeOrder = await generateKodeOrder(sequelize, t);
                            const tglSampai = ship.TanggalSampai || new Date().toISOString().split('T')[0];
                            const namaPeternakan = ship.AsalPengirim || 'Peternakan';
                            const jlh = ship.JumlahBarang || 0;
                            const mapKondisi = ship.KondisiBarang === 'RUSAK_TOTAL' ? 'Buruk' : (ship.KondisiBarang === 'RUSAK_SEBAGIAN' ? 'Cukup' : 'Baik');

                            const order = await Order.create({
                                KodeOrder: kodeOrder,
                                IdProcessor: null, // Default fallback
                                NamaPeternakan: namaPeternakan,
                                JenisAyam: 'Ayam Broiler', // generic default
                                JumlahPesanan: jlh,
                                TotalHarga: 0,
                                TanggalOrder: tglSampai,
                                TanggalDibutuhkan: tglSampai,
                                StatusOrder: 'DITERIMA',
                                PenerimaOrder: 'Sistem Penerimaan Otomatis',
                                TanggalDiterima: tglSampai,
                                JumlahDiterima: jlh,
                                KondisiTerima: mapKondisi,
                                DibuatOleh: null
                            }, { transaction: t });

                            const kodeIdentity = await generateKodeIdentity(sequelize, t);
                            // Use Kurir Leg 1's last block hash for cross-chain continuity (Farm → Kurir → Processor)
                            const kurirLastHash = ship.KurirLatestBlockHash || ship.UpstreamChainHash || '0000000000000000000000000000000000000000000000000000000000000000';
                            
                            const newGenesis = generateHash(0, kurirLastHash, 'RECEIVE_FROM_FARM', JSON.stringify({ kode_order: kodeOrder, nama_peternakan: namaPeternakan, tanggal_diterima: tglSampai }), new Date().toISOString().replace('T', ' ').substring(0, 19), 0);

                            identity = await BlockchainIdentity.create({
                                KodeIdentity: kodeIdentity,
                                IdOrder: order.IdOrder,
                                IdProcessor: null,
                                KodePeternakan: null,
                                KodeCycleFarm: ship.UpstreamCycleId,
                                FarmLastBlockHash: kurirLastHash,
                                GenesisHash: newGenesis,
                                LatestBlockHash: newGenesis,
                                TotalBlocks: 0,
                                StatusChain: 'ACTIVE'
                            }, { transaction: t });

                            const rxBlock = await generateKodeBlock(sequelize, t);
                            await createReceiveFromFarmBlock(sequelize, {
                                idIdentity: identity.IdIdentity,
                                idOrder: order.IdOrder,
                                kodeBlock: rxBlock,
                                kodeOrder: kodeOrder,
                                namaPeternakan: namaPeternakan,
                                jenisAyam: 'Ayam Broiler',
                                jumlahDiterima: jlh,
                                penerimaOrder: 'Sistem Penerimaan Otomatis',
                                tanggalDiterima: tglSampai,
                                kondisiTerima: mapKondisi,
                                kodeCycleFarm: ship.UpstreamCycleId,
                                farmLastBlockHash: kurirLastHash,
                                transaction: t
                            });

                            await t.commit();
                            orderId = order.IdOrder;
                            currIdentityId = identity.IdIdentity;
                        } catch (e) {
                            await t.rollback();
                            console.error('Auto create order error:', e);
                            continue;
                        }
                    }

                    if (orderId && currIdentityId) {
                        const existingNota = await NotaPenerimaan.findOne({
                            where: { IdOrder: orderId, KodeNotaPengirimanFarm: ship.KodePengiriman }
                        });
                        
                        if (!existingNota) {
                            const t = await sequelize.transaction();
                            try {
                                const kodeNotaPenerimaan = await generateKodeNotaPenerimaan(sequelize, t);
                                
                                let mappedKondisi = 'BAIK';
                                if (ship.KondisiBarang === 'RUSAK_SEBAGIAN') mappedKondisi = 'CUKUP';
                                if (ship.KondisiBarang === 'RUSAK_TOTAL') mappedKondisi = 'BURUK';

                                await NotaPenerimaan.create({
                                    KodeNotaPenerimaan: kodeNotaPenerimaan,
                                    IdOrder: orderId,
                                    KodeNotaPengirimanFarm: ship.KodePengiriman,
                                    KodeCycleFarm: ship.UpstreamCycleId,
                                    TanggalPenerimaan: ship.TanggalSampai || new Date().toISOString().split('T')[0],
                                    NamaPengirim: ship.AsalPengirim || 'Kurir',
                                    NamaPenerima: ship.NamaPenerima || 'Processor',
                                    JumlahDikirim: ship.JumlahBarang || 0,
                                    JumlahDiterima: ship.JumlahBarang || 0,
                                    JumlahRusak: mappedKondisi !== 'BAIK' ? 1 : 0,
                                    KondisiAyam: mappedKondisi,
                                    SuhuSaatTerima: null,
                                    CatatanPenerimaan: ship.Keterangan || 'Diterima otomatis dari Courier System',
                                }, { transaction: t });

                                const kodeBlock = await generateKodeBlock(sequelize, t);
                                await createNotaPenerimaanBlock(sequelize, {
                                    idIdentity: currIdentityId,
                                    idOrder: orderId,
                                    kodeBlock,
                                    kodeNotaPenerimaan,
                                    kodeNotaPengirimanFarm: ship.KodePengiriman,
                                    namaPengirim: ship.AsalPengirim || 'Kurir',
                                    namaPenerima: ship.NamaPenerima || 'Processor',
                                    jumlahDikirim: ship.JumlahBarang || 0,
                                    jumlahDiterima: ship.JumlahBarang || 0,
                                    jumlahRusak: mappedKondisi !== 'BAIK' ? 1 : 0,
                                    kondisiAyam: mappedKondisi,
                                    suhuSaatTerima: null,
                                    tanggalPenerimaan: ship.TanggalSampai || new Date().toISOString().split('T')[0],
                                    transaction: t,
                                });

                                await Order.update(
                                    { StatusOrder: 'DITERIMA' },
                                    { where: { IdOrder: orderId }, transaction: t }
                                );

                                await t.commit();
                            } catch (err) {
                                await t.rollback();
                                console.error('Auto sync error:', err);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Silently ignore cross-chain error in auto sync:', e.message);
        }
        // --- END AUTO SYNC LOGIC ---

        const list = await NotaPenerimaan.findAll({
            include: [{ model: Order, as: 'order', attributes: ['KodeOrder', 'NamaPeternakan', 'JenisAyam'] }],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: list });
    } catch (error) {
        console.error('Get nota penerimaan error:', error);
        res.status(500).json({ message: 'Gagal mengambil data nota penerimaan.' });
    }
});

// POST /api/nota-penerimaan — create reception note (creates NOTA_PENERIMAAN block)
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idOrder, kodeNotaPengirimanFarm, kodeCycleFarm,
            tanggalPenerimaan, namaPengirim, namaPenerima,
            jumlahDikirim, jumlahDiterima, jumlahRusak,
            kondisiAyam, suhuSaatTerima, catatanPenerimaan,
        } = req.body;

        if (!idOrder || !tanggalPenerimaan || !namaPenerima || !jumlahDiterima) {
            await t.rollback();
            return res.status(400).json({ message: 'Data nota penerimaan tidak lengkap.' });
        }

        const kodeNotaPenerimaan = await generateKodeNotaPenerimaan(sequelize, t);

        const nota = await NotaPenerimaan.create({
            KodeNotaPenerimaan: kodeNotaPenerimaan,
            IdOrder: idOrder,
            KodeNotaPengirimanFarm: kodeNotaPengirimanFarm || null,
            KodeCycleFarm: kodeCycleFarm || null,
            TanggalPenerimaan: tanggalPenerimaan,
            NamaPengirim: namaPengirim || null,
            NamaPenerima: namaPenerima,
            JumlahDikirim: jumlahDikirim || null,
            JumlahDiterima: jumlahDiterima,
            JumlahRusak: jumlahRusak || 0,
            KondisiAyam: kondisiAyam || 'BAIK',
            SuhuSaatTerima: suhuSaatTerima || null,
            CatatanPenerimaan: catatanPenerimaan || null,
        }, { transaction: t });

        // Create NOTA_PENERIMAAN blockchain block
        const identity = await BlockchainIdentity.findOne({
            where: { IdOrder: idOrder, StatusChain: 'ACTIVE' },
            transaction: t,
        });

        if (identity) {
            const kodeBlock = await generateKodeBlock(sequelize, t);
            await createNotaPenerimaanBlock(sequelize, {
                idIdentity: identity.IdIdentity,
                idOrder: idOrder,
                kodeBlock,
                kodeNotaPenerimaan,
                kodeNotaPengirimanFarm: kodeNotaPengirimanFarm || null,
                namaPengirim: namaPengirim || null,
                namaPenerima,
                jumlahDikirim: jumlahDikirim || null,
                jumlahDiterima,
                jumlahRusak: jumlahRusak || 0,
                kondisiAyam: kondisiAyam || 'BAIK',
                suhuSaatTerima: suhuSaatTerima || null,
                tanggalPenerimaan,
                transaction: t,
            });
        }

        await t.commit();
        res.status(201).json({ message: 'Nota penerimaan berhasil dibuat dan block tercatat.', data: nota });
    } catch (error) {
        await t.rollback();
        console.error('Create nota penerimaan error:', error);
        res.status(500).json({ message: 'Gagal membuat nota penerimaan.' });
    }
});

// PUT /api/nota-penerimaan/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const nota = await NotaPenerimaan.findByPk(req.params.id);
        if (!nota) return res.status(404).json({ message: 'Nota penerimaan tidak ditemukan.' });

        const { kondisiAyam, jumlahRusak, catatanPenerimaan } = req.body;
        await nota.update({
            KondisiAyam: kondisiAyam || nota.KondisiAyam,
            JumlahRusak: jumlahRusak !== undefined ? jumlahRusak : nota.JumlahRusak,
            CatatanPenerimaan: catatanPenerimaan !== undefined ? catatanPenerimaan : nota.CatatanPenerimaan,
        });

        res.json({ message: 'Nota penerimaan berhasil diperbarui.', data: nota });
    } catch (error) {
        console.error('Update nota penerimaan error:', error);
        res.status(500).json({ message: 'Gagal memperbarui nota penerimaan.' });
    }
});

// DELETE /api/nota-penerimaan/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const nota = await NotaPenerimaan.findByPk(req.params.id);
        if (!nota) return res.status(404).json({ message: 'Nota penerimaan tidak ditemukan.' });
        await nota.destroy();
        res.json({ message: 'Nota penerimaan berhasil dihapus.' });
    } catch (error) {
        console.error('Delete nota penerimaan error:', error);
        res.status(500).json({ message: 'Gagal menghapus nota penerimaan.' });
    }
});

module.exports = router;
