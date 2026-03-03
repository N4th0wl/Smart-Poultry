const express = require('express');
const router = express.Router();
const { sequelize } = require('../models');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// GET /api/dashboard/summary - Get dashboard overview metrics
router.get('/summary', async (req, res) => {
  try {
    const kodePeternakan = req.user.kodePeternakan;
    const { cycle, kandang } = req.query;

    // Build WHERE conditions for filtering
    let cycleCondition = cycle ? `AND k.KodeCycle = ${sequelize.escape(cycle)}` : '';
    let kandangCondition = kandang ? `AND k.KodeKandang = ${sequelize.escape(kandang)}` : '';

    // Get total population and kandang count
    const [summaryResult] = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT k.KodeKandang) AS totalKandang,
        COALESCE(SUM(latestStatus.Populasi), 0) AS totalPopulasi,
        ROUND(AVG(k.SuhuKandang), 1) AS avgSuhu
      FROM Kandang k
      LEFT JOIN (
        SELECT sk.KodeKandang, sk.Populasi
        FROM StatusKandang sk
        INNER JOIN (
          SELECT KodeKandang, MAX(TanggalPemeriksaan) AS MaxDate
          FROM StatusKandang
          GROUP BY KodeKandang
        ) latest ON sk.KodeKandang = latest.KodeKandang AND sk.TanggalPemeriksaan = latest.MaxDate
      ) latestStatus ON k.KodeKandang = latestStatus.KodeKandang
      WHERE k.KodePeternakan = :kodePeternakan ${cycleCondition} ${kandangCondition}
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    // Get pending orders count
    const [ordersResult] = await sequelize.query(`
      SELECT COUNT(*) AS pendingOrders
      FROM Orders
      WHERE KodePeternakan = :kodePeternakan AND StatusOrder = 'PROSES'
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    // Get feed intake change (compare last 7 days vs previous 7 days)
    const [feedResult] = await sequelize.query(`
      SELECT 
        COALESCE(
          ROUND(
            ((currentWeek.total - prevWeek.total) / NULLIF(prevWeek.total, 0)) * 100,
            1
          ),
          0
        ) AS feedIntakeChange
      FROM (
        SELECT COALESCE(SUM(df.JumlahPakan), 0) AS total
        FROM PemakaianFeed pf
        JOIN DetailFeed df ON pf.KodePemakaianFeed = df.KodePemakaianFeed
        JOIN Kandang k ON pf.KodeKandang = k.KodeKandang
        WHERE k.KodePeternakan = :kodePeternakan
          AND pf.TanggalPemakaian >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ) currentWeek,
      (
        SELECT COALESCE(SUM(df.JumlahPakan), 0) AS total
        FROM PemakaianFeed pf
        JOIN DetailFeed df ON pf.KodePemakaianFeed = df.KodePemakaianFeed
        JOIN Kandang k ON pf.KodeKandang = k.KodeKandang
        WHERE k.KodePeternakan = :kodePeternakan
          AND pf.TanggalPemakaian >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
          AND pf.TanggalPemakaian < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      ) prevWeek
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    // Get next harvest estimate
    const [harvestResult] = await sequelize.query(`
      SELECT 
        DATE_ADD(c.TanggalMulai, INTERVAL c.DurasiCycle DAY) AS nextHarvestDate
      FROM Cycle c
      JOIN Kandang k ON c.KodeCycle = k.KodeCycle
      WHERE k.KodePeternakan = :kodePeternakan
        AND DATE_ADD(c.TanggalMulai, INTERVAL c.DurasiCycle DAY) >= CURDATE()
      ORDER BY DATE_ADD(c.TanggalMulai, INTERVAL c.DurasiCycle DAY) ASC
      LIMIT 1
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: {
        totalPopulasi: parseInt(summaryResult?.totalPopulasi) || 0,
        totalKandang: parseInt(summaryResult?.totalKandang) || 0,
        avgSuhu: parseFloat(summaryResult?.avgSuhu) || 0,
        pendingOrders: parseInt(ordersResult?.pendingOrders) || 0,
        feedIntakeChange: parseFloat(feedResult?.feedIntakeChange) || 0,
        nextHarvestDate: harvestResult?.nextHarvestDate || null,
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard summary'
    });
  }
});

// GET /api/dashboard/kandang-stats - Get status per kandang
router.get('/kandang-stats', async (req, res) => {
  try {
    const kodePeternakan = req.user.kodePeternakan;
    const { cycle } = req.query;

    let cycleCondition = cycle ? `AND k.KodeCycle = ${sequelize.escape(cycle)}` : '';

    const kandangStats = await sequelize.query(`
      SELECT 
        k.KodeKandang,
        k.SuhuKandang as suhu,
        c.KodeCycle,
        c.TanggalMulai,
        c.SisaHariPanen,
        COALESCE(latestStatus.Populasi, 0) AS populasi,
        COALESCE(latestStatus.UmurAyam, 0) AS umurAyam,
        COALESCE(latestStatus.BeratRataRata, 0) AS beratRataRata,
        latestStatus.TanggalPemeriksaan,
        CASE 
          WHEN latestStatus.Populasi IS NULL THEN 'Persiapan'
          WHEN k.SuhuKandang > 32 OR k.SuhuKandang < 26 THEN 'Perlu Pantau'
          ELSE 'Stabil'
        END AS status
      FROM Kandang k
      LEFT JOIN Cycle c ON k.KodeCycle = c.KodeCycle
      LEFT JOIN (
        SELECT sk.KodeKandang, sk.Populasi, sk.UmurAyam, sk.BeratRataRata, sk.TanggalPemeriksaan
        FROM StatusKandang sk
        INNER JOIN (
          SELECT KodeKandang, MAX(TanggalPemeriksaan) AS MaxDate
          FROM StatusKandang
          GROUP BY KodeKandang
        ) latest ON sk.KodeKandang = latest.KodeKandang AND sk.TanggalPemeriksaan = latest.MaxDate
      ) latestStatus ON k.KodeKandang = latestStatus.KodeKandang
      WHERE k.KodePeternakan = :kodePeternakan ${cycleCondition}
      ORDER BY k.KodeKandang
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: kandangStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Kandang stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get kandang stats'
    });
  }
});

