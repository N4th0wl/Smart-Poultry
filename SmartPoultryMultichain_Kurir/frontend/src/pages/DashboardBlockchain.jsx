import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { LoadingState, EmptyState, KPICard } from '../components'
import { blockchainService } from '../services'
import '../styles/Blockchain.css'

// Block type config for Kurir blocks
const KURIR_BLOCK_CONFIG = {
    GENESIS: { label: 'Genesis', icon: '🔗', color: '#6366f1' },
    LINK_UPSTREAM: { label: 'Link Peternakan', icon: '⛓️', color: '#8b5cf6' },
    PICKUP_FARM: { label: 'Pickup Farm', icon: '📦', color: '#22c55e' },
    DELIVERY_PROCESSOR: { label: 'Delivery Processor', icon: '🏭', color: '#3b82f6' },
    PICKUP_PROCESSOR: { label: 'Pickup Processor', icon: '📦', color: '#f59e0b' },
    DELIVERY_RETAILER: { label: 'Delivery Retailer', icon: '🏪', color: '#ec4899' },
}

// Block type config for Peternakan blocks
const PETERNAKAN_BLOCK_CONFIG = {
    GENESIS: { label: 'Genesis', icon: '🔗', color: '#6366f1' },
    KANDANG_AKTIF: { label: 'Kandang Aktif', icon: '🏠', color: '#10b981' },
    DOC_MASUK: { label: 'DOC Masuk', icon: '🐣', color: '#f59e0b' },
    LAPORAN_MORTALITY: { label: 'Mortality', icon: '💀', color: '#ef4444' },
    PEMAKAIAN_OBAT: { label: 'Pemakaian Obat', icon: '💊', color: '#8b5cf6' },
    PANEN: { label: 'Panen', icon: '✅', color: '#22c55e' },
    PANEN_DINI: { label: 'Panen Dini', icon: '⚠️', color: '#eab308' },
    GAGAL_PANEN: { label: 'Gagal Panen', icon: '❌', color: '#dc2626' },
    TRANSFER_PROCESSOR: { label: 'Transfer', icon: '🚛', color: '#3b82f6' },
}

