const express = require('express');
const router = express.Router();
const { NotaPenerimaan, Order, BlockchainIdentity, sequelize } = require('../models');
const { generateKodeNotaPenerimaan, generateKodeBlock } = require('../utils/codeGenerator');
const { createNotaPenerimaanBlock } = require('../utils/blockchain');
const { authMiddleware, adminOnly } = require('../middlewares/auth');

// GET /api/nota-penerimaan
router.get('/', authMiddleware, async (req, res) => {
    try {
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
