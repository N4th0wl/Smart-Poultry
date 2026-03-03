require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const authRoutes = require('./routes/auth');
const ordersRoutes = require('./routes/orders');
const suppliersRoutes = require('./routes/suppliers');
const docRoutes = require('./routes/doc');
const kandangRoutes = require('./routes/kandang');
const cycleRoutes = require('./routes/cycle');
const warehouseRoutes = require('./routes/warehouse');
const panenRoutes = require('./routes/panen');
const staffRoutes = require('./routes/staff');
const dashboardRoutes = require('./routes/dashboard');
const todoRoutes = require('./routes/todos');
const blockchainRoutes = require('./routes/blockchain');
const adminRoutes = require('./routes/admin');

app.use('/api/auth', authRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/doc', docRoutes);
app.use('/api/kandang', kandangRoutes);
app.use('/api/cycle', cycleRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/panen', panenRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/blockchain', blockchainRoutes);
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

const PORT = process.env.PORT || 5000;

// Database connection and server start
sequelize.authenticate()
  .then(() => {
    console.log('✅ Database connected successfully');
    return sequelize.sync({ alter: false }); // Don't alter existing tables
  })
  .then(() => {
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
