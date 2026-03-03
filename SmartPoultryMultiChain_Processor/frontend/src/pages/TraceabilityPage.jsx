import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// ============================================================================
// ICONS (inline SVG for zero dependencies)
// ============================================================================
const Icons = {
    farm: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" />
        </svg>
    ),
    truck: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
    ),
    factory: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h20" /><path d="M6 20V8l4 2V8l4 2V8l4 2v12" />
        </svg>
    ),
    store: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l1-4h16l1 4" /><path d="M3 9h18v12H3z" /><path d="M9 21V14h6v7" />
        </svg>
    ),
    shield: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
        </svg>
    ),
    chain: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="5" width="8" height="14" rx="2" /><rect x="15" y="5" width="8" height="14" rx="2" /><line x1="9" y1="12" x2="15" y2="12" />
        </svg>
    ),
    check: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    ),
    clock: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
    ),
    hash: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" /><line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
        </svg>
    ),
    warning: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    halal: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M8 12l2 2 4-4" />
        </svg>
    ),
    box: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
    ),
}

// ============================================================================
// BLOCK TYPE CONFIG
// ============================================================================
const BLOCK_TYPE_CONFIG = {
    GENESIS: { label: 'Genesis', icon: '🌱', color: '#10b981' },
    DAILY_RECORD: { label: 'Catatan Harian', icon: '📋', color: '#3b82f6' },
    HEALTH_CHECK: { label: 'Pemeriksaan Kesehatan', icon: '🩺', color: '#06b6d4' },
    VACCINATION: { label: 'Vaksinasi', icon: '💉', color: '#8b5cf6' },
    FEEDING: { label: 'Pemberian Pakan', icon: '🌾', color: '#f59e0b' },
    HARVEST: { label: 'Panen', icon: '🎯', color: '#ef4444' },
    TRANSFER: { label: 'Transfer', icon: '📦', color: '#6366f1' },
    RECEIVE_FROM_FARM: { label: 'Diterima dari Peternakan', icon: '📥', color: '#10b981' },
    NOTA_PENERIMAAN: { label: 'Nota Penerimaan', icon: '📝', color: '#0ea5e9' },
    PROCESSING: { label: 'Pemrosesan', icon: '⚙️', color: '#8b5cf6' },
    HALAL_CHECK: { label: 'Sertifikasi Halal', icon: '☪️', color: '#059669' },
    QUALITY_CHECK: { label: 'Quality Control', icon: '✅', color: '#3b82f6' },
    LAPORAN_MASALAH: { label: 'Laporan Masalah', icon: '⚠️', color: '#ef4444' },
    TRANSFER_TO_RETAIL: { label: 'Dikirim ke Retail', icon: '🚚', color: '#f59e0b' },
    PICKUP_FROM_SENDER: { label: 'Dijemput dari Pengirim', icon: '📦', color: '#10b981' },
    DEPARTURE: { label: 'Keberangkatan', icon: '🚛', color: '#3b82f6' },
    CHECKPOINT: { label: 'Checkpoint', icon: '📍', color: '#f59e0b' },
    ARRIVAL: { label: 'Tiba di Tujuan', icon: '🏁', color: '#8b5cf6' },
    DELIVERY_CONFIRMED: { label: 'Pengiriman Dikonfirmasi', icon: '✅', color: '#059669' },
    RECEIVE_FROM_PROCESSOR: { label: 'Diterima dari Processor', icon: '📥', color: '#10b981' },
    STOCK_REGISTERED: { label: 'Stok Terdaftar', icon: '📊', color: '#3b82f6' },
    DISPLAY_READY: { label: 'Siap Display', icon: '🏪', color: '#8b5cf6' },
    SOLD: { label: 'Terjual', icon: '💰', color: '#059669' },
}

