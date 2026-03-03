const express = require('express');
const router = express.Router();
const { Kandang, Cycle, TimKerja, DOC, StatusKandang, PemakaianPerlengkapan, PemakaianObat, StatusKematian, Warehouse, StokWarehouse, MasterObat, Performance, Perlengkapan, sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');
const { generateKodeKandang, generateKodeStatus, generateKodePemakaian, generateKodePemakaianObat, generateKodeStatusKematian, generateKodePerformance, generateKodePemakaianFeed } = require('../utils/codeGenerator');
const blockchain = require('../utils/blockchainHelper');

router.use(authMiddleware);

// GET /api/kandang - Get all kandang with summary info
router.get('/', async (req, res) => {
    try {
        const kandangs = await sequelize.query(`
            SELECT k.KodeKandang, k.KodeCycle, k.KodePeternakan, k.KodeTim,
                   k.PanjangKandang, k.LebarKandang, k.LantaiKandang, k.Kepadatan, k.SuhuKandang,
                   c.TanggalMulai, c.DurasiCycle, c.SisaHariPanen,
                   t.NamaTim,
                   d.KodeDOC, d.BrandDOC, d.TipeAyam, d.JumlahDiterima, d.TanggalMasukKandang,
                   d.JumlahMatiPraKandang, d.KondisiAwal,
                   (SELECT sk.Populasi FROM StatusKandang sk WHERE sk.KodeKandang = k.KodeKandang ORDER BY sk.TanggalPemeriksaan DESC LIMIT 1) AS PopulasiTerkini,
                   (SELECT sk.BeratRataRata FROM StatusKandang sk WHERE sk.KodeKandang = k.KodeKandang ORDER BY sk.TanggalPemeriksaan DESC LIMIT 1) AS BeratTerkini,
                   (SELECT sk.UmurAyam FROM StatusKandang sk WHERE sk.KodeKandang = k.KodeKandang ORDER BY sk.TanggalPemeriksaan DESC LIMIT 1) AS UmurTerkini,
                   (SELECT COALESCE(SUM(sm.JumlahMati), 0) FROM StatusKematian sm WHERE sm.KodeKandang = k.KodeKandang) AS TotalKematian
            FROM Kandang k
            LEFT JOIN Cycle c ON k.KodeCycle = c.KodeCycle
            LEFT JOIN TimKerja t ON k.KodeTim = t.KodeTim
            LEFT JOIN DOC d ON d.KodeKandang = k.KodeKandang
            WHERE k.KodePeternakan = :kodePeternakan
            ORDER BY k.KodeKandang DESC
        `, {
            replacements: { kodePeternakan: req.user.kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(kandangs);
    } catch (error) {
        console.error('Get kandang error:', error);
        res.status(500).json({ error: 'Failed to get kandang' });
    }
});

// GET /api/kandang/available-doc - Get DOCs ready for placement
router.get('/available-doc', async (req, res) => {
    try {
        // Get DOCs that have available quantity (not yet fully placed in a kandang)
        const docs = await sequelize.query(`
            SELECT d.KodeDOC, d.KodePenerimaan, d.KodeKandang, d.BrandDOC, d.TipeAyam,
                   d.JumlahDipesan, d.JumlahDiterima, d.JumlahMatiPraKandang, d.KondisiAwal,
                   (d.JumlahDiterima - COALESCE(d.JumlahMatiPraKandang, 0)) AS JumlahTersedia
            FROM DOC d
            JOIN NotaPenerimaan np ON d.KodePenerimaan = np.KodePenerimaan
            JOIN Orders o ON np.KodeOrder = o.KodeOrder
            WHERE o.KodePeternakan = :kodePeternakan
              AND d.KodeKandang IS NULL
              AND (d.JumlahDiterima - COALESCE(d.JumlahMatiPraKandang, 0)) > 0
            ORDER BY d.KodeDOC DESC
        `, {
            replacements: { kodePeternakan: req.user.kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        res.json(docs);
    } catch (error) {
        console.error('Get available doc error:', error);
        res.status(500).json({ error: 'Failed to get available DOCs' });
    }
});

// GET /api/kandang/perlengkapan-by-kategori/:kategori - Get perlengkapan by kategori with stock info
router.get('/perlengkapan-by-kategori/:kategori', async (req, res) => {
    try {
        const { kategori } = req.params;
        const kodePeternakan = req.user.kodePeternakan;

        const perlengkapan = await sequelize.query(`
            SELECT p.KodePerlengkapan, p.NamaPerlengkapan, p.KategoriPerlengkapan, p.Satuan,
                   COALESCE(SUM(sw.Jumlah), 0) AS totalStok
            FROM Perlengkapan p
            LEFT JOIN StokWarehouse sw ON p.KodePerlengkapan = sw.KodePerlengkapan
            WHERE p.KodePeternakan = :kodePeternakan AND p.KategoriPerlengkapan = :kategori
            GROUP BY p.KodePerlengkapan, p.NamaPerlengkapan, p.KategoriPerlengkapan, p.Satuan
            HAVING totalStok > 0
            ORDER BY p.NamaPerlengkapan ASC
        `, {
            replacements: { kodePeternakan, kategori },
            type: sequelize.QueryTypes.SELECT
        });

        res.json({ success: true, data: perlengkapan });
    } catch (error) {
        console.error('Get perlengkapan by kategori error:', error);
        res.status(500).json({ success: false, error: 'Failed to get perlengkapan' });
    }
});

// GET /api/kandang/:id - Get single kandang with full monitoring data
router.get('/:id', async (req, res) => {
    try {
        const [kandang] = await sequelize.query(`
            SELECT k.KodeKandang, k.KodeCycle, k.KodePeternakan, k.KodeTim,
                   k.PanjangKandang, k.LebarKandang, k.LantaiKandang, k.Kepadatan, k.SuhuKandang,
                   c.TanggalMulai, c.DurasiCycle, c.SisaHariPanen,
                   t.NamaTim,
                   d.KodeDOC, d.BrandDOC, d.TipeAyam, d.JumlahDiterima, d.TanggalMasukKandang,
                   d.JumlahMatiPraKandang, d.KondisiAwal
            FROM Kandang k
            LEFT JOIN Cycle c ON k.KodeCycle = c.KodeCycle
            LEFT JOIN TimKerja t ON k.KodeTim = t.KodeTim
            LEFT JOIN DOC d ON d.KodeKandang = k.KodeKandang
            WHERE k.KodeKandang = :id AND k.KodePeternakan = :kodePeternakan
        `, {
            replacements: { id: req.params.id, kodePeternakan: req.user.kodePeternakan },
            type: sequelize.QueryTypes.SELECT
        });

        if (!kandang) {
            return res.status(404).json({ error: 'Kandang not found' });
        }

        res.json(kandang);
    } catch (error) {
        console.error('Get kandang error:', error);
        res.status(500).json({ error: 'Failed to get kandang' });
    }
});

// POST /api/kandang - Create kandang & Chick-In with specified quantity
router.post('/', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const {
            kodeDoc,
            kodeTim,
            jumlahDoc,          // NEW: How many DOC to place in this kandang
            panjangKandang,
            lebarKandang,
            lantaiKandang = 'Sekam',
            suhuKandang = 30,
            durasiCycle = 35
        } = req.body;

        if (!kodeDoc || !kodeTim || !panjangKandang || !lebarKandang) {
            await transaction.rollback();
            return res.status(400).json({ error: 'DOC, Tim, Panjang, dan Lebar wajib diisi' });
        }

        // Get DOC and validate
        const doc = await DOC.findByPk(kodeDoc, { transaction });
        if (!doc) {
            await transaction.rollback();
            return res.status(404).json({ error: 'DOC not found' });
        }
        if (doc.KodeKandang) {
            await transaction.rollback();
            return res.status(400).json({ error: 'DOC sudah ditempatkan di kandang lain' });
        }

        // Calculate available DOC (received minus dead before placement)
        const available = doc.JumlahDiterima - (doc.JumlahMatiPraKandang || 0);
        const placementAmount = jumlahDoc ? parseInt(jumlahDoc) : available;

        if (placementAmount <= 0) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Jumlah DOC harus lebih dari 0' });
        }
        if (placementAmount > available) {
            await transaction.rollback();
            return res.status(400).json({ error: `Jumlah DOC melebihi stok tersedia (${available} ekor)` });
        }

        // Verify tim belongs to this peternakan
        const tim = await TimKerja.findOne({
            where: { KodeTim: kodeTim, KodePeternakan: req.user.kodePeternakan },
            transaction
        });
        if (!tim) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Tim Kerja not found' });
        }

        // Create cycle
        const cycle = await Cycle.create({
            TanggalMulai: new Date(),
            DurasiCycle: parseInt(durasiCycle),
            SisaHariPanen: parseInt(durasiCycle)
        }, { transaction });

        // Calculate density
        const luas = parseFloat(panjangKandang) * parseFloat(lebarKandang);
        const kepadatan = luas > 0 ? (placementAmount / luas) : 0;
        const kodeKandang = await generateKodeKandang(sequelize, transaction);

        // Create kandang
        const kandang = await Kandang.create({
            KodeKandang: kodeKandang,
            KodeCycle: cycle.KodeCycle,
            KodePeternakan: req.user.kodePeternakan,
            KodeTim: kodeTim,
            PanjangKandang: panjangKandang,
            LebarKandang: lebarKandang,
            LantaiKandang: lantaiKandang,
            Kepadatan: parseFloat(kepadatan.toFixed(2)),
            SuhuKandang: suhuKandang
        }, { transaction });

        // Update DOC - assign to kandang
        // NOTE: Do NOT overwrite JumlahDiterima — it must stay as the original received amount.
        // placementAmount is the number placed (JumlahDiterima - JumlahMatiPraKandang), stored in StatusKandang.Populasi.
        await doc.update({
            KodeKandang: kodeKandang,
            TanggalMasukKandang: new Date()
        }, { transaction });

        // Create initial status kandang
        const kodeStatus = await generateKodeStatus(sequelize, transaction);
        await StatusKandang.create({
            KodeStatus: kodeStatus,
            KodeKandang: kodeKandang,
            UmurAyam: 0,
            Populasi: placementAmount,
            BeratRataRata: 40,
            TanggalPemeriksaan: new Date()
        }, { transaction });

        // === BLOCKCHAIN: Create Genesis + Kandang Aktif + DOC Masuk blocks ===
        try {
            await blockchain.createGenesisBlock(sequelize, {
                kodePeternakan: req.user.kodePeternakan,
                kodeCycle: cycle.KodeCycle,
                tanggalMulai: cycle.TanggalMulai,
                durasiCycle: cycle.DurasiCycle,
                sisaHariPanen: cycle.SisaHariPanen,
                transaction
            });

            await blockchain.createKandangAktifBlock(sequelize, {
                kodePeternakan: req.user.kodePeternakan,
                kodeCycle: cycle.KodeCycle,
                kodeKandang: kodeKandang,
                kodeTim: kodeTim,
                panjang: panjangKandang,
                lebar: lebarKandang,
                lantai: lantaiKandang,
                kepadatan: parseFloat(kepadatan.toFixed(2)),
                suhu: suhuKandang,
                transaction
            });

            await blockchain.createDocMasukBlock(sequelize, {
                kodePeternakan: req.user.kodePeternakan,
                kodeCycle: cycle.KodeCycle,
                kodeKandang: kodeKandang,
                kodeDOC: doc.KodeDOC,
                brandDOC: doc.BrandDOC,
                tipeAyam: doc.TipeAyam,
                tanggalMasuk: new Date().toISOString().split('T')[0],
                jumlahDipesan: doc.JumlahDipesan,
                jumlahDiterima: doc.JumlahDiterima,
                jumlahMatiPraKandang: doc.JumlahMatiPraKandang || 0,
                jumlahDitempatkan: placementAmount,
                kondisiAwal: doc.KondisiAwal,
                transaction
            });
        } catch (bcError) {
            console.error('Blockchain block creation error (non-fatal):', bcError);
            // Blockchain errors should not block the main operation
        }

        await transaction.commit();

        // Return full kandang info
        res.status(201).json({
            ...kandang.toJSON(),
            Cycle: cycle.toJSON(),
            NamaTim: tim.NamaTim,
            DOC: {
                KodeDOC: doc.KodeDOC,
                BrandDOC: doc.BrandDOC,
                JumlahDitempatkan: placementAmount
            }
        });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create kandang error:', error);
        res.status(500).json({ error: 'Failed to create kandang' });
    }
});

// PUT /api/kandang/:id - Update kandang properties
router.put('/:id', async (req, res) => {
    try {
        const kandang = await Kandang.findOne({
            where: {
                KodeKandang: req.params.id,
                KodePeternakan: req.user.kodePeternakan
            }
        });

        if (!kandang) {
            return res.status(404).json({ error: 'Kandang not found' });
        }

        const { panjangKandang, lebarKandang, lantaiKandang, suhuKandang, kodeTim } = req.body;

        // If changing tim, verify it belongs to same peternakan
        if (kodeTim && kodeTim !== kandang.KodeTim) {
            const tim = await TimKerja.findOne({
                where: { KodeTim: kodeTim, KodePeternakan: req.user.kodePeternakan }
            });
            if (!tim) {
                return res.status(404).json({ error: 'Tim Kerja not found' });
            }
        }

        // Recalculate kepadatan if dimensions changed
        let kepadatan = kandang.Kepadatan;
        const newPanjang = panjangKandang ?? kandang.PanjangKandang;
        const newLebar = lebarKandang ?? kandang.LebarKandang;
        if (panjangKandang || lebarKandang) {
            const doc = await DOC.findOne({ where: { KodeKandang: kandang.KodeKandang } });
            const luas = parseFloat(newPanjang) * parseFloat(newLebar);
            if (luas > 0 && doc) {
                kepadatan = parseFloat((doc.JumlahDiterima / luas).toFixed(2));
            }
        }

        await kandang.update({
            PanjangKandang: newPanjang,
            LebarKandang: newLebar,
            LantaiKandang: lantaiKandang ?? kandang.LantaiKandang,
            Kepadatan: kepadatan,
            SuhuKandang: suhuKandang ?? kandang.SuhuKandang,
            KodeTim: kodeTim ?? kandang.KodeTim
        });

        res.json(kandang);
    } catch (error) {
        console.error('Update kandang error:', error);
        res.status(500).json({ error: 'Failed to update kandang' });
    }
});

// DELETE /api/kandang/:id
router.delete('/:id', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const kandang = await Kandang.findOne({
            where: {
                KodeKandang: req.params.id,
                KodePeternakan: req.user.kodePeternakan
            },
            transaction
        });

        if (!kandang) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Kandang not found' });
        }

        // Delete related records first
        await StatusKandang.destroy({ where: { KodeKandang: kandang.KodeKandang }, transaction });
        await StatusKematian.destroy({ where: { KodeKandang: kandang.KodeKandang }, transaction });
        await PemakaianPerlengkapan.destroy({ where: { KodeKandang: kandang.KodeKandang }, transaction });
        await PemakaianObat.destroy({ where: { KodeKandang: kandang.KodeKandang }, transaction });
        await Performance.destroy({ where: { KodeKandang: kandang.KodeKandang }, transaction });

        // Delete related feed records
        await sequelize.query(`
            DELETE df FROM DetailFeed df
            JOIN PemakaianFeed pf ON df.KodePemakaianFeed = pf.KodePemakaianFeed
            WHERE pf.KodeKandang = :kodeKandang
        `, { replacements: { kodeKandang: kandang.KodeKandang }, transaction });
        await sequelize.query(`
            DELETE FROM PemakaianFeed WHERE KodeKandang = :kodeKandang
        `, { replacements: { kodeKandang: kandang.KodeKandang }, transaction });

        // Reset DOC assignment
        await DOC.update(
            { KodeKandang: null, TanggalMasukKandang: null },
            { where: { KodeKandang: kandang.KodeKandang }, transaction }
        );

        const kodeCycle = kandang.KodeCycle;
        await kandang.destroy({ transaction });

        // Delete cycle
        if (kodeCycle) {
            await Cycle.destroy({ where: { KodeCycle: kodeCycle }, transaction });
        }

        await transaction.commit();
        res.json({ message: 'Kandang deleted successfully' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete kandang error:', error);
        res.status(500).json({ error: 'Failed to delete kandang' });
    }
});

// GET /api/kandang/:id/status - Get kandang status history
router.get('/:id/status', async (req, res) => {
    try {
        const statuses = await StatusKandang.findAll({
            where: { KodeKandang: req.params.id },
            order: [['TanggalPemeriksaan', 'DESC']]
        });
        res.json({ success: true, data: statuses });
    } catch (error) {
        console.error('Get status error:', error);
        res.status(500).json({ success: false, error: 'Failed to get status' });
    }
});

// GET /api/kandang/:id/performance - Get kandang performance data
router.get('/:id/performance', async (req, res) => {
    try {
        const { id } = req.params;
        const performance = await sequelize.query(`
            SELECT p.KodePerformance, p.TanggalPerformance,
            p.ActualAverageDailyGain, p.ActualFeedIntake, p.ActualWaterIntake,
            p.KeteranganPerformance
            FROM Performance p
            WHERE p.KodeKandang = :id
            ORDER BY p.TanggalPerformance DESC
            `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });
        res.json({ success: true, data: performance });
    } catch (error) {
        console.error('Get performance error:', error);
        res.status(500).json({ success: false, error: 'Failed to get performance' });
    }
});

// POST /api/kandang/:id/performance - Add performance record
router.post('/:id/performance', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;
        const { tanggalPerformance, actualAverageDailyGain, actualFeedIntake, actualWaterIntake, keteranganPerformance } = req.body;

        const kandang = await Kandang.findOne({
            where: { KodeKandang: id, KodePeternakan: req.user.kodePeternakan }
        });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Kandang not found or unauthorized' });
        }

        const kodePerformance = await generateKodePerformance(sequelize, transaction);
        const perf = await Performance.create({
            KodePerformance: kodePerformance,
            KodeKandang: id,
            TanggalPerformance: tanggalPerformance,
            ActualAverageDailyGain: actualAverageDailyGain,
            ActualFeedIntake: actualFeedIntake,
            ActualWaterIntake: actualWaterIntake,
            KeteranganPerformance: keteranganPerformance
        }, { transaction });

        await transaction.commit();
        res.status(201).json(perf);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create performance error:', error);
        res.status(500).json({ error: 'Failed to record performance' });
    }
});