// GET /api/dashboard/mortality - Get mortality KPI
router.get('/mortality', async (req, res) => {
  try {
    const kodePeternakan = req.user.kodePeternakan;
    const { kandang } = req.query;

    let kandangCondition = kandang ? `AND sm.KodeKandang = ${sequelize.escape(kandang)}` : '';

    const mortalityData = await sequelize.query(`
      SELECT 
        sm.KodeKandang,
        SUM(sm.JumlahMati) AS totalMati,
        SUM(sm.JumlahReject) AS totalReject,
        MAX(sm.TanggalKejadian) AS lastMortalityDate,
        COALESCE(doc.JumlahDiterima, 0) AS initialPopulasi,
        ROUND(
          (SUM(sm.JumlahMati) / NULLIF(doc.JumlahDiterima, 0)) * 100,
          2
        ) AS mortalityRate
      FROM StatusKematian sm
      JOIN Kandang k ON sm.KodeKandang = k.KodeKandang
      LEFT JOIN DOC doc ON doc.KodeKandang = k.KodeKandang
      WHERE k.KodePeternakan = :kodePeternakan ${kandangCondition}
      GROUP BY sm.KodeKandang, doc.JumlahDiterima
      ORDER BY mortalityRate DESC
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: mortalityData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Mortality KPI error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mortality data'
    });
  }
});

// GET /api/dashboard/feed-usage - Get feed usage statistics
router.get('/feed-usage', async (req, res) => {
  try {
    const kodePeternakan = req.user.kodePeternakan;
    const { kandang, period = 'daily' } = req.query;

    let kandangCondition = kandang ? `AND pf.KodeKandang = ${sequelize.escape(kandang)}` : '';

    let dateGrouping;
    switch (period) {
      case 'weekly':
        dateGrouping = 'YEARWEEK(pf.TanggalPemakaian)';
        break;
      case 'monthly':
        dateGrouping = 'DATE_FORMAT(pf.TanggalPemakaian, "%Y-%m")';
        break;
      default:
        dateGrouping = 'pf.TanggalPemakaian';
    }

    const feedData = await sequelize.query(`
      SELECT 
        ${dateGrouping} AS period,
        pf.TanggalPemakaian AS date,
        SUM(df.JumlahPakan) AS totalPakan
      FROM PemakaianFeed pf
      JOIN DetailFeed df ON pf.KodePemakaianFeed = df.KodePemakaianFeed
      JOIN Kandang k ON pf.KodeKandang = k.KodeKandang
      WHERE k.KodePeternakan = :kodePeternakan 
        AND pf.TanggalPemakaian >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        ${kandangCondition}
      GROUP BY ${dateGrouping}, pf.TanggalPemakaian
      ORDER BY pf.TanggalPemakaian DESC
      LIMIT 30
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: feedData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Feed usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feed usage data'
    });
  }
});

