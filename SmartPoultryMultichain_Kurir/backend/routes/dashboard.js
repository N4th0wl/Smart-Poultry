const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { Pengiriman, Kurir, BuktiTandaTerima, NotaPengirimanKurir, BlockchainIdentity, sequelize } = require('../models');

// GET /api/dashboard/stats - Dashboard stats
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const kp = req.user.kodePerusahaan;

        const [totalKurir] = await sequelize.query(
            `SELECT COUNT(*) as total FROM Kurir WHERE KodePerusahaan = :kp AND StatusKurir = 'AKTIF'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kp } }
        );

        const [totalPengiriman] = await sequelize.query(
            `SELECT COUNT(*) as total FROM Pengiriman WHERE KodePerusahaan = :kp`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kp } }
        );

        const [pengirimanAktif] = await sequelize.query(
            `SELECT COUNT(*) as total FROM Pengiriman WHERE KodePerusahaan = :kp AND StatusPengiriman IN ('PICKUP', 'DALAM_PERJALANAN')`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kp } }
        );

        const [pengirimanSelesai] = await sequelize.query(
            `SELECT COUNT(*) as total FROM Pengiriman WHERE KodePerusahaan = :kp AND StatusPengiriman = 'TERKIRIM'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kp } }
        );

        const [pengirimanGagal] = await sequelize.query(
            `SELECT COUNT(*) as total FROM Pengiriman WHERE KodePerusahaan = :kp AND StatusPengiriman = 'GAGAL'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kp } }
        );

        const [farmToProcessor] = await sequelize.query(
            `SELECT COUNT(*) as total FROM Pengiriman WHERE KodePerusahaan = :kp AND TipePengiriman = 'FARM_TO_PROCESSOR'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kp } }
        );

        const [processorToRetailer] = await sequelize.query(
            `SELECT COUNT(*) as total FROM Pengiriman WHERE KodePerusahaan = :kp AND TipePengiriman = 'PROCESSOR_TO_RETAILER'`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kp } }
        );

        const [totalChains] = await sequelize.query(
            `SELECT COUNT(*) as total FROM BlockchainIdentity WHERE KodePerusahaan = :kp`,
            { type: sequelize.QueryTypes.SELECT, replacements: { kp } }
        );

        res.json({
            totalKurir: totalKurir?.total || 0,
            totalPengiriman: totalPengiriman?.total || 0,
            pengirimanAktif: pengirimanAktif?.total || 0,
            pengirimanSelesai: pengirimanSelesai?.total || 0,
            pengirimanGagal: pengirimanGagal?.total || 0,
            farmToProcessor: farmToProcessor?.total || 0,
            processorToRetailer: processorToRetailer?.total || 0,
            totalChains: totalChains?.total || 0
        });
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to get dashboard stats' });
    }
});

// GET /api/dashboard/recent - Recent shipments
router.get('/recent', authMiddleware, async (req, res) => {
    try {
        const shipments = await Pengiriman.findAll({
            where: { KodePerusahaan: req.user.kodePerusahaan },
            include: [{ model: Kurir }],
            order: [['TanggalPickup', 'DESC']],
            limit: 10
        });
        res.json(shipments);
    } catch (error) {
        console.error('Get recent shipments error:', error);
        res.status(500).json({ error: 'Failed to get recent shipments' });
    }
});

module.exports = router;
