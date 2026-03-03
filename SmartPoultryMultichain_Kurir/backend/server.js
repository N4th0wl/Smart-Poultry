require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5174',
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const kurirRoutes = require('./routes/kurir');
const pengirimanRoutes = require('./routes/pengiriman');
const blockchainRoutes = require('./routes/blockchain');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/kurir', kurirRoutes);
app.use('/api/pengiriman', pengirimanRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

const PORT = process.env.PORT || 5002;

// Database connection and server start
sequelize.authenticate()
    .then(() => {
        console.log('✅ Database connected successfully');
        return sequelize.sync({ alter: false });
    })
    .then(async () => {
        // Test cross-chain connection to Peternakan DB
        try {
            const crossChain = require('./config/peternakanDatabase');
            await crossChain.testPeternakanConnection();
        } catch (e) {
            console.warn('⚠️ Cross-chain connection not available:', e.message);
        }

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
        });
    })
    .catch((err) => {
        console.error('❌ Unable to connect to database:', err);
        process.exit(1);
    });

module.exports = app;
