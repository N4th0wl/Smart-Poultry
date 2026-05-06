const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { sequelize, Order, NotaPenerimaan, Gudang, Penjualan, BlockchainIdentity, LedgerRetailer } = require('./src/models');

// Route imports
const authRoutes = require('./src/routes/auth');
const orderRoutes = require('./src/routes/orders');
const notaPenerimaanRoutes = require('./src/routes/notaPenerimaan');
const gudangRoutes = require('./src/routes/gudang');
const penjualanRoutes = require('./src/routes/penjualan');
const blockchainRoutes = require('./src/routes/blockchain');
const { authMiddleware } = require('./src/middlewares/auth');

const app = express();
const PORT = process.env.PORT || 5003;

// Middleware
app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (origin.startsWith('http://localhost:')) return callback(null, true);
        if (origin.endsWith('.devtunnels.ms')) return callback(null, true);
        const allowedOrigins = (process.env.CLIENT_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (process.env.NODE_ENV === 'production') {
            callback(new Error('Not allowed by CORS'));
        } else {
            callback(null, true);
        }
    },
    credentials: true
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'SmartPoultry Retailer API is running', timestamp: new Date().toISOString() });
});

// Dashboard stats
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const retailerScope = req.user.idRetailer ? { IdRetailer: req.user.idRetailer } : {};

        const totalOrders = await Order.count({ where: retailerScope });
        const ordersPending = await Order.count({ where: { ...retailerScope, StatusOrder: 'PENDING' } });
        const ordersDiterima = await Order.count({ where: { ...retailerScope, StatusOrder: 'DITERIMA' } });
        const ordersSelesai = await Order.count({ where: { ...retailerScope, StatusOrder: 'SELESAI' } });

        const totalGudang = await Gudang.count({ where: retailerScope });
        const gudangTersedia = await Gudang.count({ where: { ...retailerScope, StatusStok: 'TERSEDIA' } });
        const gudangHampirHabis = await Gudang.count({ where: { ...retailerScope, StatusStok: 'HAMPIR_HABIS' } });
        const gudangHabis = await Gudang.count({ where: { ...retailerScope, StatusStok: 'HABIS' } });

        const totalPenjualan = await Penjualan.count({ where: retailerScope });

        // Total revenue
        const [revenueResult] = await sequelize.query(
            `SELECT COALESCE(SUM(TotalHarga), 0) AS totalRevenue FROM penjualan WHERE StatusPenjualan = 'SELESAI' ${req.user.idRetailer ? `AND IdRetailer = ${req.user.idRetailer}` : ''}`,
            { type: sequelize.QueryTypes.SELECT }
        );

        const totalBlockchainChains = await BlockchainIdentity.count({ where: retailerScope });

        const recentOrders = await Order.findAll({
            where: retailerScope,
            order: [['CreatedAt', 'DESC']],
            limit: 5,
            attributes: ['KodeOrder', 'NamaProcessor', 'NamaProduk', 'StatusOrder', 'TanggalOrder'],
        });

        res.json({
            data: {
                totalOrders, ordersPending, ordersDiterima, ordersSelesai,
                totalGudang, gudangTersedia, gudangHampirHabis, gudangHabis,
                totalPenjualan,
                totalRevenue: revenueResult?.totalRevenue || 0,
                totalBlockchainChains,
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
app.use('/api/orders', orderRoutes);
app.use('/api/nota-penerimaan', notaPenerimaanRoutes);
app.use('/api/gudang', gudangRoutes);
app.use('/api/penjualan', penjualanRoutes);
app.use('/api/blockchain', blockchainRoutes);

// Start server
async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected successfully');
        await sequelize.sync({ alter: false });
        console.log('✅ Models synchronized');

        app.listen(PORT, () => {
            console.log(`🚀 SmartPoultry Retailer API running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