// GET /api/dashboard/performance - Get performance KPI
router.get('/performance', async (req, res) => {
  try {
    const kodePeternakan = req.user.kodePeternakan;
    const { kandang } = req.query;

    let kandangCondition = kandang ? `AND p.KodeKandang = ${sequelize.escape(kandang)}` : '';

    const performanceData = await sequelize.query(`
      SELECT 
        p.KodeKandang,
        AVG(p.ActualAverageDailyGain) AS avgADG,
        AVG(p.ActualFeedIntake) AS avgFeedIntake,
        AVG(p.ActualWaterIntake) AS avgWaterIntake,
        MAX(p.TanggalPerformance) AS lastRecordDate
      FROM Performance p
      JOIN Kandang k ON p.KodeKandang = k.KodeKandang
      WHERE k.KodePeternakan = :kodePeternakan ${kandangCondition}
      GROUP BY p.KodeKandang
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: performanceData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Performance KPI error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get performance data'
    });
  }
});

// GET /api/dashboard/harvest-estimate - Get harvest estimates
router.get('/harvest-estimate', async (req, res) => {
  try {
    const kodePeternakan = req.user.kodePeternakan;

    const harvestData = await sequelize.query(`
      SELECT 
        k.KodeKandang,
        c.KodeCycle,
        c.TanggalMulai,
        c.DurasiCycle,
        c.SisaHariPanen,
        DATE_ADD(c.TanggalMulai, INTERVAL c.DurasiCycle DAY) AS estimatedHarvestDate,
        COALESCE(latestStatus.Populasi, 0) AS currentPopulasi,
        COALESCE(latestStatus.BeratRataRata, 0) AS estimatedWeight
      FROM Kandang k
      JOIN Cycle c ON k.KodeCycle = c.KodeCycle
      LEFT JOIN (
        SELECT sk.KodeKandang, sk.Populasi, sk.BeratRataRata
        FROM StatusKandang sk
        INNER JOIN (
          SELECT KodeKandang, MAX(TanggalPemeriksaan) AS MaxDate
          FROM StatusKandang
          GROUP BY KodeKandang
        ) latest ON sk.KodeKandang = latest.KodeKandang AND sk.TanggalPemeriksaan = latest.MaxDate
      ) latestStatus ON k.KodeKandang = latestStatus.KodeKandang
      WHERE k.KodePeternakan = :kodePeternakan
        AND DATE_ADD(c.TanggalMulai, INTERVAL c.DurasiCycle DAY) >= CURDATE()
      ORDER BY DATE_ADD(c.TanggalMulai, INTERVAL c.DurasiCycle DAY) ASC
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: harvestData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Harvest estimate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get harvest estimates'
    });
  }
});

// GET /api/dashboard/pending-orders - Get pending orders count
router.get('/pending-orders', async (req, res) => {
  try {
    const kodePeternakan = req.user.kodePeternakan;

    const [result] = await sequelize.query(`
      SELECT COUNT(*) AS count
      FROM Orders
      WHERE KodePeternakan = :kodePeternakan AND StatusOrder = 'PROSES'
    `, {
      replacements: { kodePeternakan },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: { count: parseInt(result?.count) || 0 },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Pending orders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending orders'
    });
  }
});

// GET /api/dashboard/activities - Get recent activities
router.get('/activities', async (req, res) => {
  try {
    const kodePeternakan = req.user.kodePeternakan;
    const limit = parseInt(req.query.limit) || 5;

    // Combine recent activities from different tables
    const activities = await sequelize.query(`
      (SELECT 
        'ORDER' AS type,
        CONCAT('Order ', o.KodeOrder, ' - ', o.StatusOrder) AS description,
        o.TanggalOrder AS date
      FROM Orders o
      WHERE o.KodePeternakan = :kodePeternakan
      ORDER BY o.TanggalOrder DESC
      LIMIT 3)
      UNION ALL
      (SELECT 
        'MORTALITY' AS type,
        CONCAT('Kematian di ', sm.KodeKandang, ': ', sm.JumlahMati, ' ekor') AS description,
        sm.TanggalKejadian AS date
      FROM StatusKematian sm
      JOIN Kandang k ON sm.KodeKandang = k.KodeKandang
      WHERE k.KodePeternakan = :kodePeternakan
      ORDER BY sm.TanggalKejadian DESC
      LIMIT 3)
      ORDER BY date DESC
      LIMIT :limit
    `, {
      replacements: { kodePeternakan, limit },
      type: sequelize.QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: activities,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get activities'
    });
  }
});

module.exports = router;
