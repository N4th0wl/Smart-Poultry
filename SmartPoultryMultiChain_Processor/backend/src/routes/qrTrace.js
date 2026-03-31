const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { BlockchainIdentity, LedgerProcessor, Order, Produksi, Pengiriman, sequelize } = require('../models');
const crossChain = require('../config/crossChainDatabase');
const blockchain = require('../utils/blockchain');

// ============================================================================
// PUBLIC QR TRACEABILITY ENDPOINTS (No Auth Required)
// These endpoints are accessed by customers who scan the QR code on packaging
// ============================================================================

/**
 * GET /api/qr-trace/data/:kodeOrder
 * Returns full unified supply chain traceability data for public access
 * This is what the customer-facing web page uses to display chain info
 */
router.get('/data/:kodeOrder', async (req, res) => {
    try {
        const { kodeOrder } = req.params;

        // Find the order
        const order = await Order.findOne({ where: { KodeOrder: kodeOrder } });
        if (!order) {
            return res.status(404).json({ message: 'Produk tidak ditemukan.', found: false });
        }

        // Find blockchain identity
        const identity = await BlockchainIdentity.findOne({ where: { IdOrder: order.IdOrder } });
        if (!identity) {
            return res.status(404).json({ message: 'Data blockchain belum tersedia untuk produk ini.', found: false });
        }

        // Get processor chain traceability
        const traceData = await blockchain.getTraceabilityData(sequelize, identity.IdIdentity);

        // Get unified cross-chain data
        let unifiedData = null;
        try {
            unifiedData = await crossChain.getUnifiedChainByOrder(sequelize, identity.IdIdentity);
        } catch (e) {
            console.log('Unified data not available:', e.message);
        }

        // Get production data
        const produksi = await Produksi.findOne({
            where: { IdOrder: order.IdOrder },
            order: [['CreatedAt', 'DESC']],
        });

        // Get shipment data
        let pengiriman = null;
        if (produksi) {
            pengiriman = await Pengiriman.findOne({
                where: { IdProduksi: produksi.IdProduksi },
                order: [['CreatedAt', 'DESC']],
            });
        }

        // Fetch farm care data (feeding & medication) from peternakan database
        let farmCare = null;
        try {
            const peternakanConn = crossChain.getPeternakanConnection();
            if (peternakanConn) {
                // Get feeding records
                const [feedData] = await peternakanConn.query(`
                    SELECT pf.TanggalPemakaian, df.JumlahPakan, p.NamaPerlengkapan AS NamaPakan, p.Satuan
                    FROM pemakaianfeed pf
                    JOIN detailfeed df ON pf.KodePemakaianFeed = df.KodePemakaianFeed
                    JOIN perlengkapan p ON df.KodePerlengkapan = p.KodePerlengkapan
                    ORDER BY pf.TanggalPemakaian DESC
                `);

                // Get medication records
                const [obatData] = await peternakanConn.query(`
                    SELECT po.TanggalPenggunaan, po.JumlahObat, p.NamaPerlengkapan AS NamaObat, 
                           mo.JenisObat, mo.Dosis, mo.TanggalKadaluarsa, p.Satuan
                    FROM pemakaianobat po
                    JOIN masterobat mo ON po.KodePerlengkapan = mo.KodePerlengkapan
                    JOIN perlengkapan p ON po.KodePerlengkapan = p.KodePerlengkapan
                    ORDER BY po.TanggalPenggunaan DESC
                `);

                farmCare = {
                    feeding: feedData.map(f => ({
                        tanggal: f.TanggalPemakaian,
                        namaPakan: f.NamaPakan,
                        jumlah: f.JumlahPakan,
                        satuan: f.Satuan,
                    })),
                    medication: obatData.map(o => ({
                        tanggal: o.TanggalPenggunaan,
                        namaObat: o.NamaObat,
                        jenisObat: o.JenisObat,
                        dosis: o.Dosis,
                        jumlah: o.JumlahObat,
                        satuan: o.Satuan,
                        kadaluarsa: o.TanggalKadaluarsa,
                    })),
                    summary: {
                        totalFeeding: feedData.length,
                        totalMedication: obatData.length,
                        feedTypes: [...new Set(feedData.map(f => f.NamaPakan))],
                        medicationTypes: [...new Set(obatData.map(o => o.JenisObat))],
                        usesAntibiotics: obatData.some(o => o.JenisObat?.toLowerCase().includes('antibiotik')),
                    },
                };
            }
        } catch (farmErr) {
            console.log('Farm care data not available:', farmErr.message);
        }

        // Build comprehensive public trace response
        const response = {
            found: true,
            product: {
                kodeOrder: order.KodeOrder,
                jenisAyam: order.JenisAyam,
                namaPeternakan: order.NamaPeternakan,
                alamatPeternakan: order.AlamatPeternakan,
                tanggalOrder: order.TanggalOrder,
                jumlahPesanan: order.JumlahPesanan,
                satuan: order.Satuan,
                statusOrder: order.StatusOrder,
            },
            farmCare,
            production: produksi ? {
                kodeProduksi: produksi.KodeProduksi,
                tanggalProduksi: produksi.TanggalProduksi,
                jenisAyam: produksi.JenisAyam,
                jumlahInput: produksi.JumlahInput,
                jumlahOutput: produksi.JumlahOutput,
                beratTotal: produksi.BeratTotal,
                varian: produksi.Varian,
                sertifikatHalal: produksi.SertifikatHalal,
                statusProduksi: produksi.StatusProduksi,
            } : null,
            shipment: pengiriman ? {
                kodePengiriman: pengiriman.KodePengiriman,
                tujuanPengiriman: pengiriman.TujuanPengiriman,
                namaPenerima: pengiriman.NamaPenerima,
                tanggalKirim: pengiriman.TanggalKirim,
                tanggalSampai: pengiriman.TanggalSampai,
                jumlahKirim: pengiriman.JumlahKirim,
                beratKirim: pengiriman.BeratKirim,
                metodePengiriman: pengiriman.MetodePengiriman,
                statusPengiriman: pengiriman.StatusPengiriman,
            } : null,
            blockchain: {
                processorChain: traceData ? {
                    kodeIdentity: traceData.chain.kodeIdentity,
                    statusChain: traceData.chain.statusChain,
                    totalBlocks: traceData.chain.totalBlocks,
                    genesisDate: traceData.chain.createdAt,
                    completedAt: traceData.chain.completedAt,
                    farmLink: traceData.chain.farmLink,
                    validation: traceData.validation,
                    timeline: traceData.timeline,
                    blocks: traceData.blocks.map(b => {
                        let payload = b.DataPayload;
                        if (typeof payload === 'string') {
                            try { payload = JSON.parse(payload); } catch (e) { /* */ }
                        }
                        return {
                            index: b.BlockIndex,
                            type: b.TipeBlock,
                            hash: b.CurrentHash,
                            previousHash: b.PreviousHash,
                            timestamp: b.CreatedAt,
                            status: b.StatusBlock,
                            data: payload,
                        };
                    }),
                } : null,
                unified: unifiedData ? {
                    supplyChainNodes: unifiedData.supplyChainNodes,
                    unifiedTimeline: unifiedData.unifiedTimeline.map(t => ({
                        node: t.node,
                        nodeLabel: t.nodeLabel,
                        nodeColor: t.nodeColor,
                        segment: t.segment,
                        segmentLabel: t.segmentLabel,
                        tipeBlock: t.TipeBlock,
                        hash: t.CurrentHash?.substring(0, 16),
                        timestamp: t.timestamp || t.CreatedAt,
                    })),
                    connectionStatus: unifiedData.connectionStatus,
                } : null,
            },
        };

        res.json(response);
    } catch (error) {
        console.error('QR Trace data error:', error);
        res.status(500).json({ message: 'Gagal mengambil data traceability.', found: false });
    }
});