// GET /api/kandang/:id/pemakaian-obat - Get obat usage
router.get('/:id/pemakaian-obat', async (req, res) => {
    try {
        const { id } = req.params;
        const pemakaianObat = await sequelize.query(`
            SELECT po.KodePemakaianObat, po.TanggalPenggunaan,
                   po.JumlahObat, po.KodePerlengkapan,
                   mo.JenisObat, mo.Dosis,
                   p.NamaPerlengkapan
            FROM PemakaianObat po
            LEFT JOIN MasterObat mo ON po.KodePerlengkapan = mo.KodePerlengkapan
            LEFT JOIN Perlengkapan p ON po.KodePerlengkapan = p.KodePerlengkapan
            WHERE po.KodeKandang = :id
            ORDER BY po.TanggalPenggunaan DESC
        `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });
        res.json({ success: true, data: pemakaianObat });
    } catch (error) {
        console.error('Get pemakaian obat error:', error);
        res.status(500).json({ success: false, error: 'Failed to get pemakaian obat' });
    }
});

// GET /api/kandang/:id/pemakaian-perlengkapan - Get perlengkapan usage
router.get('/:id/pemakaian-perlengkapan', async (req, res) => {
    try {
        const { id } = req.params;
        const pemakaianPerlengkapan = await sequelize.query(`
            SELECT pp.KodePemakaian, pp.TanggalPemakaian,
                   pp.JumlahPemakaian,
                   p.NamaPerlengkapan, p.KategoriPerlengkapan, p.Satuan
            FROM PemakaianPerlengkapan pp
            JOIN Perlengkapan p ON pp.KodePerlengkapan = p.KodePerlengkapan
            WHERE pp.KodeKandang = :id
            ORDER BY pp.TanggalPemakaian DESC
            `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });
        res.json({ success: true, data: pemakaianPerlengkapan });
    } catch (error) {
        console.error('Get pemakaian perlengkapan error:', error);
        res.status(500).json({ success: false, error: 'Failed to get pemakaian perlengkapan' });
    }
});

