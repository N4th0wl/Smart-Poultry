import { useState, useEffect, useCallback } from 'react'
import adminService from '../services/adminService'
import toast from 'react-hot-toast'
import '../styles/DashboardBlockchain.css'
import '../styles/AdminDashboard.css'

// ============================================================================
// BLOCK TYPE CONFIGURATIONS (All Nodes)
// ============================================================================

const PETERNAKAN_BLOCK_CONFIG = {
    GENESIS: { label: 'Genesis', color: '#6366f1', icon: '🔗' },
    KANDANG_AKTIF: { label: 'Kandang Aktif', color: '#10b981', icon: '🏠' },
    DOC_MASUK: { label: 'DOC Masuk', color: '#f59e0b', icon: '🐣' },
    LAPORAN_MORTALITY: { label: 'Mortality', color: '#ef4444', icon: '💀' },
    PEMAKAIAN_OBAT: { label: 'Pemakaian Obat', color: '#8b5cf6', icon: '💊' },
    PANEN: { label: 'Panen', color: '#22c55e', icon: '✅' },
    PANEN_DINI: { label: 'Panen Dini', color: '#eab308', icon: '⚠️' },
    GAGAL_PANEN: { label: 'Gagal Panen', color: '#dc2626', icon: '❌' },
    TRANSFER_PROCESSOR: { label: 'Transfer', color: '#3b82f6', icon: '🚛' },
}

const KURIR_BLOCK_CONFIG = {
    GENESIS: { label: 'Genesis', color: '#6366f1', icon: '🔗' },
    LINK_UPSTREAM: { label: 'Link Upstream', color: '#06b6d4', icon: '⛓️' },
    PICKUP_FARM: { label: 'Pickup Farm', color: '#10b981', icon: '📦' },
    DELIVERY_PROCESSOR: { label: 'Delivery Processor', color: '#3b82f6', icon: '🏭' },
    PICKUP_PROCESSOR: { label: 'Pickup Processor', color: '#f59e0b', icon: '📦' },
    DELIVERY_RETAILER: { label: 'Delivery Retailer', color: '#ec4899', icon: '🏪' },
}

const PROCESSOR_BLOCK_CONFIG = {
    RECEIVE_FROM_FARM: { label: 'Terima dari Farm', color: '#10b981', icon: '📦' },
    NOTA_PENERIMAAN: { label: 'Nota Penerimaan', color: '#3b82f6', icon: '📋' },
    PROCESSING: { label: 'Processing', color: '#8b5cf6', icon: '⚙️' },
    HALAL_CHECK: { label: 'Halal Check', color: '#06b6d4', icon: '☪️' },
    QUALITY_CHECK: { label: 'Quality Check', color: '#f59e0b', icon: '🔍' },
    LAPORAN_MASALAH: { label: 'Laporan Masalah', color: '#ef4444', icon: '⚠️' },
    TRANSFER_TO_RETAIL: { label: 'Transfer ke Retail', color: '#ec4899', icon: '🏪' },
}

const RETAILER_BLOCK_CONFIG = {
    RECEIVE_FROM_PROCESSOR: { label: 'Terima dari Processor', color: '#10b981', icon: '📦' },
    NOTA_PENERIMAAN: { label: 'Nota Penerimaan', color: '#3b82f6', icon: '📋' },
    STOCK_IN: { label: 'Stok Masuk', color: '#8b5cf6', icon: '📥' },
    SALE_RECORDED: { label: 'Penjualan', color: '#f59e0b', icon: '💰' },
    STOCK_OUT: { label: 'Stok Keluar', color: '#ef4444', icon: '📤' },
}