const SEGMENT_CONFIG = {
    1: { label: 'Peternakan', icon: Icons.farm, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
    2: { label: 'Kurir (Leg 1)', icon: Icons.truck, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    3: { label: 'Processor', icon: Icons.factory, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    4: { label: 'Kurir (Leg 2)', icon: Icons.truck, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
    5: { label: 'Retailer', icon: Icons.store, color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function formatDate(dateStr) {
    if (!dateStr) return '-'
    try {
        const d = new Date(dateStr)
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return dateStr }
}

function formatDateTime(dateStr) {
    if (!dateStr) return '-'
    try {
        const d = new Date(dateStr)
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    } catch { return dateStr }
}

function truncHash(hash) {
    if (!hash) return '-'
    return hash.substring(0, 8) + '...' + hash.substring(hash.length - 8)
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TraceabilityPage() {
    const { kodeOrder } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('overview')
    const [expandedBlock, setExpandedBlock] = useState(null)

    useEffect(() => {
        async function fetchTrace() {
            try {
                setLoading(true)
                const res = await axios.get(`${API_BASE}/qr-trace/data/${kodeOrder}`)
                setData(res.data)
            } catch (err) {
                setError(err.response?.data?.message || 'Produk tidak ditemukan atau data belum tersedia.')
            } finally {
                setLoading(false)
            }
        }
        if (kodeOrder) fetchTrace()
    }, [kodeOrder])

    // Compute chain data
    const chainValid = useMemo(() => {
        if (!data?.blockchain?.processorChain?.validation) return null
        return data.blockchain.processorChain.validation.valid
    }, [data])

    const supplyChainNodes = useMemo(() => {
        return data?.blockchain?.unified?.supplyChainNodes || []
    }, [data])

    const totalBlocks = useMemo(() => {
        return data?.blockchain?.unified?.unifiedTimeline?.length ||
            data?.blockchain?.processorChain?.totalBlocks || 0
    }, [data])

    // ============================================================================
    // LOADING STATE
    // ============================================================================
    if (loading) {
        return (
            <div className="trace-page">
                <div className="trace-loading">
                    <div className="trace-loading-spinner" />
                    <p className="trace-loading-text">Memuat data traceability...</p>
                    <p className="trace-loading-sub">Menghubungkan ke multichain blockchain</p>
                </div>
            </div>
        )
    }

    // ============================================================================
    // ERROR STATE
    // ============================================================================
    if (error || !data?.found) {
        return (
            <div className="trace-page">
                <div className="trace-error">
                    <div className="trace-error-icon">{Icons.warning}</div>
                    <h2>Data Tidak Ditemukan</h2>
                    <p>{error || 'Produk tidak ditemukan dalam sistem blockchain.'}</p>
                    <div className="trace-error-code">Kode: {kodeOrder}</div>
                </div>
            </div>
        )
    }

    // ============================================================================
    // DATA AVAILABLE
    // ============================================================================
    return (
        <div className="trace-page">
            {/* HERO HEADER */}
            <header className="trace-hero">
                <div className="trace-hero-bg" />
                <div className="trace-hero-content">
                    <div className="trace-hero-badge">
                        <span className="trace-hero-badge-icon">{Icons.shield}</span>
                        <span>Blockchain Verified</span>
                    </div>
                    <h1 className="trace-hero-title">Jejak Produk Telusur</h1>
                    <p className="trace-hero-subtitle">
                        Transparansi penuh dari peternakan hingga ke tangan Anda
                    </p>
                    <div className="trace-hero-meta">
                        <div className="trace-hero-meta-item">
                            <span className="trace-hero-meta-label">Kode Produk</span>
                            <span className="trace-hero-meta-value">{data.product.kodeOrder}</span>
                        </div>
                        <div className="trace-hero-meta-divider" />
                        <div className="trace-hero-meta-item">
                            <span className="trace-hero-meta-label">Jenis Ayam</span>
                            <span className="trace-hero-meta-value">{data.product.jenisAyam}</span>
                        </div>
                        <div className="trace-hero-meta-divider" />
                        <div className="trace-hero-meta-item">
                            <span className="trace-hero-meta-label">Status Chain</span>
                            <span className={`trace-hero-meta-value trace-status ${chainValid ? 'valid' : 'pending'}`}>
                                {chainValid ? '✓ Terverifikasi' : '⏳ Aktif'}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* SUPPLY CHAIN VISUAL */}
            <section className="trace-section">
                <div className="trace-container">
                    <h2 className="trace-section-title">
                        <span className="trace-section-icon">{Icons.chain}</span>
                        Rantai Pasok — Supply Chain
                    </h2>
                    <div className="trace-chain-flow">
                        {[1, 2, 3, 4, 5].map((seg, i) => {
                            const node = supplyChainNodes.find(n => n.segment === seg)
                            const cfg = SEGMENT_CONFIG[seg]
                            const isConnected = node?.connected
                            return (
                                <div key={seg} className="trace-chain-item-wrapper">
                                    <div className={`trace-chain-node ${isConnected ? 'connected' : 'disconnected'}`}
                                        style={{ '--node-color': cfg.color, '--node-gradient': cfg.gradient }}>
                                        <div className="trace-chain-node-icon">{cfg.icon}</div>
                                        <div className="trace-chain-node-label">{cfg.label}</div>
                                        <div className="trace-chain-node-status">
                                            {isConnected ? (
                                                <>
                                                    <span className="trace-chain-status-dot connected" />
                                                    <span>{node.totalBlocks} blok</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="trace-chain-status-dot disconnected" />
                                                    <span>Belum terhubung</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {i < 4 && (
                                        <div className={`trace-chain-connector ${isConnected && supplyChainNodes.find(n => n.segment === seg + 1)?.connected ? 'active' : ''}`}>
                                            <div className="trace-chain-connector-line" />
                                            <div className="trace-chain-connector-arrow">→</div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* TABS */}
            <section className="trace-section">
                <div className="trace-container">
                    <div className="trace-tabs">
                        {[
                            { id: 'overview', label: 'Ringkasan', icon: Icons.box },
                            { id: 'timeline', label: 'Timeline', icon: Icons.clock },
                            { id: 'blocks', label: 'Blockchain', icon: Icons.hash },
                        ].map(tab => (
                            <button key={tab.id} className={`trace-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}>
                                <span className="trace-tab-icon">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* OVERVIEW TAB */}
                    {activeTab === 'overview' && (
                        <div className="trace-tab-content trace-fade-in">
                            {/* Product Info */}
                            <div className="trace-info-grid">
                                <div className="trace-info-card">
                                    <div className="trace-info-card-header" style={{ '--card-accent': '#10b981' }}>
                                        <span className="trace-info-card-icon">{Icons.farm}</span>
                                        <h3>Asal Peternakan</h3>
                                    </div>
                                    <div className="trace-info-card-body">
                                        <div className="trace-info-row">
                                            <span className="trace-info-label">Nama Peternakan</span>
                                            <span className="trace-info-value">{data.product.namaPeternakan || '-'}</span>
                                        </div>
                                        <div className="trace-info-row">
                                            <span className="trace-info-label">Alamat</span>
                                            <span className="trace-info-value">{data.product.alamatPeternakan || '-'}</span>
                                        </div>
                                        <div className="trace-info-row">
                                            <span className="trace-info-label">Tanggal Order</span>
                                            <span className="trace-info-value">{formatDate(data.product.tanggalOrder)}</span>
                                        </div>
                                        <div className="trace-info-row">
                                            <span className="trace-info-label">Jumlah Pesanan</span>
                                            <span className="trace-info-value">{data.product.jumlahPesanan} {data.product.satuan}</span>
                                        </div>
                                    </div>
                                </div>

                                {data.production && (
                                    <div className="trace-info-card">
                                        <div className="trace-info-card-header" style={{ '--card-accent': '#8b5cf6' }}>
                                            <span className="trace-info-card-icon">{Icons.factory}</span>
                                            <h3>Data Produksi</h3>
                                        </div>
                                        <div className="trace-info-card-body">
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Kode Produksi</span>
                                                <span className="trace-info-value mono">{data.production.kodeProduksi}</span>
                                            </div>
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Tanggal Produksi</span>
                                                <span className="trace-info-value">{formatDate(data.production.tanggalProduksi)}</span>
                                            </div>
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Jumlah Output</span>
                                                <span className="trace-info-value">{data.production.jumlahOutput} ekor</span>
                                            </div>
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Berat Total</span>
                                                <span className="trace-info-value">{data.production.beratTotal} kg</span>
                                            </div>
                                            {data.production.varian && (
                                                <div className="trace-info-row">
                                                    <span className="trace-info-label">Varian</span>
                                                    <span className="trace-info-value">{data.production.varian}</span>
                                                </div>
                                            )}
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Sertifikat Halal</span>
                                                <span className={`trace-badge ${data.production.sertifikatHalal === 'ADA' ? 'success' : 'muted'}`}>
                                                    {data.production.sertifikatHalal === 'ADA' ? '☪️ Tersertifikasi Halal' : 'Belum Tersertifikasi'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {data.shipment && (
                                    <div className="trace-info-card">
                                        <div className="trace-info-card-header" style={{ '--card-accent': '#f59e0b' }}>
                                            <span className="trace-info-card-icon">{Icons.truck}</span>
                                            <h3>Data Pengiriman</h3>
                                        </div>
                                        <div className="trace-info-card-body">
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Kode Pengiriman</span>
                                                <span className="trace-info-value mono">{data.shipment.kodePengiriman}</span>
                                            </div>
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Tujuan</span>
                                                <span className="trace-info-value">{data.shipment.tujuanPengiriman}</span>
                                            </div>
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Tanggal Kirim</span>
                                                <span className="trace-info-value">{formatDate(data.shipment.tanggalKirim)}</span>
                                            </div>
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Jumlah Kirim</span>
                                                <span className="trace-info-value">{data.shipment.jumlahKirim} ekor</span>
                                            </div>
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Metode</span>
                                                <span className="trace-info-value">{data.shipment.metodePengiriman?.replace(/_/g, ' ')}</span>
                                            </div>
                                            <div className="trace-info-row">
                                                <span className="trace-info-label">Status</span>
                                                <span className={`trace-badge ${data.shipment.statusPengiriman === 'TERKIRIM' ? 'success' : 'info'}`}>
                                                    {data.shipment.statusPengiriman?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Blockchain Summary */}
                                <div className="trace-info-card blockchain-card">
                                    <div className="trace-info-card-header" style={{ '--card-accent': '#6366f1' }}>
                                        <span className="trace-info-card-icon">{Icons.chain}</span>
                                        <h3>Integritas Blockchain</h3>
                                    </div>
                                    <div className="trace-info-card-body">
                                        <div className="trace-blockchain-stat-row">
                                            <div className="trace-blockchain-stat">
                                                <span className="trace-blockchain-stat-value">{totalBlocks}</span>
                                                <span className="trace-blockchain-stat-label">Total Blok</span>
                                            </div>
                                            <div className="trace-blockchain-stat">
                                                <span className="trace-blockchain-stat-value">{supplyChainNodes.filter(n => n.connected).length}/5</span>
                                                <span className="trace-blockchain-stat-label">Node Terhubung</span>
                                            </div>
                                            <div className="trace-blockchain-stat">
                                                <span className={`trace-blockchain-stat-value ${chainValid ? 'valid' : ''}`}>
                                                    {chainValid ? '✓' : '⏳'}
                                                </span>
                                                <span className="trace-blockchain-stat-label">Verifikasi</span>
                                            </div>
                                        </div>
                                        {data.blockchain?.processorChain && (
                                            <div className="trace-hash-display">
                                                <div className="trace-info-row">
                                                    <span className="trace-info-label">Genesis Hash</span>
                                                    <span className="trace-info-value mono small">
                                                        {truncHash(data.blockchain.processorChain.blocks?.[0]?.hash)}
                                                    </span>
                                                </div>
                                                <div className="trace-info-row">
                                                    <span className="trace-info-label">Latest Hash</span>
                                                    <span className="trace-info-value mono small">
                                                        {truncHash(data.blockchain.processorChain.blocks?.[data.blockchain.processorChain.blocks.length - 1]?.hash)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TIMELINE TAB */}
                    {activeTab === 'timeline' && (
                        <div className="trace-tab-content trace-fade-in">
                            <div className="trace-timeline">
                                {(data.blockchain?.unified?.unifiedTimeline || data.blockchain?.processorChain?.timeline || []).map((event, i) => {
                                    const blockType = event.tipeBlock || event.type
                                    const cfg = BLOCK_TYPE_CONFIG[blockType] || { label: blockType, icon: '📦', color: '#6b7280' }
                                    const segCfg = SEGMENT_CONFIG[event.segment] || {}
                                    return (
                                        <div key={i} className="trace-timeline-item" style={{ '--timeline-color': segCfg.color || cfg.color }}>
                                            <div className="trace-timeline-marker">
                                                <div className="trace-timeline-dot" />
                                                {i < (data.blockchain?.unified?.unifiedTimeline || data.blockchain?.processorChain?.timeline || []).length - 1 && (
                                                    <div className="trace-timeline-line" />
                                                )}
                                            </div>
                                            <div className="trace-timeline-content">
                                                <div className="trace-timeline-header">
                                                    <span className="trace-timeline-icon">{cfg.icon}</span>
                                                    <span className="trace-timeline-label">{cfg.label}</span>
                                                    {event.segmentLabel && (
                                                        <span className="trace-timeline-segment" style={{ background: `${segCfg.color || '#6b7280'}20`, color: segCfg.color || '#6b7280' }}>
                                                            {event.segmentLabel || event.nodeLabel}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="trace-timeline-details">
                                                    <span className="trace-timeline-time">{formatDateTime(event.timestamp)}</span>
                                                    {event.hash && (
                                                        <span className="trace-timeline-hash mono">{typeof event.hash === 'string' ? event.hash.substring(0, 12) : ''}...</span>
                                                    )}
                                                </div>
                                                {event.summary && <p className="trace-timeline-summary">{event.summary}</p>}
                                            </div>
                                        </div>
                                    )
                                })}
                                {(data.blockchain?.unified?.unifiedTimeline || data.blockchain?.processorChain?.timeline || []).length === 0 && (
                                    <div className="trace-empty">Belum ada event timeline</div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* BLOCKS TAB */}
                    {activeTab === 'blocks' && (
                        <div className="trace-tab-content trace-fade-in">
                            <div className="trace-blocks">
                                {(data.blockchain?.processorChain?.blocks || []).map((block, i) => {
                                    const cfg = BLOCK_TYPE_CONFIG[block.type] || { label: block.type, icon: '📦', color: '#6b7280' }
                                    const isExpanded = expandedBlock === i
                                    return (
                                        <div key={i} className={`trace-block ${isExpanded ? 'expanded' : ''}`}
                                            style={{ '--block-color': cfg.color }}>
                                            <div className="trace-block-header" onClick={() => setExpandedBlock(isExpanded ? null : i)}>
                                                <div className="trace-block-index">#{block.index}</div>
                                                <div className="trace-block-info">
                                                    <span className="trace-block-type">
                                                        <span className="trace-block-type-icon">{cfg.icon}</span>
                                                        {cfg.label}
                                                    </span>
                                                    <span className="trace-block-hash mono">{truncHash(block.hash)}</span>
                                                </div>
                                                <div className="trace-block-time">{formatDateTime(block.timestamp)}</div>
                                                <div className={`trace-block-chevron ${isExpanded ? 'open' : ''}`}>▼</div>
                                            </div>
                                            {isExpanded && (
                                                <div className="trace-block-body trace-fade-in">
                                                    <div className="trace-block-detail">
                                                        <span className="trace-block-detail-label">Previous Hash</span>
                                                        <span className="trace-block-detail-value mono">{truncHash(block.previousHash)}</span>
                                                    </div>
                                                    <div className="trace-block-detail">
                                                        <span className="trace-block-detail-label">Current Hash</span>
                                                        <span className="trace-block-detail-value mono">{truncHash(block.hash)}</span>
                                                    </div>
                                                    <div className="trace-block-detail">
                                                        <span className="trace-block-detail-label">Status</span>
                                                        <span className={`trace-badge ${block.status === 'VALIDATED' ? 'success' : 'warning'}`}>{block.status}</span>
                                                    </div>
                                                    {block.data && typeof block.data === 'object' && (
                                                        <div className="trace-block-payload">
                                                            <span className="trace-block-detail-label">Data Payload</span>
                                                            <div className="trace-block-payload-content">
                                                                {Object.entries(block.data).filter(([k]) => !['event', 'node'].includes(k)).map(([k, v]) => (
                                                                    <div key={k} className="trace-block-payload-row">
                                                                        <span className="trace-payload-key">{k.replace(/_/g, ' ')}</span>
                                                                        <span className="trace-payload-value">{String(v)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* FOOTER */}
            <footer className="trace-footer">
                <div className="trace-container">
                    <div className="trace-footer-content">
                        <div className="trace-footer-brand">
                            <span className="trace-footer-logo">{Icons.shield}</span>
                            <span>SmartPoultry</span>
                        </div>
                        <p className="trace-footer-text">
                            Sistem traceability terintegrasi blockchain multichain untuk transparansi rantai pasok unggas.
                        </p>
                        <p className="trace-footer-copy">© 2026 SmartPoultry — Verified by Blockchain</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