// GET /api/kandang/:id/pemakaian-feed - Get feed usage
router.get('/:id/pemakaian-feed', async (req, res) => {
    try {
        const { id } = req.params;
        const pemakaianFeed = await sequelize.query(`
            SELECT pf.KodePemakaianFeed, pf.TanggalPemakaian,
                   df.JumlahPakan,
                   p.NamaPerlengkapan AS namaPakan
            FROM PemakaianFeed pf
            JOIN DetailFeed df ON pf.KodePemakaianFeed = df.KodePemakaianFeed
            JOIN Perlengkapan p ON df.KodePerlengkapan = p.KodePerlengkapan
            WHERE pf.KodeKandang = :id
            ORDER BY pf.TanggalPemakaian DESC
        `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });
        res.json({ success: true, data: pemakaianFeed });
    } catch (error) {
        console.error('Get pemakaian feed error:', error);
        res.status(500).json({ success: false, error: 'Failed to get pemakaian feed' });
    }
});

// GET /api/kandang/:id/kematian - Get mortality data
router.get('/:id/kematian', async (req, res) => {
    try {
        const { id } = req.params;
        const kematian = await sequelize.query(`
            SELECT sk.KodeStatusKematian, sk.TanggalKejadian,
            sk.JumlahMati, sk.JumlahReject, sk.Keterangan
            FROM StatusKematian sk
            WHERE sk.KodeKandang = :id
            ORDER BY sk.TanggalKejadian DESC
            `, {
            replacements: { id },
            type: sequelize.QueryTypes.SELECT
        });
        res.json({ success: true, data: kematian });
    } catch (error) {
        console.error('Get kematian error:', error);
        res.status(500).json({ success: false, error: 'Failed to get kematian' });
    }
});

