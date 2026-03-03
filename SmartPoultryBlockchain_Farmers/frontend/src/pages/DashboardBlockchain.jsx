import { useState, useEffect, useCallback } from 'react'
import blockchainService from '../services/blockchainService'
import toast from 'react-hot-toast'
import '../styles/DashboardBlockchain.css'

// Block type configuration
const BLOCK_TYPE_CONFIG = {
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

const STATUS_CHAIN_CONFIG = {
    ACTIVE: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED: { label: 'Completed', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    FAILED: { label: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    TRANSFERRED: { label: 'Transferred', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
}

function DashboardBlockchain() {
    const [overview, setOverview] = useState(null)
    const [chains, setChains] = useState([])
    const [selectedCycleId, setSelectedCycleId] = useState(null)
    const [blocks, setBlocks] = useState([])
    const [selectedBlock, setSelectedBlock] = useState(null)
    const [validation, setValidation] = useState(null)
    const [loading, setLoading] = useState({ overview: true, chains: false, blocks: false })
    const [view, setView] = useState('overview') // overview | chain-detail

    // Load overview data
    const loadOverview = useCallback(async () => {
        setLoading(prev => ({ ...prev, overview: true }))
        try {
            const data = await blockchainService.getOverview()
            setOverview(data)
            setChains(data.chains || [])
        } catch (error) {
            toast.error('Gagal memuat data blockchain')
        } finally {
            setLoading(prev => ({ ...prev, overview: false }))
        }
    }, [])

    useEffect(() => {
        loadOverview()
    }, [loadOverview])

    // Load blocks for a chain
    const loadBlocks = async (cycleId) => {
        setLoading(prev => ({ ...prev, blocks: true }))
        try {
            const data = await blockchainService.getBlocks(cycleId)
            setBlocks(data)
            setSelectedBlock(null)
            setValidation(null)
        } catch (error) {
            toast.error('Gagal memuat blocks')
        } finally {
            setLoading(prev => ({ ...prev, blocks: false }))
        }
    }

    // Select a chain to view detail
    const handleSelectChain = (cycleId) => {
        setSelectedCycleId(cycleId)
        setView('chain-detail')
        loadBlocks(cycleId)
    }

    // Validate chain
    const handleValidate = async () => {
        if (!selectedCycleId) return
        try {
            const result = await blockchainService.validateChain(selectedCycleId)
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

    // Back to overview
    const handleBack = () => {
        setView('overview')
        setSelectedCycleId(null)
        setBlocks([])
        setSelectedBlock(null)
        setValidation(null)
    }

    // Get current chain data
    const currentChain = chains.find(c => c.KodeCycle === selectedCycleId || c.KodeCycle === parseInt(selectedCycleId))

    // Format date
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

    // Truncate hash for display
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
                        <h1 id="blockchain-title">Blockchain Ledger</h1>
                        <p className="blockchain-subtitle">
                            Node Peternakan • Multi-Chain Supply Tracking
                        </p>
                    </div>
                </div>
                {view === 'chain-detail' && (
                    <button className="blockchain-back-btn" onClick={handleBack}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Kembali
                    </button>
                )}
            </div>

            {/* Node Info Banner */}
            <div className="blockchain-node-banner">
                <div className="node-banner-item">
                    <span className="node-label">Node Type</span>
                    <span className="node-value">🏗️ Peternakan (Farm)</span>
                </div>
                <div className="node-banner-divider" />
                <div className="node-banner-item">
                    <span className="node-label">Position</span>
                    <span className="node-value">Node #1 (Origin)</span>
                </div>
                <div className="node-banner-divider" />
                <div className="node-banner-item">
                    <span className="node-label">Chain Flow</span>
                    <span className="node-value node-flow">
                        <span className="node-active-label">Peternakan</span>
                        <span className="node-arrow">→</span>
                        <span>Processor</span>
                        <span className="node-arrow">→</span>
                        <span>Retailer</span>
                        <span className="node-arrow">→</span>
                        <span>Consumer</span>
                    </span>
                </div>
            </div>

            {view === 'overview' && (
                <>
                    {/* Stats Cards */}
                    {overview && (
                        <div className="blockchain-stats-grid">
                            <div className="bc-stat-card bc-stat-total">
                                <div className="bc-stat-icon">🔗</div>
                                <div className="bc-stat-info">
                                    <span className="bc-stat-value">{overview.totalChains}</span>
                                    <span className="bc-stat-label">Total Chains</span>
                                </div>
                            </div>
                            <div className="bc-stat-card bc-stat-active">
                                <div className="bc-stat-icon">🟢</div>
                                <div className="bc-stat-info">
                                    <span className="bc-stat-value">{overview.activeChains}</span>
                                    <span className="bc-stat-label">Active</span>
                                </div>
                            </div>
                            <div className="bc-stat-card bc-stat-completed">
                                <div className="bc-stat-icon">✅</div>
                                <div className="bc-stat-info">
                                    <span className="bc-stat-value">{overview.completedChains}</span>
                                    <span className="bc-stat-label">Completed</span>
                                </div>
                            </div>
                            <div className="bc-stat-card bc-stat-transferred">
                                <div className="bc-stat-icon">🚛</div>
                                <div className="bc-stat-info">
                                    <span className="bc-stat-value">{overview.transferredChains}</span>
                                    <span className="bc-stat-label">Transferred</span>
                                </div>
                            </div>
                            <div className="bc-stat-card bc-stat-blocks">
                                <div className="bc-stat-icon">📦</div>
                                <div className="bc-stat-info">
                                    <span className="bc-stat-value">{overview.totalBlocks}</span>
                                    <span className="bc-stat-label">Total Blocks</span>
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
                            Blockchain Chains
                        </h2>

                        {loading.overview ? (
                            <div className="blockchain-loading">
                                <div className="blockchain-spinner" />
                                <p>Memuat data blockchain...</p>
                            </div>
                        ) : chains.length === 0 ? (
                            <div className="blockchain-empty">
                                <div className="blockchain-empty-icon">🔗</div>
                                <h3>Belum ada blockchain chain</h3>
                                <p>Chain akan dibuat otomatis saat Anda membuat kandang baru dan memulai cycle peternakan.</p>
                            </div>
                        ) : (
                            <div className="blockchain-chain-list">
                                {chains.map((chain) => {
                                    const statusConf = STATUS_CHAIN_CONFIG[chain.StatusChain] || STATUS_CHAIN_CONFIG.ACTIVE
                                    return (
                                        <div
                                            key={chain.KodeCycle}
                                            className="blockchain-chain-card"
                                            onClick={() => handleSelectChain(chain.KodeCycle)}
                                        >
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
                                                <div className="chain-meta-row">
                                                    <span className="chain-meta-label">Cycle</span>
                                                    <span className="chain-meta-value">#{chain.KodeCycle}</span>
                                                </div>
                                                {chain.KodeKandang && (
                                                    <div className="chain-meta-row">
                                                        <span className="chain-meta-label">Kandang</span>
                                                        <span className="chain-meta-value">{chain.KodeKandang}</span>
                                                    </div>
                                                )}
                                                {chain.BrandDOC && (
                                                    <div className="chain-meta-row">
                                                        <span className="chain-meta-label">DOC</span>
                                                        <span className="chain-meta-value">{chain.BrandDOC} ({chain.TipeAyam})</span>
                                                    </div>
                                                )}
                                                <div className="chain-meta-row">
                                                    <span className="chain-meta-label">Mulai</span>
                                                    <span className="chain-meta-value">{formatDate(chain.TanggalMulai || chain.CreatedAt)}</span>
                                                </div>
                                                {chain.DurasiCycle && (
                                                    <div className="chain-meta-row">
                                                        <span className="chain-meta-label">Durasi</span>
                                                        <span className="chain-meta-value">{chain.DurasiCycle} hari</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="chain-card-footer">
                                                <span className="chain-hash-preview">
                                                    Genesis: {truncHash(chain.GenesisHash)}
                                                </span>
                                                <span className="chain-view-btn">
                                                    Lihat Detail →
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

            {view === 'chain-detail' && selectedCycleId && (
                <div className="blockchain-detail-view">
                    {/* Chain Info Header */}
                    {currentChain && (
                        <div className="chain-detail-header">
                            <div className="chain-detail-info">
                                <h2>{currentChain.KodeIdentity}</h2>
                                <div className="chain-detail-meta">
                                    <span className="chain-status-badge" style={{
                                        color: (STATUS_CHAIN_CONFIG[currentChain.StatusChain] || {}).color,
                                        background: (STATUS_CHAIN_CONFIG[currentChain.StatusChain] || {}).bg
                                    }}>
                                        {(STATUS_CHAIN_CONFIG[currentChain.StatusChain] || {}).label}
                                    </span>
                                    <span>Cycle #{currentChain.KodeCycle}</span>
                                    <span>•</span>
                                    <span>{formatDate(currentChain.TanggalMulai || currentChain.CreatedAt)}</span>
                                    {currentChain.DurasiCycle && <span>• {currentChain.DurasiCycle} hari</span>}
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

                    {/* Block Chain Visualization */}
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
                                <p>Tidak ada blocks ditemukan untuk chain ini.</p>
                            </div>
                        ) : (
                            <div className="blockchain-timeline">
                                {blocks.map((block, idx) => {
                                    const conf = BLOCK_TYPE_CONFIG[block.TipeBlock] || { label: block.TipeBlock, color: '#6b7280', icon: '📦' }
                                    const isSelected = selectedBlock && selectedBlock.KodeBlock === block.KodeBlock
                                    const payload = typeof block.DataPayload === 'string' ? JSON.parse(block.DataPayload) : block.DataPayload

                                    return (
                                        <div key={block.KodeBlock} className="timeline-item-wrapper">
                                            {/* Connector line */}
                                            {idx > 0 && (
                                                <div className="timeline-connector">
                                                    <div className="connector-line" />
                                                    <div className="connector-hash">
                                                        {block.PreviousHash ? block.PreviousHash.substring(0, 8) : '...'}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Block Card */}
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

                                                    {/* Summary */}
                                                    <p className="block-summary">
                                                        {getBlockSummary(block.TipeBlock, payload)}
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

function getBlockSummary(tipeBlock, payload) {
    if (!payload) return tipeBlock
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
            return `Obat ${payload.jenis_obat || '?'} (dosis: ${payload.dosis || '?'}) - ${payload.jumlah_obat || '?'} unit (mortality rate: ${payload.mortality_rate_at_usage || '?'}%)`
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

export default DashboardBlockchain
