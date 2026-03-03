const express = require('express');
const router = express.Router();
const { Produksi, Order, TugasProduksi, Karyawan, QualityControl, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeProduksi, generateKodeBlock } = require('../utils/codeGenerator');
const { createProcessingBlock } = require('../utils/blockchain');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// GET /api/produksi
router.get('/', authMiddleware, async (req, res) => {
    try {
        const produksiList = await Produksi.findAll({
            include: [
                { model: Order, as: 'order', attributes: ['KodeOrder', 'NamaPeternakan'] },
                { model: TugasProduksi, as: 'tugas', attributes: ['KodeTugas', 'NamaTugas'] },
                { model: Karyawan, as: 'karyawan', attributes: ['KodeKaryawan', 'NamaLengkap'] },
            ],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: produksiList });
    } catch (error) {
        console.error('Get produksi error:', error);
        res.status(500).json({ message: 'Gagal mengambil data produksi.' });
    }
});

// POST /api/produksi — create production record (creates PROCESSING block)
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idOrder, idTugas, idKaryawan,
            tanggalProduksi, jenisAyam, jumlahInput, jumlahOutput,
            beratTotal, varian, sertifikatHalal, catatan,
        } = req.body;

        if (!idOrder || !tanggalProduksi || !jenisAyam || !jumlahInput || !jumlahOutput) {
            await t.rollback();
            return res.status(400).json({ message: 'Data produksi tidak lengkap.' });
        }

        const kodeProduksi = await generateKodeProduksi(sequelize, t);
        const produksi = await Produksi.create({
            KodeProduksi: kodeProduksi,
            IdOrder: idOrder,
            IdTugas: idTugas || null,
            IdKaryawan: idKaryawan || null,
            TanggalProduksi: tanggalProduksi,
            JenisAyam: jenisAyam,
            JumlahInput: jumlahInput,
            JumlahOutput: jumlahOutput,
            BeratTotal: beratTotal || 0,
            Varian: varian || null,
            SertifikatHalal: sertifikatHalal || 'TIDAK_ADA',
            Catatan: catatan || null,
        }, { transaction: t });

        // Create PROCESSING blockchain block
        const identity = await BlockchainIdentity.findOne({
            where: { IdOrder: idOrder, StatusChain: 'ACTIVE' },
            transaction: t,
        });

        if (identity) {
            const kodeBlock = await generateKodeBlock(sequelize, t);
            await createProcessingBlock(sequelize, {
                idIdentity: identity.IdIdentity,
                idOrder: idOrder,
                idProduksi: produksi.IdProduksi,
                kodeBlock,
                kodeProduksi,
                jenisAyam,
                jumlahInput,
                jumlahOutput,
                beratTotal: beratTotal || 0,
                varian: varian || '',
                tanggalProduksi,
                sertifikatHalal: sertifikatHalal || 'TIDAK_ADA',
                transaction: t,
            });
        }

        // Update tugas status if linked
        if (idTugas) {
            await TugasProduksi.update(
                { StatusTugas: 'SEDANG_DIKERJAKAN' },
                { where: { IdTugas: idTugas }, transaction: t }
            );
        }

        await t.commit();
        res.status(201).json({ message: 'Produksi berhasil dicatat.', data: produksi });
    } catch (error) {
        await t.rollback();
        console.error('Create produksi error:', error);
        res.status(500).json({ message: 'Gagal mencatat produksi.' });
    }
});

// PUT /api/produksi/:id
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const produksi = await Produksi.findByPk(req.params.id);
        if (!produksi) return res.status(404).json({ message: 'Produksi tidak ditemukan.' });

        const { jumlahOutput, beratTotal, varian, sertifikatHalal, statusProduksi, catatan } = req.body;
        await produksi.update({
            JumlahOutput: jumlahOutput !== undefined ? jumlahOutput : produksi.JumlahOutput,
            BeratTotal: beratTotal !== undefined ? beratTotal : produksi.BeratTotal,
            Varian: varian !== undefined ? varian : produksi.Varian,
            SertifikatHalal: sertifikatHalal || produksi.SertifikatHalal,
            StatusProduksi: statusProduksi || produksi.StatusProduksi,
            Catatan: catatan !== undefined ? catatan : produksi.Catatan,
        });

        res.json({ message: 'Produksi berhasil diperbarui.', data: produksi });
    } catch (error) {
        console.error('Update produksi error:', error);
        res.status(500).json({ message: 'Gagal memperbarui produksi.' });
    }
});

// DELETE /api/produksi/:id
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
    try {
        const produksi = await Produksi.findByPk(req.params.id);
        if (!produksi) return res.status(404).json({ message: 'Produksi tidak ditemukan.' });
        await produksi.destroy();
        res.json({ message: 'Data produksi berhasil dihapus.' });
    } catch (error) {
        console.error('Delete produksi error:', error);
        res.status(500).json({ message: 'Gagal menghapus data produksi.' });
    }
});

module.exports = router;