// POST /api/kandang/:id/pemakaian-perlengkapan
router.post('/:id/pemakaian-perlengkapan', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;
        const { kodePerlengkapan, tanggalPemakaian, jumlahPemakaian } = req.body;
        const kodePeternakan = req.user.kodePeternakan;

        const kandang = await Kandang.findOne({ where: { KodeKandang: id, KodePeternakan: kodePeternakan } });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Kandang not found or unauthorized' });
        }

        const warehouse = await Warehouse.findOne({ where: { KodePeternakan: kodePeternakan } });
        if (!warehouse) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Warehouse not found' });
        }

        const stock = await StokWarehouse.findOne({
            where: { KodeWarehouse: warehouse.KodeWarehouse, KodePerlengkapan: kodePerlengkapan },
            transaction
        });

        if (!stock || stock.Jumlah < jumlahPemakaian) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Stok tidak mencukupi' });
        }

        const kodePemakaian = await generateKodePemakaian(sequelize, transaction);
        const usage = await PemakaianPerlengkapan.create({
            KodePemakaian: kodePemakaian,
            KodePerlengkapan: kodePerlengkapan,
            KodeKandang: id,
            TanggalPemakaian: tanggalPemakaian,
            JumlahPemakaian: jumlahPemakaian
        }, { transaction });

        await stock.decrement('Jumlah', { by: jumlahPemakaian, transaction });

        await transaction.commit();
        res.status(201).json(usage);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create usage error:', error);
        res.status(500).json({ error: 'Failed to record usage' });
    }
});