function DashboardBlockchain() {
    const [chains, setChains] = useState([])
    const [stats, setStats] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [crossChainData, setCrossChainData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [traceLoading, setTraceLoading] = useState(false)
    const [crossChainStatus, setCrossChainStatus] = useState(null)
    const [viewMode, setViewMode] = useState('unified') // 'unified' | 'kurir' | 'peternakan'

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [chainsData, statsData] = await Promise.all([
                blockchainService.getChains(),
                blockchainService.getStats()
            ])
            setChains(chainsData)
            setStats(statsData)

            // Check cross-chain status
            try {
                const status = await blockchainService.getCrossChainStatus()
                setCrossChainStatus(status)
            } catch (e) {
                setCrossChainStatus({ crossChainEnabled: false, peternakanDbConnected: false })
            }
        } catch (error) {
            toast.error('Gagal memuat data blockchain')
        } finally {
            setLoading(false)
        }
    }

    const handleViewChain = async (chain) => {
        setSelectedChain(chain)
        setTraceLoading(true)
        setCrossChainData(null)
        try {
            // Try cross-chain first
            const data = await blockchainService.getCrossChain(chain.KodePengiriman)
            setCrossChainData(data)
        } catch (error) {
            // Fallback to kurir-only trace
            try {
                const traceData = await blockchainService.getTrace(chain.KodePengiriman)
                setCrossChainData({
                    kurirChain: traceData,
                    peternakanChain: null,
                    crossChainValid: false,
                    crossChainMessage: 'Cross-chain data tidak tersedia',
                    unifiedTimeline: traceData.timeline?.map(t => ({
                        ...t,
                        node: 'NODE_KURIR',
                        nodeLabel: '🚛 Kurir'
                    })) || [],
                    supplyChainNodes: [{
                        node: 'NODE_KURIR',
                        label: 'Kurir',
                        icon: '🚛',
                        status: traceData.chain?.statusChain,
                        totalBlocks: traceData.blocks?.length || 0,
                        chainValid: traceData.validation?.valid,
                        identity: traceData.chain?.kodeIdentity,
                        name: traceData.chain?.perusahaanKurir
                    }]
                })
            } catch (e2) {
                toast.error('Gagal memuat data traceability')
            }
        } finally {
            setTraceLoading(false)
        }
    }

    const handleValidate = async () => {
        if (!selectedChain) return
        try {
            const result = await blockchainService.validate(selectedChain.KodePengiriman)
            if (result.valid) {
                toast.success(`${result.message} (${result.totalBlocks} blocks)`)
            } else {
                toast.error(result.message)
            }
        } catch (error) {
            toast.error('Validasi gagal')
        }
    }

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-'
        try {
            return new Date(dateStr).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            })
        } catch { return dateStr }
    }

    const getBlockConfig = (node, type) => {
        if (node === 'NODE_PETERNAKAN') {
            return PETERNAKAN_BLOCK_CONFIG[type] || { label: type, icon: '📦', color: '#6b7280' }
        }
        return KURIR_BLOCK_CONFIG[type] || { label: type, icon: '📦', color: '#6b7280' }
    }

    // Filter timeline by viewMode
    const getFilteredTimeline = () => {
        if (!crossChainData) return []
        const timeline = crossChainData.unifiedTimeline || []
        if (viewMode === 'unified') return timeline
        if (viewMode === 'kurir') return timeline.filter(t => t.node === 'NODE_KURIR')
        if (viewMode === 'peternakan') return timeline.filter(t => t.node === 'NODE_PETERNAKAN')
        return timeline
    }

    if (loading) return <LoadingState />

    return (
        <div>
            <div className="page-header">
                <h2>Blockchain Traceability</h2>
                {crossChainStatus && (
                    <div className={`cross-chain-indicator ${crossChainStatus.peternakanDbConnected ? 'connected' : 'disconnected'}`}>
                        <span className="indicator-dot" />
                        {crossChainStatus.peternakanDbConnected
                            ? 'Cross-chain: Connected'
                            : 'Cross-chain: Offline'}
                    </div>
                )}
            </div>

            <div className="kpi-grid">
                <KPICard label="Total Chains" value={stats?.totalChains || 0} accent />
                <KPICard label="Active Chains" value={stats?.activeChains || 0} />
                <KPICard label="Completed" value={stats?.completedChains || 0} />
                <KPICard label="Total Blocks" value={stats?.totalBlocks || 0} accent />
                <KPICard label="Linked Chains" value={stats?.linkedChains || 0} />
            </div>

            <div className="blockchain-layout">
                {/* Chain List */}
                <div className="section-card chain-list-card">
                    <h3>Supply Chain List</h3>
                    {chains.length === 0 ? (
                        <EmptyState message="Belum ada chain" icon="🔗" />
                    ) : (
                        <div className="chain-list">
                            {chains.map(c => (
                                <button
                                    key={c.IdIdentity}
                                    className={`chain-item ${selectedChain?.IdIdentity === c.IdIdentity ? 'selected' : ''}`}
                                    onClick={() => handleViewChain(c)}
                                >
                                    <div className="chain-item-top">
                                        <span className="chain-code">{c.KodeIdentity}</span>
                                        <span className={`badge ${c.StatusChain === 'ACTIVE' ? 'badge-active' : c.StatusChain === 'COMPLETED' ? 'badge-completed' : 'badge-failed'}`}>
                                            {c.StatusChain}
                                        </span>
                                    </div>
                                    <div className="chain-item-bottom">
                                        <span>Pengiriman: {c.KodePengiriman}</span>
                                        <span>{c.TotalBlocks} blocks</span>
                                    </div>
                                    {c.UpstreamCycleId && (
                                        <div className="chain-upstream-tag">
                                            ⛓️ Linked to Cycle #{c.UpstreamCycleId}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Trace Detail */}
                <div className="section-card chain-detail-card">
                    {!selectedChain ? (
                        <div className="chain-placeholder">
                            <span>🔍</span>
                            <p>Pilih chain untuk melihat detail</p>
                        </div>
                    ) : traceLoading ? (
                        <LoadingState message="Memuat cross-chain traceability..." />
                    ) : crossChainData ? (
                        <div className="trace-detail">
                            {/* Header */}
                            <div className="trace-header">
                                <div>
                                    <h3>{crossChainData.kurirChain?.chain?.kodeIdentity || 'Chain'}</h3>
                                    <p className="trace-sub">
                                        {crossChainData.kurirChain?.chain?.perusahaanKurir || ''} • Multi-Node Supply Chain
                                    </p>
                                </div>
                                <button className="ghost-button" onClick={handleValidate}>🔒 Validasi</button>
                            </div>

                            {/* Supply Chain Nodes Overview */}
                            {crossChainData.supplyChainNodes && crossChainData.supplyChainNodes.length > 0 && (
                                <div className="supply-chain-nodes">
                                    {crossChainData.supplyChainNodes.map((node, i) => (
                                        <div key={i} className="supply-node">
                                            {i > 0 && <div className="supply-node-arrow">→</div>}
                                            <div className={`supply-node-card ${node.chainValid ? 'valid' : 'invalid'}`}>
                                                <span className="supply-node-icon">{node.icon}</span>
                                                <div className="supply-node-info">
                                                    <span className="supply-node-label">{node.label}</span>
                                                    <span className="supply-node-name">{node.name || '-'}</span>
                                                    <span className="supply-node-blocks">
                                                        {node.totalBlocks} blocks •
                                                        <span className={`supply-node-status status-${node.status?.toLowerCase()}`}>
                                                            {node.status}
                                                        </span>
                                                    </span>
                                                </div>
                                                <span className={`supply-node-check ${node.chainValid ? '' : 'invalid'}`}>
                                                    {node.chainValid ? '✓' : '✕'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Cross-Chain Validation */}
                            {crossChainData.peternakanChain && (
                                <div className={`cross-chain-validation ${crossChainData.crossChainValid ? 'valid' : 'warning'}`}>
                                    <span className="ccv-icon">
                                        {crossChainData.crossChainValid ? '⛓️' : '⚠️'}
                                    </span>
                                    <div className="ccv-info">
                                        <strong>Cross-Chain Link</strong>
                                        <p>{crossChainData.crossChainMessage}</p>
                                    </div>
                                </div>
                            )}

                            {/* Kurir-only validation */}
                            <div className="trace-validation">
                                {crossChainData.kurirChain?.validation?.valid ? (
                                    <div className="validation-ok">
                                        <span>✓</span> {crossChainData.kurirChain.validation.message}
                                    </div>
                                ) : (
                                    <div className="validation-err">
                                        <span>✕</span> {crossChainData.kurirChain?.validation?.message || 'Unknown'}
                                    </div>
                                )}
                            </div>

                            {/* View Mode Tabs */}
                            <div className="timeline-tabs">
                                <button
                                    className={`timeline-tab ${viewMode === 'unified' ? 'active' : ''}`}
                                    onClick={() => setViewMode('unified')}
                                >
                                    🌐 Unified Timeline
                                </button>
                                {crossChainData.peternakanChain && (
                                    <button
                                        className={`timeline-tab ${viewMode === 'peternakan' ? 'active' : ''}`}
                                        onClick={() => setViewMode('peternakan')}
                                    >
                                        🏗️ Peternakan ({crossChainData.peternakanChain.blocks?.length || 0})
                                    </button>
                                )}
                                <button
                                    className={`timeline-tab ${viewMode === 'kurir' ? 'active' : ''}`}
                                    onClick={() => setViewMode('kurir')}
                                >
                                    🚛 Kurir ({crossChainData.kurirChain?.blocks?.length || 0})
                                </button>
                            </div>

                            {/* Unified Timeline */}
                            <h4 className="trace-section-title">
                                {viewMode === 'unified' ? 'Full Supply Chain Timeline' :
                                    viewMode === 'peternakan' ? 'Peternakan Chain Blocks' :
                                        'Kurir Chain Blocks'}
                            </h4>
                            <div className="trace-timeline">
                                {getFilteredTimeline().map((t, i) => {
                                    const conf = getBlockConfig(t.node, t.type)
                                    return (
                                        <div key={i} className={`timeline-item ${t.node === 'NODE_PETERNAKAN' ? 'node-peternakan' : 'node-kurir'}`}>
                                            <div className="timeline-dot" style={{ background: conf.color }} />
                                            <div className="timeline-content">
                                                <div className="timeline-top">
                                                    <div className="timeline-badges">
                                                        <span className="timeline-node-badge" style={{
                                                            background: t.node === 'NODE_PETERNAKAN' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                                            color: t.node === 'NODE_PETERNAKAN' ? '#168a48' : '#1a5cc7',
                                                            border: t.node === 'NODE_PETERNAKAN' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(59,130,246,0.3)'
                                                        }}>
                                                            {t.nodeLabel || t.node}
                                                        </span>
                                                        <span className={`badge badge-block-${t.type?.toLowerCase()}`} style={{
                                                            background: `${conf.color}15`,
                                                            color: conf.color,
                                                            border: `1px solid ${conf.color}40`
                                                        }}>
                                                            {conf.icon} {conf.label}
                                                        </span>
                                                    </div>
                                                    <span className="timeline-hash" title={t.hash}>#{t.hash}...</span>
                                                </div>
                                                <p className="timeline-summary">{t.summary}</p>
                                                <span className="timeline-time">{formatDateTime(t.timestamp)}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                                {getFilteredTimeline().length === 0 && (
                                    <div className="blockchain-empty-mini">
                                        <p>Tidak ada block untuk filter ini</p>
                                    </div>
                                )}
                            </div>

                            {/* Block Details */}
                            <h4 className="trace-section-title">Block Details (Kurir)</h4>
                            <div className="block-list">
                                {crossChainData.kurirChain?.blocks?.map((b, i) => {
                                    let payload = b.DataPayload
                                    if (typeof payload === 'string') {
                                        try { payload = JSON.parse(payload) } catch (e) { /* noop */ }
                                    }
                                    const conf = KURIR_BLOCK_CONFIG[b.TipeBlock] || { label: b.TipeBlock, icon: '📦', color: '#6b7280' }
                                    return (
                                        <div key={i} className={`block-card ${b.TipeBlock === 'LINK_UPSTREAM' ? 'block-card-link' : ''}`}>
                                            <div className="block-card-header">
                                                <span className="block-index">Block #{b.BlockIndex}</span>
                                                <span className="block-type" style={{ color: conf.color }}>
                                                    {conf.icon} {conf.label}
                                                </span>
                                            </div>
                                            <div className="block-hash-row">
                                                <span className="hash-label">Prev:</span>
                                                <span className="hash-value">{b.PreviousHash?.substring(0, 24)}...</span>
                                            </div>
                                            <div className="block-hash-row">
                                                <span className="hash-label">Hash:</span>
                                                <span className="hash-value">{b.CurrentHash?.substring(0, 24)}...</span>
                                            </div>
                                            <div className="block-payload">
                                                <pre>{JSON.stringify(payload, null, 2)}</pre>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Upstream Peternakan Blocks */}
                            {crossChainData.peternakanChain && crossChainData.peternakanChain.blocks?.length > 0 && (
                                <>
                                    <h4 className="trace-section-title" style={{ marginTop: '32px' }}>
                                        🏗️ Block Details (Peternakan - Upstream)
                                    </h4>
                                    <div className="upstream-chain-info">
                                        <div className="upstream-info-row">
                                            <span>Peternakan:</span>
                                            <strong>{crossChainData.peternakanChain.chain?.peternakan || '-'}</strong>
                                        </div>
                                        <div className="upstream-info-row">
                                            <span>Lokasi:</span>
                                            <strong>{crossChainData.peternakanChain.chain?.lokasi || '-'}</strong>
                                        </div>
                                        <div className="upstream-info-row">
                                            <span>Cycle:</span>
                                            <strong>#{crossChainData.peternakanChain.chain?.kodeCycle || '-'}</strong>
                                        </div>
                                        <div className="upstream-info-row">
                                            <span>Status:</span>
                                            <strong>{crossChainData.peternakanChain.chain?.statusChain || '-'}</strong>
                                        </div>
                                        {crossChainData.peternakanChain.validation && (
                                            <div className={`upstream-validation ${crossChainData.peternakanChain.validation.valid ? 'valid' : 'invalid'}`}>
                                                {crossChainData.peternakanChain.validation.valid ? '✓' : '✕'}
                                                {' '}{crossChainData.peternakanChain.validation.message}
                                            </div>
                                        )}
                                    </div>
                                    <div className="block-list">
                                        {crossChainData.peternakanChain.blocks.map((b, i) => {
                                            let payload = b.DataPayload
                                            if (typeof payload === 'string') {
                                                try { payload = JSON.parse(payload) } catch (e) { /* noop */ }
                                            }
                                            const conf = PETERNAKAN_BLOCK_CONFIG[b.TipeBlock] || { label: b.TipeBlock, icon: '📦', color: '#6b7280' }
                                            return (
                                                <div key={i} className="block-card block-card-upstream">
                                                    <div className="block-card-header">
                                                        <span className="block-index">Block #{b.BlockIndex}</span>
                                                        <span className="block-type" style={{ color: conf.color }}>
                                                            {conf.icon} {conf.label}
                                                        </span>
                                                    </div>
                                                    <div className="block-hash-row">
                                                        <span className="hash-label">Prev:</span>
                                                        <span className="hash-value">{b.PreviousHash?.substring(0, 24)}...</span>
                                                    </div>
                                                    <div className="block-hash-row">
                                                        <span className="hash-label">Hash:</span>
                                                        <span className="hash-value">{b.CurrentHash?.substring(0, 24)}...</span>
                                                    </div>
                                                    <div className="block-payload">
                                                        <pre>{JSON.stringify(payload, null, 2)}</pre>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export default DashboardBlockchain
