const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize, Order, Produksi, Pengiriman, Karyawan, TugasProduksi, BlockchainIdentity, LedgerProcessor, CodeCounter } = require('./src/models');

// Route imports
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const karyawanRoutes = require('./src/routes/karyawan');
const orderRoutes = require('./src/routes/orders');
const notaPenerimaanRoutes = require('./src/routes/notaPenerimaan');
const tugasRoutes = require('./src/routes/tugas');
const produksiRoutes = require('./src/routes/produksi');
const laporanMasalahRoutes = require('./src/routes/laporanMasalah');
const sertifikatHalalRoutes = require('./src/routes/sertifikatHalal');
const qcRoutes = require('./src/routes/qc');
const pengirimanRoutes = require('./src/routes/pengiriman');
const notaRoutes = require('./src/routes/nota');
const blockchainRoutes = require('./src/routes/blockchain');
const qrTraceRoutes = require('./src/routes/qrTrace');
const { authMiddleware } = require('./src/middlewares/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'SmartPoultry Processor API is running', timestamp: new Date().toISOString() });
});

// Dashboard stats — scoped by processor for KARYAWAN, global for ADMIN
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const isAdmin = req.user.role === 'ADMIN';
        const processorScope = isAdmin ? {} : { IdProcessor: req.user.idProcessor };

        const totalOrders = await Order.count({ where: processorScope });
        const ordersDiterima = await Order.count({ where: { ...processorScope, StatusOrder: 'DITERIMA' } });
        const ordersSelesai = await Order.count({ where: { ...processorScope, StatusOrder: 'SELESAI' } });
        const totalProduksi = await Produksi.count(isAdmin ? undefined : {
            include: [{ model: Order, as: 'order', where: processorScope, attributes: [] }],
        });
        const totalPengiriman = await Pengiriman.count(isAdmin ? undefined : {
            include: [{
                model: Produksi, as: 'produksi',
                include: [{ model: Order, as: 'order', where: processorScope, attributes: [] }],
                attributes: [],
            }],
        });
        const totalKaryawan = await Karyawan.count(isAdmin
            ? { where: { StatusKaryawan: 'ACTIVE' } }
            : { where: { StatusKaryawan: 'ACTIVE', IdProcessor: req.user.idProcessor } }
        );
        const totalTugas = await TugasProduksi.count(isAdmin ? undefined : {
            include: [{ model: Order, as: 'order', where: processorScope, attributes: [] }],
        });
        const tugasBelum = await TugasProduksi.count(isAdmin
            ? { where: { StatusTugas: 'BELUM_DIKERJAKAN' } }
            : {
                where: { StatusTugas: 'BELUM_DIKERJAKAN' },
                include: [{ model: Order, as: 'order', where: processorScope, attributes: [] }],
            }
        );
        const tugasSedang = await TugasProduksi.count(isAdmin
            ? { where: { StatusTugas: 'SEDANG_DIKERJAKAN' } }
            : {
                where: { StatusTugas: 'SEDANG_DIKERJAKAN' },
                include: [{ model: Order, as: 'order', where: processorScope, attributes: [] }],
            }
        );

        const recentOrders = await Order.findAll({
            where: processorScope,
            order: [['CreatedAt', 'DESC']],
            limit: 5,
            attributes: ['KodeOrder', 'NamaPeternakan', 'JenisAyam', 'StatusOrder', 'TanggalOrder'],
        });

        res.json({
            data: {
                totalOrders, ordersDiterima, ordersSelesai,
                totalProduksi, totalPengiriman, totalKaryawan,
                totalTugas, tugasBelum, tugasSedang,
                recentOrders,
            },
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ message: 'Gagal mengambil statistik dashboard.' });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/karyawan', karyawanRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/nota-penerimaan', notaPenerimaanRoutes);
app.use('/api/tugas', tugasRoutes);
app.use('/api/produksi', produksiRoutes);
app.use('/api/laporan-masalah', laporanMasalahRoutes);
app.use('/api/sertifikat-halal', sertifikatHalalRoutes);
app.use('/api/qc', qcRoutes);
app.use('/api/pengiriman', pengirimanRoutes);
app.use('/api/nota', notaRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/qr-trace', qrTraceRoutes);

// Auto-seed CodeCounter table if empty
async function seedCodeCounters() {
    const { CODE_CONFIG } = require('./src/utils/codeGenerator');
    const entityNames = Object.keys(CODE_CONFIG);
    
    for (const entityName of entityNames) {
        await CodeCounter.findOrCreate({
            where: { EntityName: entityName },
            defaults: { EntityName: entityName, LastCounter: 0 },
        });
    }
    console.log('✅ CodeCounter seeded');
}

// Start server
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        await sequelize.sync({ alter: false });
        console.log('✅ Models synchronized');

        // Auto-seed CodeCounter
        await seedCodeCounters();

        app.listen(PORT, () => {
            console.log(`🚀 SmartPoultry Processor API running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