// POST /api/kandang/:id/pemakaian-obat
router.post('/:id/pemakaian-obat', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;
        const { kodePerlengkapan, tanggalPenggunaan, jumlahObat } = req.body;
        const kodePeternakan = req.user.kodePeternakan;

        const kandang = await Kandang.findOne({ where: { KodeKandang: id, KodePeternakan: kodePeternakan } });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Kandang not found or unauthorized' });
        }

        const obat = await MasterObat.findOne({ where: { KodePerlengkapan: kodePerlengkapan } });
        if (obat) {
            const today = new Date();
            const expDate = new Date(obat.TanggalKadaluarsa);
            if (expDate < today) {
                await transaction.rollback();
                return res.status(400).json({ error: 'Obat sudah kadaluarsa! Harap eject.' });
            }
        }

        const warehouse = await Warehouse.findOne({ where: { KodePeternakan: kodePeternakan } });
        const stock = await StokWarehouse.findOne({
            where: { KodeWarehouse: warehouse.KodeWarehouse, KodePerlengkapan: kodePerlengkapan },
            transaction
        });

        if (!stock || stock.Jumlah < jumlahObat) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Stok Obat tidak mencukupi' });
        }

        const kodePemakaianObat = await generateKodePemakaianObat(sequelize, transaction);
        const usage = await PemakaianObat.create({
            KodePemakaianObat: kodePemakaianObat,
            KodePerlengkapan: kodePerlengkapan,
            KodeKandang: id,
            TanggalPenggunaan: tanggalPenggunaan,
            JumlahObat: jumlahObat
        }, { transaction });

        await stock.decrement('Jumlah', { by: jumlahObat, transaction });

        // === BLOCKCHAIN: Create Pemakaian Obat Block ===
        try {
            await blockchain.createPemakaianObatBlock(sequelize, {
                kodePeternakan: req.user.kodePeternakan,
                kodeCycle: kandang.KodeCycle,
                kodeKandang: id,
                kodePemakaianObat: kodePemakaianObat,
                kodePerlengkapan: kodePerlengkapan,
                jenisObat: obat ? obat.JenisObat : null,
                dosis: obat ? obat.Dosis : null,
                jumlahObat: jumlahObat,
                tanggalPenggunaan: tanggalPenggunaan,
                transaction
            });
        } catch (bcError) {
            console.error('Blockchain obat block error (non-fatal):', bcError);
        }

        await transaction.commit();
        res.status(201).json(usage);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create obat usage error:', error);
        res.status(500).json({ error: 'Failed to record obat usage' });
    }
});