const STATUS_CHAIN_CONFIG = {
    ACTIVE: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED: { label: 'Completed', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    FAILED: { label: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    TRANSFERRED: { label: 'Transferred', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    NOT_LINKED: { label: 'Not Linked', color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
    RECEIVED: { label: 'Received', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    WAITING: { label: 'Waiting', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
}

const NODE_CONFIG = {
    NODE_PETERNAKAN: { label: 'Peternakan', icon: '🏗️', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    NODE_KURIR: { label: 'Kurir', icon: '🚛', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    NODE_PROCESSOR: { label: 'Processor', icon: '🏭', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    NODE_RETAILER: { label: 'Retailer', icon: '🏪', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
}

function getBlockConfig(nodeType, tipeBlock) {
    if (nodeType === 'NODE_KURIR') return KURIR_BLOCK_CONFIG[tipeBlock] || { label: tipeBlock, color: '#6b7280', icon: '📦' }
    if (nodeType === 'NODE_PROCESSOR') return PROCESSOR_BLOCK_CONFIG[tipeBlock] || { label: tipeBlock, color: '#6b7280', icon: '📦' }
    if (nodeType === 'NODE_RETAILER') return RETAILER_BLOCK_CONFIG[tipeBlock] || { label: tipeBlock, color: '#6b7280', icon: '📦' }
    return PETERNAKAN_BLOCK_CONFIG[tipeBlock] || { label: tipeBlock, color: '#6b7280', icon: '📦' }
}

// ============================================================================
// COMPONENT
// ============================================================================

function AdminPanelBlockchain() {
    const [overview, setOverview] = useState(null)
    const [chains, setChains] = useState([])
    const [connectionStatus, setConnectionStatus] = useState({ peternakan: true, kurir: false, processor: false, retailer: false })
    const [selectedChain, setSelectedChain] = useState(null)
    const [blocks, setBlocks] = useState([])
    const [unifiedData, setUnifiedData] = useState(null)
    const [selectedBlock, setSelectedBlock] = useState(null)
    const [validation, setValidation] = useState(null)
    const [loading, setLoading] = useState({ overview: true, blocks: false })
    const [view, setView] = useState('overview') // overview | chain-detail | unified-detail
    const [searchQuery, setSearchQuery] = useState('')
    const [filterNode, setFilterNode] = useState('ALL') // ALL | NODE_PETERNAKAN | NODE_KURIR | NODE_PROCESSOR
    const [filterStatus, setFilterStatus] = useState('ALL')

    // Load unified overview
    const loadOverview = useCallback(async () => {
        setLoading(prev => ({ ...prev, overview: true }))
        try {
            const data = await adminService.getUnifiedOverview(searchQuery)
            setOverview(data)
            setChains(data.chains || [])
            setConnectionStatus(data.connectionStatus || { peternakan: true, kurir: false, processor: false, retailer: false })
        } catch (error) {
            // Fallback to peternakan-only
            try {
                const data = await adminService.getBlockchainOverview(searchQuery)
                setOverview({
                    stats: {
                        peternakan: {
                            total: data.totalChains,
                            active: data.activeChains,
                            completed: data.completedChains,
                            transferred: data.transferredChains,
                            totalBlocks: data.totalBlocks,
                            connected: true
                        },
                        kurir: { total: 0, connected: false, totalBlocks: 0 },
                        processor: { total: 0, connected: false, totalBlocks: 0 },
                        retailer: { total: 0, connected: false, totalBlocks: 0 }
                    },
                    totalChains: data.totalChains,
                    totalBlocks: data.totalBlocks,
                    chains: (data.chains || []).map(c => ({ ...c, nodeType: 'NODE_PETERNAKAN', nodeLabel: '🏗️ Peternakan', nodeColor: '#10b981' })),
                    connectionStatus: { peternakan: true, kurir: false, processor: false, retailer: false }
                })
                setChains((data.chains || []).map(c => ({ ...c, nodeType: 'NODE_PETERNAKAN', nodeLabel: '🏗️ Peternakan', nodeColor: '#10b981' })))
                setConnectionStatus({ peternakan: true, kurir: false, processor: false, retailer: false })
            } catch (err2) {
                toast.error('Gagal memuat data blockchain')
            }
        } finally {
            setLoading(prev => ({ ...prev, overview: false }))
        }
    }, [searchQuery])

    useEffect(() => {
        const timer = setTimeout(() => { loadOverview() }, 300)
        return () => clearTimeout(timer)
    }, [loadOverview])

    // Load blocks for a chain
    const loadBlocks = async (chain) => {
        setLoading(prev => ({ ...prev, blocks: true }))
        try {
            let data = []
            if (chain.nodeType === 'NODE_PETERNAKAN') {
                data = await adminService.getBlocks(chain.KodeCycle)
            } else if (chain.nodeType === 'NODE_KURIR') {
                data = await adminService.getKurirBlocks(chain.KodePengiriman)
            } else if (chain.nodeType === 'NODE_PROCESSOR') {
                data = await adminService.getProcessorBlocks(chain.IdIdentity)
            } else if (chain.nodeType === 'NODE_RETAILER') {
                data = await adminService.getRetailerBlocks(chain.IdIdentity)
            }
            // Parse DataPayload if needed
            const parsedBlocks = (data || []).map(b => {
                let payload = b.DataPayload
                if (typeof payload === 'string') {
                    try { payload = JSON.parse(payload) } catch (e) { /* noop */ }
                }
                return { ...b, DataPayload: payload, _nodeType: chain.nodeType }
            })
            setBlocks(parsedBlocks)
            setSelectedBlock(null)
            setValidation(null)
        } catch (error) {
            toast.error('Gagal memuat blocks')
        } finally {
            setLoading(prev => ({ ...prev, blocks: false }))
        }
    }

    // Load unified chain (Peternakan + linked chains)
    const loadUnifiedChain = async (cycleId) => {
        setLoading(prev => ({ ...prev, blocks: true }))
        try {
            const data = await adminService.getUnifiedChain(cycleId)
            setUnifiedData(data)
            // Build unified block list
            const unifiedBlocks = (data.unifiedTimeline || []).map(b => {
                let payload = b.DataPayload
                if (typeof payload === 'string') {
                    try { payload = JSON.parse(payload) } catch (e) { /* noop */ }
                }
                return { ...b, DataPayload: payload, _nodeType: b.node }
            })
            setBlocks(unifiedBlocks)
            setSelectedBlock(null)
            setValidation(null)
        } catch (error) {
            toast.error('Gagal memuat unified chain')
        } finally {
            setLoading(prev => ({ ...prev, blocks: false }))
        }
    }

    const handleSelectChain = (chain) => {
        setSelectedChain(chain)
        if (chain.nodeType === 'NODE_PETERNAKAN') {
            // For Peternakan chains, load unified view (includes linked Kurir + Processor)
            setView('unified-detail')
            loadUnifiedChain(chain.KodeCycle)
        } else {
            // For Kurir/Processor chains, load their own blocks
            setView('chain-detail')
            loadBlocks(chain)
        }
    }

    const handleValidate = async () => {
        if (!selectedChain) return
        try {
            let result
            if (selectedChain.nodeType === 'NODE_PETERNAKAN') {
                result = await adminService.validateChain(selectedChain.KodeCycle)
            } else if (selectedChain.nodeType === 'NODE_KURIR') {
                result = await adminService.validateKurirChain(selectedChain.KodePengiriman)
            } else if (selectedChain.nodeType === 'NODE_PROCESSOR') {
                result = await adminService.validateProcessorChain(selectedChain.IdIdentity)
            } else if (selectedChain.nodeType === 'NODE_RETAILER') {
                result = await adminService.validateRetailerChain(selectedChain.IdIdentity)
            }
            setValidation(result)
            if (result.valid) {
                toast.success('✓ Chain valid! Integritas terjaga.')
            } else {
                toast.error(`Chain tidak valid: ${result.message}`)
            }
        } catch (error) {
            toast.error('Gagal memvalidasi chain')
        }
    }

    const handleBack = () => {
        setView('overview')
        setSelectedChain(null)
        setBlocks([])
        setSelectedBlock(null)
        setValidation(null)
        setUnifiedData(null)
    }

    // Filtered chains
    const filteredChains = chains.filter(c => {
        if (filterNode !== 'ALL' && c.nodeType !== filterNode) return false
        if (filterStatus !== 'ALL' && c.StatusChain !== filterStatus) return false
        return true
    })

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
        } catch { return dateStr }
    }

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-'
        try {
            return new Date(dateStr).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        } catch { return dateStr }
    }

    const truncHash = (hash) => {
        if (!hash) return '...'
        return `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}`
    }

    return (
        <div className="blockchain-page">
            {/* Page Header */}
            <div className="blockchain-page-header">
                <div className="blockchain-header-content">
                    <div className="blockchain-header-icon">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="4" width="6" height="6" rx="1" />
                            <rect x="9" y="4" width="6" height="6" rx="1" />
                            <rect x="17" y="4" width="6" height="6" rx="1" />
                            <rect x="5" y="14" width="6" height="6" rx="1" />
                            <rect x="13" y="14" width="6" height="6" rx="1" />
                            <line x1="4" y1="10" x2="8" y2="14" />
                            <line x1="12" y1="10" x2="16" y2="14" />
                            <line x1="12" y1="10" x2="8" y2="14" />
                            <line x1="20" y1="10" x2="16" y2="14" />
                        </svg>
                    </div>
                    <div>
                        <h1 id="admin-blockchain-title">Unified Blockchain Monitor</h1>
                        <p className="blockchain-subtitle">
                            Admin Panel • Monitoring Seluruh Supply Chain
                        </p>
                    </div>
                </div>
                {(view === 'chain-detail' || view === 'unified-detail') && (
                    <button className="blockchain-back-btn" onClick={handleBack}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Kembali
                    </button>
                )}
            </div>

            {/* Connection Status Banner */}
            <div className="blockchain-node-banner">
                <div className="node-banner-item">
                    <span className="node-label">Chain Flow</span>
                    <span className="node-value node-flow">
                        <span className="node-flow-item" style={{ color: '#10b981' }}>
                            <span className={`node-connection-dot ${connectionStatus.peternakan ? 'connected' : ''}`} style={{ background: '#10b981' }} />
                            🏗️ Farm
                        </span>
                        <span className="node-arrow">→</span>
                        <span className="node-flow-item" style={{ color: '#f59e0b' }}>
                            <span className={`node-connection-dot ${connectionStatus.kurir ? 'connected' : ''}`} style={{ background: connectionStatus.kurir ? '#f59e0b' : '#6b7280' }} />
                            🚛 Kurir
                        </span>
                        <span className="node-arrow">→</span>
                        <span className="node-flow-item" style={{ color: '#8b5cf6' }}>
                            <span className={`node-connection-dot ${connectionStatus.processor ? 'connected' : ''}`} style={{ background: connectionStatus.processor ? '#8b5cf6' : '#6b7280' }} />
                            🏭 Processor
                        </span>
                        <span className="node-arrow">→</span>
                        <span className="node-flow-item" style={{ color: '#ec4899' }}>
                            <span className={`node-connection-dot ${connectionStatus.retailer ? 'connected' : ''}`} style={{ background: connectionStatus.retailer ? '#ec4899' : '#6b7280' }} />
                            🏪 Retailer
                        </span>
                    </span>
                </div>
                <div className="node-banner-divider" />
                <div className="node-banner-item">
                    <span className="node-label">Mode</span>
                    <span className="node-value">🛡️ Admin Unified View</span>
                </div>
            </div>

            {view === 'overview' && (
                <>
                    {/* Search & Filters */}
                    <div className="admin-search-container">
                        <div className="admin-search-wrapper">
                            <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8" />
                                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                            <input
                                type="text"
                                className="admin-search-input"
                                placeholder="Cari chain, peternakan, perusahaan kurir, status..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                id="admin-blockchain-search"
                            />
                            {searchQuery && (
                                <button className="admin-search-clear" onClick={() => setSearchQuery('')}>
                                    ✕
                                </button>
                            )}
                        </div>
                        <span className="admin-search-count">{filteredChains.length} chain ditemukan</span>
                    </div>

                    {/* Filter Tabs */}
                    <div className="unified-filter-tabs">
                        <button className={`filter-tab ${filterNode === 'ALL' ? 'active' : ''}`} onClick={() => setFilterNode('ALL')}>
                            Semua Node
                            <span className="filter-tab-count">{chains.length}</span>
                        </button>
                        <button className={`filter-tab ${filterNode === 'NODE_PETERNAKAN' ? 'active' : ''}`} onClick={() => setFilterNode('NODE_PETERNAKAN')}
                            style={{ '--tab-color': '#10b981' }}>
                            🏗️ Peternakan
                            <span className="filter-tab-count">{chains.filter(c => c.nodeType === 'NODE_PETERNAKAN').length}</span>
                        </button>
                        <button className={`filter-tab ${filterNode === 'NODE_KURIR' ? 'active' : ''}`} onClick={() => setFilterNode('NODE_KURIR')}
                            style={{ '--tab-color': '#f59e0b' }} disabled={!connectionStatus.kurir}>
                            🚛 Kurir
                            <span className="filter-tab-count">{chains.filter(c => c.nodeType === 'NODE_KURIR').length}</span>
                            {!connectionStatus.kurir && <span className="filter-tab-offline">Offline</span>}
                        </button>
                        <button className={`filter-tab ${filterNode === 'NODE_PROCESSOR' ? 'active' : ''}`} onClick={() => setFilterNode('NODE_PROCESSOR')}
                            style={{ '--tab-color': '#8b5cf6' }} disabled={!connectionStatus.processor}>
                            🏭 Processor
                            <span className="filter-tab-count">{chains.filter(c => c.nodeType === 'NODE_PROCESSOR').length}</span>
                            {!connectionStatus.processor && <span className="filter-tab-offline">Offline</span>}
                        </button>
                        <button className={`filter-tab ${filterNode === 'NODE_RETAILER' ? 'active' : ''}`} onClick={() => setFilterNode('NODE_RETAILER')}
                            style={{ '--tab-color': '#ec4899' }} disabled={!connectionStatus.retailer}>
                            🏪 Retailer
                            <span className="filter-tab-count">{chains.filter(c => c.nodeType === 'NODE_RETAILER').length}</span>
                            {!connectionStatus.retailer && <span className="filter-tab-offline">Offline</span>}
                        </button>
                    </div>

                    {/* Stats Cards - Per Node */}
                    {overview && (
                        <div className="unified-stats-grid">
                            {/* Peternakan Stats */}
                            <div className="unified-stat-section">
                                <div className="unified-stat-header" style={{ borderColor: '#10b981' }}>
                                    <span className="unified-stat-node-icon">🏗️</span>
                                    <span>Peternakan</span>
                                    <span className="unified-stat-connection connected">● Connected</span>
                                </div>
                                <div className="unified-stat-row">
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.peternakan?.total || 0}</span>
                                        <span className="unified-stat-label">Chains</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.peternakan?.active || 0}</span>
                                        <span className="unified-stat-label">Active</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.peternakan?.totalBlocks || 0}</span>
                                        <span className="unified-stat-label">Blocks</span>
                                    </div>
                                </div>
                            </div>

                            {/* Kurir Stats */}
                            <div className="unified-stat-section">
                                <div className="unified-stat-header" style={{ borderColor: '#f59e0b' }}>
                                    <span className="unified-stat-node-icon">🚛</span>
                                    <span>Kurir</span>
                                    <span className={`unified-stat-connection ${connectionStatus.kurir ? 'connected' : 'disconnected'}`}>
                                        ● {connectionStatus.kurir ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                <div className="unified-stat-row">
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.kurir?.total || 0}</span>
                                        <span className="unified-stat-label">Chains</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.kurir?.active || 0}</span>
                                        <span className="unified-stat-label">Active</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.kurir?.totalBlocks || 0}</span>
                                        <span className="unified-stat-label">Blocks</span>
                                    </div>
                                </div>
                            </div>

                            {/* Processor Stats */}
                            <div className="unified-stat-section">
                                <div className="unified-stat-header" style={{ borderColor: '#8b5cf6' }}>
                                    <span className="unified-stat-node-icon">🏭</span>
                                    <span>Processor</span>
                                    <span className={`unified-stat-connection ${connectionStatus.processor ? 'connected' : 'disconnected'}`}>
                                        ● {connectionStatus.processor ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                <div className="unified-stat-row">
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.processor?.total || 0}</span>
                                        <span className="unified-stat-label">Chains</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.processor?.active || 0}</span>
                                        <span className="unified-stat-label">Active</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.processor?.totalBlocks || 0}</span>
                                        <span className="unified-stat-label">Blocks</span>
                                    </div>
                                </div>
                            </div>

                            {/* Retailer Stats */}
                            <div className="unified-stat-section">
                                <div className="unified-stat-header" style={{ borderColor: '#ec4899' }}>
                                    <span className="unified-stat-node-icon">🏪</span>
                                    <span>Retailer</span>
                                    <span className={`unified-stat-connection ${connectionStatus.retailer ? 'connected' : 'disconnected'}`}>
                                        ● {connectionStatus.retailer ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                <div className="unified-stat-row">
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.retailer?.total || 0}</span>
                                        <span className="unified-stat-label">Chains</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.retailer?.active || 0}</span>
                                        <span className="unified-stat-label">Active</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.stats?.retailer?.totalBlocks || 0}</span>
                                        <span className="unified-stat-label">Blocks</span>
                                    </div>
                                </div>
                            </div>

                            {/* Total Stats */}
                            <div className="unified-stat-section unified-stat-total">
                                <div className="unified-stat-header" style={{ borderColor: '#6366f1' }}>
                                    <span className="unified-stat-node-icon">⛓️</span>
                                    <span>Total Supply Chain</span>
                                </div>
                                <div className="unified-stat-row">
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.totalChains || 0}</span>
                                        <span className="unified-stat-label">Chains</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">{overview.totalBlocks || 0}</span>
                                        <span className="unified-stat-label">Blocks</span>
                                    </div>
                                    <div className="unified-stat-item">
                                        <span className="unified-stat-value">
                                            {[connectionStatus.peternakan, connectionStatus.kurir, connectionStatus.processor, connectionStatus.retailer].filter(Boolean).length}/4
                                        </span>
                                        <span className="unified-stat-label">Nodes</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chain List */}
                    <div className="blockchain-chains-section">
                        <h2 className="blockchain-section-title">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                            </svg>
                            Blockchain Chains — Seluruh Supply Chain
                        </h2>

                        {/* Status filter row */}
                        <div className="unified-status-filters">
                            {['ALL', 'ACTIVE', 'COMPLETED', 'TRANSFERRED', 'FAILED'].map(s => (
                                <button key={s} className={`status-filter-btn ${filterStatus === s ? 'active' : ''}`}
                                    onClick={() => setFilterStatus(s)}
                                    style={s !== 'ALL' ? { '--status-color': STATUS_CHAIN_CONFIG[s]?.color } : {}}>
                                    {s === 'ALL' ? 'Semua' : STATUS_CHAIN_CONFIG[s]?.label}
                                </button>
                            ))}
                        </div>

                        {loading.overview ? (
                            <div className="blockchain-loading">
                                <div className="blockchain-spinner" />
                                <p>Memuat data blockchain dari semua node...</p>
                            </div>
                        ) : filteredChains.length === 0 ? (
                            <div className="blockchain-empty">
                                <div className="blockchain-empty-icon">🔗</div>
                                <h3>Tidak ada chain ditemukan</h3>
                                <p>Coba ubah filter atau pastikan semua node terkoneksi.</p>
                            </div>
                        ) : (
                            <div className="blockchain-chain-list">
                                {filteredChains.map((chain, idx) => {
                                    const statusConf = STATUS_CHAIN_CONFIG[chain.StatusChain] || STATUS_CHAIN_CONFIG.ACTIVE
                                    const nodeConf = NODE_CONFIG[chain.nodeType] || NODE_CONFIG.NODE_PETERNAKAN
                                    const chainKey = chain.KodeIdentity || `${chain.nodeType}-${idx}`

                                    return (
                                        <div
                                            key={chainKey}
                                            className="blockchain-chain-card"
                                            onClick={() => handleSelectChain(chain)}
                                            style={{ '--chain-node-color': nodeConf.color }}
                                        >
                                            {/* Node type indicator */}
                                            <div className="chain-card-node-badge" style={{ background: nodeConf.bg, color: nodeConf.color }}>
                                                {nodeConf.icon} {nodeConf.label}
                                            </div>

                                            <div className="chain-card-header">
                                                <div className="chain-card-identity">
                                                    <span className="chain-code">{chain.KodeIdentity}</span>
                                                    <span
                                                        className="chain-status-badge"
                                                        style={{ color: statusConf.color, background: statusConf.bg }}
                                                    >
                                                        {statusConf.label}
                                                    </span>
                                                </div>
                                                <span className="chain-blocks-count">
                                                    {chain.ActualBlockCount || chain.TotalBlocks} blocks
                                                </span>
                                            </div>

                                            <div className="chain-card-body">
                                                {/* Node-specific info */}
                                                {chain.nodeType === 'NODE_PETERNAKAN' && (
                                                    <>
                                                        <div className="chain-meta-row">
                                                            <span className="chain-meta-label">Peternakan</span>
                                                            <span className="chain-meta-value">{chain.NamaPeternakan}</span>
                                                        </div>
                                                        <div className="chain-meta-row">
                                                            <span className="chain-meta-label">Cycle</span>
                                                            <span className="chain-meta-value">#{chain.KodeCycle}</span>
                                                        </div>
                                                        {chain.BrandDOC && (
                                                            <div className="chain-meta-row">
                                                                <span className="chain-meta-label">DOC</span>
                                                                <span className="chain-meta-value">{chain.BrandDOC} ({chain.TipeAyam})</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {chain.nodeType === 'NODE_KURIR' && (
                                                    <>
                                                        <div className="chain-meta-row">
                                                            <span className="chain-meta-label">Perusahaan</span>
                                                            <span className="chain-meta-value">{chain.NamaPerusahaan || '-'}</span>
                                                        </div>
                                                        <div className="chain-meta-row">
                                                            <span className="chain-meta-label">Pengiriman</span>
                                                            <span className="chain-meta-value">{chain.KodePengiriman}</span>
                                                        </div>
                                                        {(chain.AsalPengirim || chain.TujuanPenerima) && (
                                                            <div className="chain-meta-row">
                                                                <span className="chain-meta-label">Rute</span>
                                                                <span className="chain-meta-value">{chain.AsalPengirim || '?'} → {chain.TujuanPenerima || '?'}</span>
                                                            </div>
                                                        )}
                                                        {chain.TipePengiriman && (
                                                            <div className="chain-meta-row">
                                                                <span className="chain-meta-label">Tipe</span>
                                                                <span className="chain-meta-value" style={{ fontSize: '0.75rem' }}>
                                                                    {chain.TipePengiriman === 'FARM_TO_PROCESSOR' ? '🏗️→🏭 Farm to Processor' : '🏭→🏪 Processor to Retailer'}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {chain.UpstreamCycleId && (
                                                            <div className="chain-meta-row">
                                                                <span className="chain-meta-label">Linked Cycle</span>
                                                                <span className="chain-meta-value">⛓️ #{chain.UpstreamCycleId}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {chain.nodeType === 'NODE_PROCESSOR' && (
                                                    <>
                                                        <div className="chain-meta-row">
                                                            <span className="chain-meta-label">Order</span>
                                                            <span className="chain-meta-value">{chain.KodeOrder || '-'}</span>
                                                        </div>
                                                        <div className="chain-meta-row">
                                                            <span className="chain-meta-label">Peternakan</span>
                                                            <span className="chain-meta-value">{chain.NamaPeternakan || '-'}</span>
                                                        </div>
                                                        {chain.JenisAyam && (
                                                            <div className="chain-meta-row">
                                                                <span className="chain-meta-label">Jenis</span>
                                                                <span className="chain-meta-value">{chain.JenisAyam}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                {chain.nodeType === 'NODE_RETAILER' && (
                                                    <>
                                                        <div className="chain-meta-row">
                                                            <span className="chain-meta-label">Retailer</span>
                                                            <span className="chain-meta-value">{chain.NamaRetailer || '-'}</span>
                                                        </div>
                                                        <div className="chain-meta-row">
                                                            <span className="chain-meta-label">Order</span>
                                                            <span className="chain-meta-value">{chain.KodeOrder || '-'}</span>
                                                        </div>
                                                        {chain.NamaProcessor && (
                                                            <div className="chain-meta-row">
                                                                <span className="chain-meta-label">Processor</span>
                                                                <span className="chain-meta-value">{chain.NamaProcessor}</span>
                                                            </div>
                                                        )}
                                                        {chain.NamaProduk && (
                                                            <div className="chain-meta-row">
                                                                <span className="chain-meta-label">Produk</span>
                                                                <span className="chain-meta-value">{chain.NamaProduk}</span>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                                <div className="chain-meta-row">
                                                    <span className="chain-meta-label">Mulai</span>
                                                    <span className="chain-meta-value">{formatDate(chain.TanggalMulai || chain.CreatedAt)}</span>
                                                </div>
                                            </div>

                                            <div className="chain-card-footer">
                                                <span className="chain-hash-preview">
                                                    Genesis: {truncHash(chain.GenesisHash)}
                                                </span>
                                                <span className="chain-view-btn">
                                                    {chain.nodeType === 'NODE_PETERNAKAN' ? 'Lihat Unified Chain →' : 'Lihat Detail →'}
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* UNIFIED DETAIL VIEW (Peternakan + Kurir + Processor as one timeline) */}
            {view === 'unified-detail' && selectedChain && (
                <div className="blockchain-detail-view">
                    {/* Chain Info Header */}
                    <div className="chain-detail-header">
                        <div className="chain-detail-info">
                            <h2>{selectedChain.KodeIdentity}</h2>
                            <div className="chain-detail-meta">
                                <span className="chain-status-badge" style={{
                                    color: (STATUS_CHAIN_CONFIG[selectedChain.StatusChain] || {}).color,
                                    background: (STATUS_CHAIN_CONFIG[selectedChain.StatusChain] || {}).bg
                                }}>
                                    {(STATUS_CHAIN_CONFIG[selectedChain.StatusChain] || {}).label}
                                </span>
                                <span>🏗️ {selectedChain.NamaPeternakan}</span>
                                <span>•</span>
                                <span>Cycle #{selectedChain.KodeCycle}</span>
                                <span>•</span>
                                <span>{formatDate(selectedChain.TanggalMulai || selectedChain.CreatedAt)}</span>
                            </div>
                        </div>
                        <div className="chain-detail-actions">
                            <button className="bc-validate-btn" onClick={handleValidate}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <polyline points="9 12 11 14 15 10" />
                                </svg>
                                Validasi Chain
                            </button>
                        </div>
                    </div>

                    {/* Supply Chain Node Flow (5 segments) */}
                    {unifiedData && unifiedData.supplyChainNodes && (
                        <div className="supply-chain-flow">
                            {unifiedData.supplyChainNodes.map((node, idx) => {
                                const nodeConf = NODE_CONFIG[node.node] || { label: node.label, icon: node.icon, color: node.color || '#6b7280', bg: 'rgba(107,114,128,0.1)' }
                                const displayLabel = node.label || nodeConf.label
                                const statusConf = STATUS_CHAIN_CONFIG[node.status] || { label: node.status, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
                                return (
                                    <div key={`segment-${node.segment || idx}`} className="supply-chain-flow-wrapper">
                                        {idx > 0 && (
                                            <div className="supply-chain-connector">
                                                <div className="supply-chain-arrow" />
                                            </div>
                                        )}
                                        <div className={`supply-chain-node ${node.status !== 'NOT_LINKED' ? 'active' : 'inactive'}`}
                                            style={{ '--node-color': node.color || nodeConf.color || '#6b7280' }}>
                                            <div className="supply-chain-node-icon">{node.icon || nodeConf.icon}</div>
                                            <div className="supply-chain-node-info">
                                                <span className="supply-chain-node-label">{displayLabel}</span>
                                                {node.sublabel && <span className="supply-chain-node-id" style={{ fontFamily: 'inherit', fontStyle: 'italic' }}>{node.sublabel}</span>}
                                                {node.name && <span className="supply-chain-node-id">{node.name}</span>}
                                                {node.route && <span className="supply-chain-node-id" title={node.route}>{node.route}</span>}
                                                {node.totalBlocks > 0 && <span className="supply-chain-node-blocks">{node.totalBlocks} blocks</span>}
                                            </div>
                                            <span className="supply-chain-node-status" style={{
                                                color: statusConf.color,
                                                background: statusConf.bg
                                            }}>
                                                {statusConf.label}
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Validation Result */}
                    {validation && (
                        <div className={`chain-validation-result ${validation.valid ? 'valid' : 'invalid'}`}>
                            <div className="validation-icon">
                                {validation.valid ? '🛡️' : '⚠️'}
                            </div>
                            <div className="validation-info">
                                <strong>{validation.valid ? 'Chain Valid' : 'Chain Tidak Valid'}</strong>
                                <p>{validation.message}</p>
                                <span>{validation.totalBlocks} blocks terverifikasi</span>
                            </div>
                        </div>
                    )}

                    {/* Unified Timeline */}
                    <div className="blockchain-visual-section">
                        <h3 className="blockchain-section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            Unified Supply Chain Timeline
                            <span className="timeline-block-total">{blocks.length} blocks dari semua node</span>
                        </h3>

                        {loading.blocks ? (
                            <div className="blockchain-loading">
                                <div className="blockchain-spinner" />
                                <p>Memuat unified timeline...</p>
                            </div>
                        ) : blocks.length === 0 ? (
                            <div className="blockchain-empty">
                                <p>Tidak ada blocks ditemukan.</p>
                            </div>
                        ) : (
                            <div className="blockchain-timeline">
                                {blocks.map((block, idx) => {
                                    const nodeType = block._nodeType || block.node || 'NODE_PETERNAKAN'
                                    const conf = getBlockConfig(nodeType, block.TipeBlock)
                                    const nodeConf = NODE_CONFIG[nodeType] || NODE_CONFIG.NODE_PETERNAKAN
                                    const isSelected = selectedBlock && (selectedBlock.KodeBlock === block.KodeBlock || selectedBlock.unifiedIndex === block.unifiedIndex)
                                    const payload = block.DataPayload
                                    const prevBlock = idx > 0 ? blocks[idx - 1] : null
                                    // Use segment number for transition detection (Kurir Leg 1 & 2 share nodeType but differ in segment)
                                    const currentSegment = block.segment || 0
                                    const prevSegment = prevBlock ? (prevBlock.segment || 0) : currentSegment
                                    const segmentChanged = prevBlock && prevSegment !== currentSegment
                                    // Build transition label
                                    const segmentLabels = {
                                        1: { label: 'Peternakan', icon: '🏗️' },
                                        2: { label: 'Kurir (Farm → Processor)', icon: '🚛' },
                                        3: { label: 'Processor', icon: '🏭' },
                                        4: { label: 'Kurir (Processor → Retailer)', icon: '🚛' },
                                        5: { label: 'Retailer', icon: '🏪' },
                                    }
                                    const transitionInfo = segmentLabels[currentSegment] || { label: nodeConf.label, icon: nodeConf.icon }

                                    return (
                                        <div key={block.KodeBlock || `u-${idx}`} className="timeline-item-wrapper">
                                            {/* Segment transition marker */}
                                            {segmentChanged && (
                                                <div className="timeline-node-transition">
                                                    <div className="node-transition-line" />
                                                    <div className="node-transition-label" style={{ color: nodeConf.color, background: nodeConf.bg }}>
                                                        {transitionInfo.icon} Chain handoff → {transitionInfo.label}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Connector line */}
                                            {idx > 0 && !segmentChanged && (
                                                <div className="timeline-connector">
                                                    <div className="connector-line" style={{ borderColor: nodeConf.color }} />
                                                    <div className="connector-hash">
                                                        {block.PreviousHash ? block.PreviousHash.substring(0, 8) : '...'}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Block Card */}
                                            <div
                                                className={`timeline-block-card ${isSelected ? 'selected' : ''}`}
                                                style={{ '--block-color': conf.color, '--node-color': nodeConf.color }}
                                                onClick={() => setSelectedBlock(isSelected ? null : block)}
                                            >
                                                <div className="block-card-indicator" style={{ background: `linear-gradient(180deg, ${nodeConf.color}, ${conf.color})` }} />
                                                <div className="block-card-content">
                                                    <div className="block-card-top">
                                                        <span className="block-node-badge" style={{ color: nodeConf.color, background: nodeConf.bg }}>
                                                            {nodeConf.icon}
                                                        </span>
                                                        <span className="block-icon">{conf.icon}</span>
                                                        <span className="block-type-label" style={{ color: conf.color }}>
                                                            {conf.label}
                                                        </span>
                                                        <span className="block-index">#{block.BlockIndex}</span>
                                                        <span className="block-time">{formatDateTime(block.CreatedAt)}</span>
                                                    </div>

                                                    {/* Summary */}
                                                    <p className="block-summary">
                                                        {getBlockSummary(nodeType, block.TipeBlock, payload)}
                                                    </p>

                                                    {/* Hash Info */}
                                                    <div className="block-hash-row">
                                                        <span className="hash-label">Hash:</span>
                                                        <span className="hash-value">{truncHash(block.CurrentHash)}</span>
                                                    </div>

                                                    {/* Expanded Detail */}
                                                    {isSelected && (
                                                        <div className="block-expanded">
                                                            <div className="block-detail-grid">
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Kode Block</span>
                                                                    <span className="detail-value">{block.KodeBlock}</span>
                                                                </div>
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Node</span>
                                                                    <span className="detail-value" style={{ color: nodeConf.color }}>{nodeConf.icon} {nodeConf.label}</span>
                                                                </div>
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Previous Hash</span>
                                                                    <span className="detail-value hash-mono">{truncHash(block.PreviousHash)}</span>
                                                                </div>
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Current Hash</span>
                                                                    <span className="detail-value hash-mono">{truncHash(block.CurrentHash)}</span>
                                                                </div>
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Status</span>
                                                                    <span className="detail-value">{block.StatusBlock}</span>
                                                                </div>
                                                                {block.KodeKandang && (
                                                                    <div className="block-detail-item">
                                                                        <span className="detail-label">Kandang</span>
                                                                        <span className="detail-value">{block.KodeKandang}</span>
                                                                    </div>
                                                                )}
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Nonce</span>
                                                                    <span className="detail-value">{block.Nonce}</span>
                                                                </div>
                                                            </div>

                                                            {/* Data Payload */}
                                                            <div className="block-payload">
                                                                <span className="payload-title">Data Payload</span>
                                                                <pre className="payload-json">
                                                                    {JSON.stringify(payload, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* End of chain marker */}
                                <div className="timeline-end-marker">
                                    <div className="end-marker-dot" />
                                    <span>End of Unified Chain • {blocks.length} blocks dari {
                                        [...new Set(blocks.map(b => b._nodeType || b.node))].length
                                    } node</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SINGLE CHAIN DETAIL VIEW (Kurir/Processor individual chains) */}
            {view === 'chain-detail' && selectedChain && (
                <div className="blockchain-detail-view">
                    {/* Chain Info Header */}
                    <div className="chain-detail-header">
                        <div className="chain-detail-info">
                            <h2>{selectedChain.KodeIdentity}</h2>
                            <div className="chain-detail-meta">
                                <span className="chain-status-badge" style={{
                                    color: (STATUS_CHAIN_CONFIG[selectedChain.StatusChain] || {}).color,
                                    background: (STATUS_CHAIN_CONFIG[selectedChain.StatusChain] || {}).bg
                                }}>
                                    {(STATUS_CHAIN_CONFIG[selectedChain.StatusChain] || {}).label}
                                </span>
                                <span>{(NODE_CONFIG[selectedChain.nodeType] || {}).icon} {(NODE_CONFIG[selectedChain.nodeType] || {}).label}</span>
                                <span>•</span>
                                <span>{formatDate(selectedChain.CreatedAt)}</span>
                            </div>
                        </div>
                        <div className="chain-detail-actions">
                            <button className="bc-validate-btn" onClick={handleValidate}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <polyline points="9 12 11 14 15 10" />
                                </svg>
                                Validasi Chain
                            </button>
                        </div>
                    </div>

                    {/* Validation Result */}
                    {validation && (
                        <div className={`chain-validation-result ${validation.valid ? 'valid' : 'invalid'}`}>
                            <div className="validation-icon">
                                {validation.valid ? '🛡️' : '⚠️'}
                            </div>
                            <div className="validation-info">
                                <strong>{validation.valid ? 'Chain Valid' : 'Chain Tidak Valid'}</strong>
                                <p>{validation.message}</p>
                                <span>{validation.totalBlocks} blocks terverifikasi</span>
                            </div>
                        </div>
                    )}

                    {/* Block Chain Timeline */}
                    <div className="blockchain-visual-section">
                        <h3 className="blockchain-section-title">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="3" y="3" width="7" height="7" />
                                <rect x="14" y="3" width="7" height="7" />
                                <rect x="14" y="14" width="7" height="7" />
                                <rect x="3" y="14" width="7" height="7" />
                            </svg>
                            Block Chain Timeline
                        </h3>

                        {loading.blocks ? (
                            <div className="blockchain-loading">
                                <div className="blockchain-spinner" />
                                <p>Memuat blocks...</p>
                            </div>
                        ) : blocks.length === 0 ? (
                            <div className="blockchain-empty">
                                <p>Tidak ada blocks ditemukan.</p>
                            </div>
                        ) : (
                            <div className="blockchain-timeline">
                                {blocks.map((block, idx) => {
                                    const nodeType = block._nodeType || selectedChain.nodeType
                                    const conf = getBlockConfig(nodeType, block.TipeBlock)
                                    const isSelected = selectedBlock && selectedBlock.KodeBlock === block.KodeBlock
                                    const payload = block.DataPayload

                                    return (
                                        <div key={block.KodeBlock || idx} className="timeline-item-wrapper">
                                            {idx > 0 && (
                                                <div className="timeline-connector">
                                                    <div className="connector-line" />
                                                    <div className="connector-hash">
                                                        {block.PreviousHash ? block.PreviousHash.substring(0, 8) : '...'}
                                                    </div>
                                                </div>
                                            )}

                                            <div
                                                className={`timeline-block-card ${isSelected ? 'selected' : ''}`}
                                                style={{ '--block-color': conf.color }}
                                                onClick={() => setSelectedBlock(isSelected ? null : block)}
                                            >
                                                <div className="block-card-indicator" style={{ background: conf.color }} />
                                                <div className="block-card-content">
                                                    <div className="block-card-top">
                                                        <span className="block-icon">{conf.icon}</span>
                                                        <span className="block-type-label" style={{ color: conf.color }}>
                                                            {conf.label}
                                                        </span>
                                                        <span className="block-index">#{block.BlockIndex}</span>
                                                        <span className="block-time">{formatDateTime(block.CreatedAt)}</span>
                                                    </div>

                                                    <p className="block-summary">
                                                        {getBlockSummary(nodeType, block.TipeBlock, payload)}
                                                    </p>

                                                    <div className="block-hash-row">
                                                        <span className="hash-label">Hash:</span>
                                                        <span className="hash-value">{truncHash(block.CurrentHash)}</span>
                                                    </div>

                                                    {isSelected && (
                                                        <div className="block-expanded">
                                                            <div className="block-detail-grid">
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Kode Block</span>
                                                                    <span className="detail-value">{block.KodeBlock}</span>
                                                                </div>
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Previous Hash</span>
                                                                    <span className="detail-value hash-mono">{truncHash(block.PreviousHash)}</span>
                                                                </div>
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Current Hash</span>
                                                                    <span className="detail-value hash-mono">{truncHash(block.CurrentHash)}</span>
                                                                </div>
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Status</span>
                                                                    <span className="detail-value">{block.StatusBlock}</span>
                                                                </div>
                                                                <div className="block-detail-item">
                                                                    <span className="detail-label">Nonce</span>
                                                                    <span className="detail-value">{block.Nonce}</span>
                                                                </div>
                                                            </div>
                                                            <div className="block-payload">
                                                                <span className="payload-title">Data Payload</span>
                                                                <pre className="payload-json">
                                                                    {JSON.stringify(payload, null, 2)}
                                                                </pre>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}

                                <div className="timeline-end-marker">
                                    <div className="end-marker-dot" />
                                    <span>End of Chain • {blocks.length} blocks</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

// ============================================================================
// BLOCK SUMMARY HELPERS
// ============================================================================

function getBlockSummary(nodeType, tipeBlock, payload) {
    if (!payload) return tipeBlock

    if (nodeType === 'NODE_KURIR') {
        switch (tipeBlock) {
            case 'GENESIS':
                return `Pengiriman dimulai: ${payload.asal_pengirim || '?'} → ${payload.tujuan_penerima || '?'}`
            case 'LINK_UPSTREAM':
                return `⛓️ Linked to ${payload.upstream_node || 'upstream'}: ${payload.upstream_peternakan || '?'} (${payload.upstream_total_blocks || '?'} blocks)`
            case 'PICKUP_FARM':
                return `Pickup dari peternakan: ${payload.berat_total_kg || '?'} kg (${payload.jumlah_barang || '?'} item)`
            case 'DELIVERY_PROCESSOR':
                return `Diterima processor: ${payload.nama_penerima_processor || '?'} (kondisi: ${payload.kondisi_barang || '?'})`
            case 'PICKUP_PROCESSOR':
                return `Pickup dari processor: ${payload.berat_total_kg || '?'} kg`
            case 'DELIVERY_RETAILER':
                return `Diterima retailer: ${payload.nama_penerima_retailer || '?'} (kondisi: ${payload.kondisi_barang || '?'})`
            default:
                return tipeBlock
        }
    }

    if (nodeType === 'NODE_PROCESSOR') {
        switch (tipeBlock) {
            case 'RECEIVE_FROM_FARM':
                return `Diterima dari peternakan: ${payload.nama_peternakan || payload.peternakan || '?'}`
            case 'NOTA_PENERIMAAN':
                return `Nota penerimaan: ${payload.kode_nota || '?'} - ${payload.jumlah_diterima || '?'} ${payload.satuan || 'ekor'}`
            case 'PROCESSING':
                return `Processing: ${payload.kode_produksi || '?'} (${payload.tipe_processing || '?'})`
            case 'HALAL_CHECK':
                return `Halal check: ${payload.status_halal || payload.result || '?'}`
            case 'QUALITY_CHECK':
                return `Quality check: ${payload.status_qc || payload.result || '?'}`
            case 'LAPORAN_MASALAH':
                return `Masalah: ${payload.jenis_masalah || '?'} - ${payload.keterangan || '?'}`
            case 'TRANSFER_TO_RETAIL':
                return `Transfer ke retail: ${payload.tujuan || payload.nama_toko || '?'}`
            default:
                return tipeBlock
        }
    }

    if (nodeType === 'NODE_RETAILER') {
        switch (tipeBlock) {
            case 'RECEIVE_FROM_PROCESSOR':
                return `Diterima dari processor: ${payload.nama_processor || payload.processor || '?'} (${payload.jumlah_diterima || '?'} ${payload.satuan || 'kg'})`
            case 'NOTA_PENERIMAAN':
                return `Nota penerimaan: ${payload.kode_nota || '?'} - ${payload.jumlah_diterima || '?'} ${payload.satuan || 'kg'}`
            case 'STOCK_IN':
                return `Stok masuk gudang: ${payload.nama_produk || '?'} (${payload.jumlah || '?'} ${payload.satuan || 'kg'})`
            case 'SALE_RECORDED':
                return `Penjualan: ${payload.kode_penjualan || '?'} - Rp ${Number(payload.total_harga || 0).toLocaleString('id')}`
            case 'STOCK_OUT':
                return `Stok keluar: ${payload.nama_produk || '?'} (${payload.jumlah || '?'} ${payload.satuan || 'kg'})`
            default:
                return tipeBlock
        }
    }

    // NODE_PETERNAKAN
    switch (tipeBlock) {
        case 'GENESIS':
            return `Cycle dimulai (durasi: ${payload.durasi_cycle || '?'} hari)`
        case 'KANDANG_AKTIF':
            return `Kandang ${payload.kode_kandang || '?'} diaktifkan (${payload.panjang || '?'}m × ${payload.lebar || '?'}m)`
        case 'DOC_MASUK':
            return `${payload.jumlah_diterima || '?'} ekor DOC masuk (${payload.brand_doc || '?'} - ${payload.tipe_ayam || '?'})`
        case 'LAPORAN_MORTALITY':
            return `Mortality: ${payload.jumlah_mati || '?'} mati, ${payload.jumlah_reject || 0} reject (rate: ${payload.mortality_rate_percent || '?'}%)`
        case 'PEMAKAIAN_OBAT':
            return `Obat ${payload.jenis_obat || '?'} (dosis: ${payload.dosis || '?'}) - ${payload.jumlah_obat || '?'} unit`
        case 'PANEN':
            return `Panen sukses: ${payload.total_berat_kg || '?'} kg (Rp ${Number(payload.total_harga || 0).toLocaleString('id')})`
        case 'PANEN_DINI':
            return `Panen dini hari ke-${payload.durasi_aktual_hari || '?'}: ${payload.total_berat_kg || '?'} kg`
        case 'GAGAL_PANEN':
            return `Gagal panen (mortality: ${payload.mortality_rate_final || '?'}%)`
        case 'TRANSFER_PROCESSOR':
            return `Transfer ke ${payload.perusahaan_pengiriman || 'Processor'} → ${payload.alamat_tujuan || '?'}`
        default:
            return tipeBlock
    }
}

export default AdminPanelBlockchain
