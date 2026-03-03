const express = require('express');
const router = express.Router();
const { QualityControl, Produksi, Karyawan, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeQC, generateKodeBlock } = require('../utils/codeGenerator');
const { createQualityCheckBlock } = require('../utils/blockchain');
const { authMiddleware } = require('../middlewares/auth');

// GET /api/qc
router.get('/', authMiddleware, async (req, res) => {
    try {
        const qcList = await QualityControl.findAll({
            include: [
                { model: Produksi, as: 'produksi', attributes: ['KodeProduksi', 'JenisAyam', 'IdOrder'] },
                { model: Karyawan, as: 'karyawan', attributes: ['KodeKaryawan', 'NamaLengkap'] },
            ],
            order: [['CreatedAt', 'DESC']],
        });
        res.json({ data: qcList });
    } catch (error) {
        console.error('Get QC error:', error);
        res.status(500).json({ message: 'Gagal mengambil data QC.' });
    }
});

// POST /api/qc — create QC (creates QUALITY_CHECK block)
router.post('/', authMiddleware, async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const {
            idProduksi, idKaryawan, tanggalQC,
            suhu, kelembaban, warnaAyam, bauAyam, teksturAyam,
            hasilQC, catatan,
        } = req.body;

        if (!idProduksi || !tanggalQC || !hasilQC) {
            await t.rollback();
            return res.status(400).json({ message: 'Data QC tidak lengkap.' });
        }

        const kodeQC = await generateKodeQC(sequelize, t);
        const qc = await QualityControl.create({
            KodeQC: kodeQC,
            IdProduksi: idProduksi,
            IdKaryawan: idKaryawan || null,
            TanggalQC: tanggalQC,
            Suhu: suhu || null,
            Kelembaban: kelembaban || null,
            WarnaAyam: warnaAyam || null,
            BauAyam: bauAyam || 'NORMAL',
            TeksturAyam: teksturAyam || 'NORMAL',
            HasilQC: hasilQC,
            Catatan: catatan || null,
        }, { transaction: t });

        // Update produksi status
        const produksi = await Produksi.findByPk(idProduksi, { transaction: t });
        if (produksi) {
            const newStatus = hasilQC === 'LULUS' ? 'LULUS_QC' : 'GAGAL_QC';
            await produksi.update({ StatusProduksi: newStatus }, { transaction: t });

            // Create QUALITY_CHECK blockchain block
            const identity = await BlockchainIdentity.findOne({
                where: { IdOrder: produksi.IdOrder, StatusChain: 'ACTIVE' },
                transaction: t,
            });

            if (identity) {
                const kodeBlock = await generateKodeBlock(sequelize, t);
                await createQualityCheckBlock(sequelize, {
                    idIdentity: identity.IdIdentity,
                    idOrder: produksi.IdOrder,
                    idProduksi: idProduksi,
                    kodeBlock,
                    kodeQC,
                    kodeProduksi: produksi.KodeProduksi,
                    hasilQC,
                    suhu: suhu || null,
                    kelembaban: kelembaban || null,
                    warnaAyam: warnaAyam || '',
                    bauAyam: bauAyam || 'NORMAL',
                    teksturAyam: teksturAyam || 'NORMAL',
                    tanggalQC,
                    transaction: t,
                });
            }
        }

        await t.commit();
        res.status(201).json({ message: 'QC berhasil dicatat.', data: qc });
    } catch (error) {
        await t.rollback();
        console.error('Create QC error:', error);
        res.status(500).json({ message: 'Gagal mencatat QC.' });
    }
});

module.exports = router;