// POST /api/kandang/:id/kematian
router.post('/:id/kematian', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;
        const { tanggalKejadian, jumlahMati, jumlahReject, keterangan } = req.body;
        const kodePeternakan = req.user.kodePeternakan;

        const kandang = await Kandang.findOne({ where: { KodeKandang: id, KodePeternakan: kodePeternakan }, transaction });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const kodeStatusKematian = await generateKodeStatusKematian(sequelize, transaction);
        const kematian = await StatusKematian.create({
            KodeStatusKematian: kodeStatusKematian,
            KodeKandang: id,
            TanggalKejadian: tanggalKejadian,
            JumlahMati: jumlahMati,
            JumlahReject: jumlahReject,
            Keterangan: keterangan
        }, { transaction });

        // Update latest status populasi — create a new StatusKandang record with reduced population
        const latestStatus = await StatusKandang.findOne({
            where: { KodeKandang: id },
            order: [['TanggalPemeriksaan', 'DESC']],
            transaction
        });

        if (latestStatus) {
            const totalLoss = (parseInt(jumlahMati) || 0) + (parseInt(jumlahReject) || 0);
            const newPopulasi = Math.max(0, (latestStatus.Populasi || 0) - totalLoss);

            // Create a new status record with updated population
            const kodeStatus = await generateKodeStatus(sequelize, transaction);
            await StatusKandang.create({
                KodeStatus: kodeStatus,
                KodeKandang: id,
                UmurAyam: latestStatus.UmurAyam,
                Populasi: newPopulasi,
                BeratRataRata: latestStatus.BeratRataRata,
                TanggalPemeriksaan: tanggalKejadian || new Date()
            }, { transaction });
        }

        // === BLOCKCHAIN: Create Mortality Block ===
        try {
            await blockchain.createMortalityBlock(sequelize, {
                kodePeternakan: req.user.kodePeternakan,
                kodeCycle: kandang.KodeCycle,
                kodeKandang: id,
                kodeStatusKematian: kodeStatusKematian,
                tanggalKejadian: tanggalKejadian,
                jumlahMati: jumlahMati,
                jumlahReject: jumlahReject,
                keterangan: keterangan,
                transaction
            });
        } catch (bcError) {
            console.error('Blockchain mortality block error (non-fatal):', bcError);
        }

        await transaction.commit();
        res.status(201).json(kematian);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create kematian error:', error);
        res.status(500).json({ error: 'Failed to record kematian' });
    }
});

// POST /api/kandang/:id/status
router.post('/:id/status', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;
        const { tanggalPemeriksaan, populasi, beratRataRata } = req.body;

        const doc = await DOC.findOne({ where: { KodeKandang: id }, transaction });
        let umur = 0;
        if (doc && doc.TanggalMasukKandang) {
            const start = new Date(doc.TanggalMasukKandang);
            const check = new Date(tanggalPemeriksaan);
            umur = Math.floor((check - start) / (1000 * 60 * 60 * 24));
        }

        const kodeStatus = await generateKodeStatus(sequelize, transaction);
        const status = await StatusKandang.create({
            KodeStatus: kodeStatus,
            KodeKandang: id,
            TanggalPemeriksaan: tanggalPemeriksaan,
            Populasi: populasi,
            BeratRataRata: beratRataRata,
            UmurAyam: umur
        }, { transaction });

        // Update cycle SisaHariPanen
        const kandang = await Kandang.findByPk(id, { transaction });
        if (kandang && kandang.KodeCycle) {
            const cycle = await Cycle.findByPk(kandang.KodeCycle, { transaction });
            if (cycle) {
                const start = new Date(cycle.TanggalMulai);
                const now = new Date(tanggalPemeriksaan);
                const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
                const remaining = Math.max(0, cycle.DurasiCycle - elapsed);
                await cycle.update({ SisaHariPanen: remaining }, { transaction });
            }
        }

        await transaction.commit();
        res.status(201).json(status);
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create status error:', error);
        res.status(500).json({ error: 'Failed to create status' });
    }
});

