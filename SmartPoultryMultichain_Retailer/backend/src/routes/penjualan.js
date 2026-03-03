const express = require('express');
const router = express.Router();
const { Penjualan, DetailPenjualan, Gudang, BlockchainIdentity, sequelize } = require('../models');
const { generateKodePenjualan, generateKodeBlock } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchain');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/penjualan — list all sales
router.get('/', authMiddleware, async (req, res) => {
    try {
        const where = req.user.idRetailer ? { IdRetailer: req.user.idRetailer } : {};
        const sales = await Penjualan.findAll({
            where,
            include: [{
                model: DetailPenjualan, as: 'details',
                include: [{ model: Gudang, as: 'gudang', attributes: ['KodeGudang', 'NamaProduk'] }]
            }],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: sales });
    } catch (error) {
        console.error('Get penjualan error:', error);
        res.status(500).json({ message: 'Gagal mengambil data penjualan.' });
    }
});

// GET /api/penjualan/:id
router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const sale = await Penjualan.findByPk(req.params.id, {
            include: [{
                model: DetailPenjualan, as: 'details',
                include: [{ model: Gudang, as: 'gudang', attributes: ['KodeGudang', 'NamaProduk', 'JenisProduk'] }]
            }],
        });
        if (!sale) return res.status(404).json({ message: 'Penjualan tidak ditemukan.' });
        res.json({ data: sale });
    } catch (error) {
        console.error('Get penjualan detail error:', error);
        res.status(500).json({ message: 'Gagal mengambil detail penjualan.' });
    }
});

// POST /api/penjualan — create new sale
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { namaPembeli, metodePembayaran, catatan, items } = req.body;

        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'Minimal 1 item penjualan.' });
        }

        const kodePenjualan = await generateKodePenjualan(sequelize, t);

        let totalItem = 0;
        let totalHarga = 0;
        const detailItems = [];

        // Validate and calculate
        for (const item of items) {
            const gudang = await Gudang.findByPk(item.idGudang);
            if (!gudang) {
                await t.rollback();
                return res.status(404).json({ message: `Stok ${item.idGudang} tidak ditemukan.` });
            }
            if (gudang.StokSaatIni < item.jumlahJual) {
                await t.rollback();
                return res.status(400).json({ message: `Stok ${gudang.NamaProduk} tidak mencukupi (tersedia: ${gudang.StokSaatIni}).` });
            }

            const subtotal = item.jumlahJual * (item.hargaSatuan || gudang.HargaJual);
            totalItem += item.jumlahJual;
            totalHarga += subtotal;

            detailItems.push({
                idGudang: gudang.IdGudang,
                namaProduk: gudang.NamaProduk,
                jumlahJual: item.jumlahJual,
                hargaSatuan: item.hargaSatuan || gudang.HargaJual,
                subtotal,
            });
        }

        const penjualan = await Penjualan.create({
            KodePenjualan: kodePenjualan,
            IdRetailer: req.user.idRetailer,
            TanggalPenjualan: new Date().toISOString().split('T')[0],
            NamaPembeli: namaPembeli || 'Umum',
            TotalItem: totalItem,
            TotalHarga: totalHarga,
            MetodePembayaran: metodePembayaran || 'TUNAI',
            StatusPenjualan: 'SELESAI',
            Catatan: catatan || null,
            DibuatOleh: req.user.id,
        }, { transaction: t });

        // Create detail items and update stock
        for (const detail of detailItems) {
            await DetailPenjualan.create({
                IdPenjualan: penjualan.IdPenjualan,
                IdGudang: detail.idGudang,
                NamaProduk: detail.namaProduk,
                JumlahJual: detail.jumlahJual,
                HargaSatuan: detail.hargaSatuan,
                Subtotal: detail.subtotal,
            }, { transaction: t });

            // Update stock
            const gudang = await Gudang.findByPk(detail.idGudang);
            const newStok = gudang.StokSaatIni - detail.jumlahJual;
            const newStokKeluar = gudang.StokKeluar + detail.jumlahJual;
            await gudang.update({
                StokSaatIni: newStok,
                StokKeluar: newStokKeluar,
                StatusStok: newStok <= 0 ? 'HABIS' : newStok <= 10 ? 'HAMPIR_HABIS' : 'TERSEDIA',
            }, { transaction: t });
        }

        // Create blockchain block (pick first order-related identity)
        const firstGudang = await Gudang.findByPk(detailItems[0].idGudang);
        const identities = await BlockchainIdentity.findAll({
            where: { IdRetailer: req.user.idRetailer, StatusChain: 'ACTIVE' },
            order: [['CreatedAt', 'DESC']],
            limit: 1,
        });

        if (identities.length > 0) {
            const kodeBlock = await generateKodeBlock(sequelize, t);
            await blockchain.createSaleRecordedBlock(sequelize, {
                idIdentity: identities[0].IdIdentity,
                idPenjualan: penjualan.IdPenjualan,
                kodeBlock,
                kodePenjualan: kodePenjualan,
                tanggalPenjualan: new Date().toISOString().split('T')[0],
                namaPembeli: namaPembeli || 'Umum',
                totalItem: totalItem,
                totalHarga: totalHarga,
                metodePembayaran: metodePembayaran || 'TUNAI',
                items: detailItems.map(d => ({
                    nama_produk: d.namaProduk,
                    jumlah: d.jumlahJual,
                    harga_satuan: d.hargaSatuan,
                    subtotal: d.subtotal
                })),
                transaction: t
            });
        }

        await t.commit();
        res.status(201).json({ message: 'Penjualan berhasil dicatat.', data: penjualan });
    } catch (error) {
        await t.rollback();
        console.error('Create penjualan error:', error);
        res.status(500).json({ message: 'Gagal mencatat penjualan.' });
    }
});

module.exports = router;