/**
 * GET /api/qr-trace/generate/:kodeOrder
 * Generates a QR code image (PNG base64) that points to the public traceability page
 */
router.get('/generate/:kodeOrder', async (req, res) => {
    try {
        const { kodeOrder } = req.params;

        // Verify the order exists
        const order = await Order.findOne({ where: { KodeOrder: kodeOrder } });
        if (!order) {
            return res.status(404).json({ message: 'Order tidak ditemukan.' });
        }

        // Generate the traceability URL
        const clientOrigin = req.query.origin || process.env.CLIENT_ORIGIN || 'http://localhost:5175';
        const traceUrl = `${clientOrigin}/trace/${kodeOrder}`;

        // Generate QR code as base64 PNG
        const qrDataUrl = await QRCode.toDataURL(traceUrl, {
            width: 400,
            margin: 2,
            color: {
                dark: '#2C1810',
                light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H',
        });

        res.json({
            kodeOrder,
            traceUrl,
            qrCode: qrDataUrl,
            jenisAyam: order.JenisAyam,
            namaPeternakan: order.NamaPeternakan,
        });
    } catch (error) {
        console.error('QR generate error:', error);
        res.status(500).json({ message: 'Gagal membuat QR code.' });
    }
});

/**
 * GET /api/qr-trace/generate-image/:kodeOrder
 * Returns the QR code as a PNG image directly (for embedding/printing)
 */
router.get('/generate-image/:kodeOrder', async (req, res) => {
    try {
        const { kodeOrder } = req.params;

        const order = await Order.findOne({ where: { KodeOrder: kodeOrder } });
        if (!order) {
            return res.status(404).send('Order not found');
        }

        const clientOrigin = req.query.origin || process.env.CLIENT_ORIGIN || 'http://localhost:5175';
        const traceUrl = `${clientOrigin}/trace/${kodeOrder}`;

        const qrBuffer = await QRCode.toBuffer(traceUrl, {
            width: 600,
            margin: 2,
            color: {
                dark: '#2C1810',
                light: '#FFFFFF',
            },
            errorCorrectionLevel: 'H',
        });

        res.set('Content-Type', 'image/png');
        res.set('Content-Disposition', `inline; filename="qr-${kodeOrder}.png"`);
        res.send(qrBuffer);
    } catch (error) {
        console.error('QR image error:', error);
        res.status(500).send('Failed to generate QR code');
    }
});

module.exports = router;