// POST /api/kandang/:id/pemakaian-feed - Add feed usage
router.post('/:id/pemakaian-feed', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { id } = req.params;
        const { tanggalPemakaian, items } = req.body; // items = [{ kodePerlengkapan, jumlahPakan }]
        const kodePeternakan = req.user.kodePeternakan;

        const kandang = await Kandang.findOne({ where: { KodeKandang: id, KodePeternakan: kodePeternakan } });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Kandang not found or unauthorized' });
        }

        if (!items || !items.length) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Minimal 1 item pakan harus diisi' });
        }

        const warehouse = await Warehouse.findOne({ where: { KodePeternakan: kodePeternakan } });
        if (!warehouse) {
            await transaction.rollback();
            return res.status(400).json({ error: 'Warehouse not found' });
        }

        // Check stock for all items
        for (const item of items) {
            const stock = await StokWarehouse.findOne({
                where: { KodeWarehouse: warehouse.KodeWarehouse, KodePerlengkapan: item.kodePerlengkapan },
                transaction
            });
            if (!stock || stock.Jumlah < item.jumlahPakan) {
                await transaction.rollback();
                return res.status(400).json({ error: `Stok pakan ${item.kodePerlengkapan} tidak mencukupi` });
            }
        }

        const kodePemakaianFeed = await generateKodePemakaianFeed(sequelize, transaction);

        // Create PemakaianFeed header
        await sequelize.query(`
            INSERT INTO PemakaianFeed (KodePemakaianFeed, KodeKandang, TanggalPemakaian)
            VALUES (:kodePemakaianFeed, :kodeKandang, :tanggalPemakaian)
        `, {
            replacements: { kodePemakaianFeed, kodeKandang: id, tanggalPemakaian },
            transaction
        });

        // Create DetailFeed entries and deduct stock
        for (const item of items) {
            await sequelize.query(`
                INSERT INTO DetailFeed (KodePemakaianFeed, KodePerlengkapan, JumlahPakan)
                VALUES (:kodePemakaianFeed, :kodePerlengkapan, :jumlahPakan)
            `, {
                replacements: {
                    kodePemakaianFeed,
                    kodePerlengkapan: item.kodePerlengkapan,
                    jumlahPakan: item.jumlahPakan
                },
                transaction
            });

            // Deduct stock
            const stock = await StokWarehouse.findOne({
                where: { KodeWarehouse: warehouse.KodeWarehouse, KodePerlengkapan: item.kodePerlengkapan },
                transaction
            });
            await stock.decrement('Jumlah', { by: item.jumlahPakan, transaction });
        }

        await transaction.commit();
        res.status(201).json({ success: true, KodePemakaianFeed: kodePemakaianFeed });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create feed usage error:', error);
        res.status(500).json({ error: 'Failed to record feed usage' });
    }
});

// DELETE /api/kandang/:id/status/:kodeStatus
router.delete('/:id/status/:kodeStatus', async (req, res) => {
    try {
        const { kodeStatus } = req.params;
        const kandang = await Kandang.findOne({
            where: { KodeKandang: req.params.id, KodePeternakan: req.user.kodePeternakan }
        });
        if (!kandang) return res.status(403).json({ error: 'Unauthorized' });

        await StatusKandang.destroy({ where: { KodeStatus: kodeStatus, KodeKandang: req.params.id } });
        res.json({ success: true, message: 'Status deleted' });
    } catch (error) {
        console.error('Delete status error:', error);
        res.status(500).json({ error: 'Failed to delete status' });
    }
});

// DELETE /api/kandang/:id/performance/:kodePerformance
router.delete('/:id/performance/:kodePerformance', async (req, res) => {
    try {
        const { kodePerformance } = req.params;
        const kandang = await Kandang.findOne({
            where: { KodeKandang: req.params.id, KodePeternakan: req.user.kodePeternakan }
        });
        if (!kandang) return res.status(403).json({ error: 'Unauthorized' });

        await Performance.destroy({ where: { KodePerformance: kodePerformance, KodeKandang: req.params.id } });
        res.json({ success: true, message: 'Performance deleted' });
    } catch (error) {
        console.error('Delete performance error:', error);
        res.status(500).json({ error: 'Failed to delete performance' });
    }
});

// DELETE /api/kandang/:id/pemakaian-feed/:kodePemakaianFeed
router.delete('/:id/pemakaian-feed/:kodePemakaianFeed', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { kodePemakaianFeed } = req.params;
        const kodePeternakan = req.user.kodePeternakan;

        const kandang = await Kandang.findOne({ where: { KodeKandang: req.params.id, KodePeternakan: kodePeternakan } });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get detail feed items to restore stock
        const details = await sequelize.query(`
            SELECT df.KodePerlengkapan, df.JumlahPakan
            FROM DetailFeed df
            WHERE df.KodePemakaianFeed = :kodePemakaianFeed
        `, { replacements: { kodePemakaianFeed }, type: sequelize.QueryTypes.SELECT, transaction });

        const warehouse = await Warehouse.findOne({ where: { KodePeternakan: kodePeternakan }, transaction });

        // Restore stock
        for (const detail of details) {
            if (warehouse) {
                await sequelize.query(`
                    UPDATE StokWarehouse SET Jumlah = Jumlah + :jumlah
                    WHERE KodeWarehouse = :kodeWarehouse AND KodePerlengkapan = :kodePerlengkapan
                `, {
                    replacements: {
                        jumlah: detail.JumlahPakan,
                        kodeWarehouse: warehouse.KodeWarehouse,
                        kodePerlengkapan: detail.KodePerlengkapan
                    },
                    transaction
                });
            }
        }

        // Delete detail feed then parent
        await sequelize.query(`DELETE FROM DetailFeed WHERE KodePemakaianFeed = :kodePemakaianFeed`, {
            replacements: { kodePemakaianFeed }, transaction
        });
        await sequelize.query(`DELETE FROM PemakaianFeed WHERE KodePemakaianFeed = :kodePemakaianFeed AND KodeKandang = :kodeKandang`, {
            replacements: { kodePemakaianFeed, kodeKandang: req.params.id }, transaction
        });

        await transaction.commit();
        res.json({ success: true, message: 'Feed usage deleted, stock restored' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete feed usage error:', error);
        res.status(500).json({ error: 'Failed to delete feed usage' });
    }
});

// DELETE /api/kandang/:id/pemakaian-obat/:kodePemakaianObat
router.delete('/:id/pemakaian-obat/:kodePemakaianObat', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { kodePemakaianObat } = req.params;
        const kodePeternakan = req.user.kodePeternakan;

        const kandang = await Kandang.findOne({ where: { KodeKandang: req.params.id, KodePeternakan: kodePeternakan } });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get obat details to restore stock
        const [obatUsage] = await sequelize.query(`
            SELECT KodePerlengkapan, JumlahObat FROM PemakaianObat
            WHERE KodePemakaianObat = :kodePemakaianObat AND KodeKandang = :kodeKandang
        `, { replacements: { kodePemakaianObat, kodeKandang: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction });

        if (obatUsage) {
            const warehouse = await Warehouse.findOne({ where: { KodePeternakan: kodePeternakan }, transaction });
            if (warehouse) {
                await sequelize.query(`
                    UPDATE StokWarehouse SET Jumlah = Jumlah + :jumlah
                    WHERE KodeWarehouse = :kodeWarehouse AND KodePerlengkapan = :kodePerlengkapan
                `, {
                    replacements: {
                        jumlah: obatUsage.JumlahObat,
                        kodeWarehouse: warehouse.KodeWarehouse,
                        kodePerlengkapan: obatUsage.KodePerlengkapan
                    },
                    transaction
                });
            }
        }

        await PemakaianObat.destroy({ where: { KodePemakaianObat: kodePemakaianObat, KodeKandang: req.params.id }, transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Obat usage deleted, stock restored' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete obat usage error:', error);
        res.status(500).json({ error: 'Failed to delete obat usage' });
    }
});

// DELETE /api/kandang/:id/pemakaian-perlengkapan/:kodePemakaian
router.delete('/:id/pemakaian-perlengkapan/:kodePemakaian', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { kodePemakaian } = req.params;
        const kodePeternakan = req.user.kodePeternakan;

        const kandang = await Kandang.findOne({ where: { KodeKandang: req.params.id, KodePeternakan: kodePeternakan } });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get perlengkapan details to restore stock
        const [usage] = await sequelize.query(`
            SELECT KodePerlengkapan, JumlahPemakaian FROM PemakaianPerlengkapan
            WHERE KodePemakaian = :kodePemakaian AND KodeKandang = :kodeKandang
        `, { replacements: { kodePemakaian, kodeKandang: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction });

        if (usage) {
            const warehouse = await Warehouse.findOne({ where: { KodePeternakan: kodePeternakan }, transaction });
            if (warehouse) {
                await sequelize.query(`
                    UPDATE StokWarehouse SET Jumlah = Jumlah + :jumlah
                    WHERE KodeWarehouse = :kodeWarehouse AND KodePerlengkapan = :kodePerlengkapan
                `, {
                    replacements: {
                        jumlah: usage.JumlahPemakaian,
                        kodeWarehouse: warehouse.KodeWarehouse,
                        kodePerlengkapan: usage.KodePerlengkapan
                    },
                    transaction
                });
            }
        }

        await PemakaianPerlengkapan.destroy({ where: { KodePemakaian: kodePemakaian, KodeKandang: req.params.id }, transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Perlengkapan usage deleted, stock restored' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete perlengkapan usage error:', error);
        res.status(500).json({ error: 'Failed to delete perlengkapan usage' });
    }
});

// DELETE /api/kandang/:id/kematian/:kodeStatusKematian
router.delete('/:id/kematian/:kodeStatusKematian', async (req, res) => {
    let transaction;
    try {
        transaction = await sequelize.transaction();
        const { kodeStatusKematian } = req.params;
        const kodePeternakan = req.user.kodePeternakan;

        const kandang = await Kandang.findOne({ where: { KodeKandang: req.params.id, KodePeternakan: kodePeternakan } });
        if (!kandang) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get kematian data to restore populasi
        const [kematian] = await sequelize.query(`
            SELECT JumlahMati, JumlahReject FROM StatusKematian
            WHERE KodeStatusKematian = :kodeStatusKematian AND KodeKandang = :kodeKandang
        `, { replacements: { kodeStatusKematian, kodeKandang: req.params.id }, type: sequelize.QueryTypes.SELECT, transaction });

        if (kematian) {
            const totalLoss = (parseInt(kematian.JumlahMati) || 0) + (parseInt(kematian.JumlahReject) || 0);
            // Restore populasi to latest status
            const latestStatus = await StatusKandang.findOne({
                where: { KodeKandang: req.params.id },
                order: [['TanggalPemeriksaan', 'DESC']],
                transaction
            });
            if (latestStatus) {
                await latestStatus.increment('Populasi', { by: totalLoss, transaction });
            }
        }

        await StatusKematian.destroy({ where: { KodeStatusKematian: kodeStatusKematian, KodeKandang: req.params.id }, transaction });

        await transaction.commit();
        res.json({ success: true, message: 'Kematian deleted, populasi restored' });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete kematian error:', error);
        res.status(500).json({ error: 'Failed to delete kematian' });
    }
});

module.exports = router;
