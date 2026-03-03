import { useState, useEffect, useCallback } from 'react'
import adminService from '../services/adminService'
import { useToast } from '../components/ToastProvider'
import '../styles/AdminDashboard.css'

// Block type configuration for Processor
const BLOCK_TYPE_CONFIG = {
    RECEIVE_FROM_FARM: { label: 'Penerimaan dari Farm', color: '#2563eb', icon: '📦' },
    NOTA_PENERIMAAN: { label: 'Nota Penerimaan', color: '#7c3aed', icon: '📋' },
    PROCESSING: { label: 'Produksi', color: '#d97706', icon: '🏭' },
    HALAL_CHECK: { label: 'Sertifikat Halal', color: '#059669', icon: '☪️' },
    QUALITY_CHECK: { label: 'Quality Control', color: '#0891b2', icon: '✅' },
    LAPORAN_MASALAH: { label: 'Laporan Masalah', color: '#dc2626', icon: '⚠️' },
    TRANSFER_TO_RETAIL: { label: 'Kirim ke Retail', color: '#16a34a', icon: '🚚' },
}

const STATUS_CHAIN_CONFIG = {
    ACTIVE: { label: 'Active', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    COMPLETED: { label: 'Completed', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    FAILED: { label: 'Failed', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    TRANSFERRED: { label: 'Transferred', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
}

function AdminPanelBlockchain() {
    const [overview, setOverview] = useState(null)
    const [chains, setChains] = useState([])
    const [selectedChainId, setSelectedChainId] = useState(null)
    const [blocks, setBlocks] = useState([])
    const [selectedBlock, setSelectedBlock] = useState(null)
    const [validation, setValidation] = useState(null)
    const [loading, setLoading] = useState({ overview: true, blocks: false })
    const [view, setView] = useState('overview')
    const [searchQuery, setSearchQuery] = useState('')
    const { showToast } = useToast()

    // Load overview data
    const loadOverview = useCallback(async () => {
        setLoading(prev => ({ ...prev, overview: true }))
        try {
            const data = await adminService.getBlockchainOverview(searchQuery)
            setOverview(data)
            setChains(data.chains || [])
        } catch (error) {
            showToast({ title: 'Error', description: 'Gagal memuat data blockchain', status: 'error' })
        } finally {
            setLoading(prev => ({ ...prev, overview: false }))
        }
    }, [searchQuery])

    useEffect(() => {
        const timer = setTimeout(() => {
            loadOverview()
        }, 300)
        return () => clearTimeout(timer)
    }, [loadOverview])

    // Load blocks for a chain
    const loadBlocks = async (identityId) => {
        setLoading(prev => ({ ...prev, blocks: true }))
        try {
            const data = await adminService.getBlocks(identityId)
            setBlocks(data)
            setSelectedBlock(null)
            setValidation(null)
        } catch (error) {
            showToast({ title: 'Error', description: 'Gagal memuat blocks', status: 'error' })
        } finally {
            setLoading(prev => ({ ...prev, blocks: false }))
        }
    }

    const handleSelectChain = (identityId) => {
        setSelectedChainId(identityId)
        setView('chain-detail')
        loadBlocks(identityId)
    }

    const handleValidate = async () => {
        if (!selectedChainId) return
        try {
            const result = await adminService.validateChain(selectedChainId)
            setValidation(result)
            if (result.valid) {
                showToast({ title: '✓ Valid', description: 'Chain valid! Integritas terjaga.', status: 'success' })
            } else {
                showToast({ title: 'Invalid', description: `Chain tidak valid: ${result.message}`, status: 'error' })
            }
        } catch (error) {
            showToast({ title: 'Error', description: 'Gagal memvalidasi chain', status: 'error' })
        }
    }

    const handleBack = () => {
        setView('overview')
        setSelectedChainId(null)
        setBlocks([])
        setSelectedBlock(null)
        setValidation(null)
    }

    const currentChain = chains.find(c => c.IdIdentity === selectedChainId || c.IdIdentity === parseInt(selectedChainId))

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
        <div className="admin-page">
            {/* Page Header */}
            <div className="admin-page-header">
                <div className="admin-header-content">
                    <div className="admin-header-icon">
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
                        <h1 id="admin-blockchain-title">Monitoring Blockchain</h1>
                        <p className="admin-subtitle">
                            Admin Panel • Semua Chain dari Seluruh Processor
                        </p>
                    </div>
                </div>
                {view === 'chain-detail' && (
                    <button className="admin-create-btn" onClick={handleBack} style={{ background: 'var(--panel)', color: 'var(--ink)', border: '1.5px solid var(--border)', boxShadow: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12" />
                            <polyline points="12 19 5 12 12 5" />
                        </svg>
                        Kembali
                    </button>
                )}
            </div>

            {/* Search Bar (only on overview) */}
            {view === 'overview' && (
                <div className="admin-search-container">
                    <div className="admin-search-wrapper">
                        <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            className="admin-search-input"
                            placeholder="Cari berdasarkan kode chain, nama processor, status, atau order..."
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
                    <span className="admin-search-count">{chains.length} chain ditemukan</span>
                </div>
            )}

            {/* Node Info Banner */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 20,
                padding: '14px 20px', borderRadius: 14,
                background: 'linear-gradient(135deg, rgba(139,26,26,0.06), rgba(165,36,34,0.03))',
                border: '1px solid rgba(139,26,26,0.08)', flexWrap: 'wrap',
            }}>
                <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>View Mode</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>🛡️ Admin Monitoring</div>
                </div>
                <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
                <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Scope</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Seluruh Processor</div>
                </div>
                <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
                <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chain Flow</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ opacity: 0.5 }}>Peternakan</span>
                        <span>→</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>Processor</span>
                        <span>→</span>
                        <span style={{ opacity: 0.5 }}>Retailer</span>
                        <span>→</span>
                        <span style={{ opacity: 0.5 }}>Consumer</span>
                    </div>
                </div>
            </div>

            {view === 'overview' && (
                <>
                    {/* Stats Cards */}
                    {overview && (
                        <div className="admin-stats-grid">
                            <div className="admin-stat-card stat-chains">
                                <div className="admin-stat-icon">🔗</div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{overview.totalChains}</span>
                                    <span className="admin-stat-label">Total Chains</span>
                                </div>
                            </div>
                            <div className="admin-stat-card stat-processors">
                                <div className="admin-stat-icon">🟢</div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{overview.activeChains}</span>
                                    <span className="admin-stat-label">Active</span>
                                </div>
                            </div>
                            <div className="admin-stat-card stat-orders">
                                <div className="admin-stat-icon">✅</div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{overview.completedChains}</span>
                                    <span className="admin-stat-label">Completed</span>
                                </div>
                            </div>
                            <div className="admin-stat-card stat-users">
                                <div className="admin-stat-icon">🚛</div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{overview.transferredChains}</span>
                                    <span className="admin-stat-label">Transferred</span>
                                </div>
                            </div>
                            <div className="admin-stat-card stat-blocks">
                                <div className="admin-stat-icon">📦</div>
                                <div className="admin-stat-info">
                                    <span className="admin-stat-value">{overview.totalBlocks}</span>
                                    <span className="admin-stat-label">Total Blocks</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Chain Table */}
                    <div className="admin-table-card">
                        {loading.overview ? (
                            <div className="admin-loading">
                                <div className="admin-spinner" />
                                <p>Memuat data blockchain...</p>
                            </div>
                        ) : chains.length === 0 ? (
                            <div className="admin-empty">
                                <div className="admin-empty-icon">🔗</div>
                                <h3>Belum ada blockchain chain</h3>
                                <p>Chain akan dibuat otomatis saat processor menerima order dari peternakan.</p>
                            </div>
                        ) : (
                            <div className="admin-table-wrapper">
                                <table className="admin-table" id="admin-blockchain-table">
                                    <thead>
                                        <tr>
                                            <th>Identity</th>
                                            <th>Processor</th>
                                            <th>Order</th>
                                            <th>Peternakan</th>
                                            <th>Blocks</th>
                                            <th>Status</th>
                                            <th>Dibuat</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {chains.map((chain) => {
                                            const statusConf = STATUS_CHAIN_CONFIG[chain.StatusChain] || STATUS_CHAIN_CONFIG.ACTIVE
                                            return (
                                                <tr key={chain.IdIdentity}>
                                                    <td>
                                                        <span className="admin-code-badge" style={{ fontFamily: "'Cascadia Code', monospace", fontSize: '0.78rem' }}>
                                                            {chain.KodeIdentity}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <strong className="admin-processor-label">{chain.NamaProcessor}</strong>
                                                    </td>
                                                    <td>{chain.KodeOrder}</td>
                                                    <td>{chain.NamaPeternakan}</td>
                                                    <td>
                                                        <span className="admin-stat-mini">📦 {chain.ActualBlockCount || chain.TotalBlocks}</span>
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '3px 10px',
                                                            borderRadius: 8,
                                                            fontSize: '0.82rem',
                                                            fontWeight: 600,
                                                            color: statusConf.color,
                                                            background: statusConf.bg,
                                                        }}>
                                                            {statusConf.label}
                                                        </span>
                                                    </td>
                                                    <td>{formatDate(chain.CreatedAt)}</td>
                                                    <td>
                                                        <button
                                                            className="admin-view-btn"
                                                            onClick={() => handleSelectChain(chain.IdIdentity)}
                                                        >
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                                <circle cx="12" cy="12" r="3" />
                                                            </svg>
                                                            Detail
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {view === 'chain-detail' && selectedChainId && (
                <div style={{ display: 'grid', gap: 20 }}>
                    {/* Chain Info Header */}
                    {currentChain && (
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '20px 24px', borderRadius: 16,
                            background: 'var(--panel)', border: '1px solid var(--border)',
                            flexWrap: 'wrap', gap: 16,
                        }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{currentChain.KodeIdentity}</h2>
                                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 6, flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--muted)' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '2px 10px', borderRadius: 8,
                                        color: (STATUS_CHAIN_CONFIG[currentChain.StatusChain] || {}).color,
                                        background: (STATUS_CHAIN_CONFIG[currentChain.StatusChain] || {}).bg,
                                        fontSize: '0.82rem', fontWeight: 600,
                                    }}>
                                        {(STATUS_CHAIN_CONFIG[currentChain.StatusChain] || {}).label}
                                    </span>
                                    <span>🏭 {currentChain.NamaProcessor}</span>
                                    <span>•</span>
                                    <span>Order: {currentChain.KodeOrder}</span>
                                    <span>•</span>
                                    <span>{formatDate(currentChain.CreatedAt)}</span>
                                </div>
                            </div>
                            <button className="admin-create-btn" onClick={handleValidate}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <polyline points="9 12 11 14 15 10" />
                                </svg>
                                Validasi Chain
                            </button>
                        </div>
                    )}

                    {/* Validation Result */}
                    {validation && (
                        <div style={{
                            padding: '14px 20px', borderRadius: 12,
                            background: validation.valid ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)',
                            border: `1px solid ${validation.valid ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                            display: 'flex', alignItems: 'center', gap: 12,
                        }}>
                            <span style={{ fontSize: '1.5rem' }}>{validation.valid ? '🛡️' : '⚠️'}</span>
                            <div>
                                <div style={{ fontWeight: 700, color: validation.valid ? 'var(--success)' : 'var(--danger)' }}>
                                    {validation.valid ? 'Chain Valid' : 'Chain Tidak Valid'}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
                                    {validation.message} • {validation.totalBlocks} blocks terverifikasi
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Block Timeline */}
                    <div className="admin-table-card" style={{ padding: 20 }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1rem' }}>
                            Block Chain Timeline
                        </h3>

                        {loading.blocks ? (
                            <div className="admin-loading">
                                <div className="admin-spinner" />
                                <p>Memuat blocks...</p>
                            </div>
                        ) : blocks.length === 0 ? (
                            <div className="admin-empty">
                                <p>Tidak ada blocks ditemukan untuk chain ini.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {blocks.map((block, idx) => {
                                    const conf = BLOCK_TYPE_CONFIG[block.TipeBlock] || { label: block.TipeBlock, color: '#6b7280', icon: '📦' }
                                    const isSelected = selectedBlock && selectedBlock.KodeBlock === block.KodeBlock
                                    let payload = null
                                    try {
                                        payload = typeof block.DataPayload === 'string' ? JSON.parse(block.DataPayload) : block.DataPayload
                                    } catch { payload = block.DataPayload }

                                    return (
                                        <div key={block.KodeBlock || idx}>
                                            {/* Connector */}
                                            {idx > 0 && (
                                                <div style={{
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                                    padding: '4px 0',
                                                }}>
                                                    <div style={{ width: 2, height: 16, background: 'var(--border)' }} />
                                                    <div style={{
                                                        fontSize: '0.65rem', color: 'var(--muted)',
                                                        fontFamily: "'Cascadia Code', monospace",
                                                        background: 'rgba(139,26,26,0.04)',
                                                        padding: '2px 8px', borderRadius: 6,
                                                    }}>
                                                        {block.PreviousHash ? block.PreviousHash.substring(0, 8) : '...'}
                                                    </div>
                                                    <div style={{ width: 2, height: 16, background: 'var(--border)' }} />
                                                </div>
                                            )}

                                            {/* Block Card */}
                                            <div
                                                onClick={() => setSelectedBlock(isSelected ? null : block)}
                                                style={{
                                                    display: 'flex', gap: 14, padding: '14px 18px',
                                                    borderRadius: 14, cursor: 'pointer',
                                                    border: `1.5px solid ${isSelected ? conf.color + '40' : 'var(--border-light)'}`,
                                                    background: isSelected ? conf.color + '06' : 'transparent',
                                                    transition: 'all 0.2s ease',
                                                }}
                                            >
                                                <div style={{
                                                    width: 4, borderRadius: 4, flexShrink: 0,
                                                    background: conf.color,
                                                }} />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                        <span>{conf.icon}</span>
                                                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: conf.color }}>{conf.label}</span>
                                                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>#{block.BlockIndex}</span>
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 'auto' }}>{formatDateTime(block.CreatedAt)}</span>
                                                    </div>

                                                    {/* Summary */}
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--ink-soft)', margin: '4px 0 0' }}>
                                                        {getBlockSummary(block.TipeBlock, payload)}
                                                    </p>

                                                    {/* Hash info */}
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 4, fontFamily: "'Cascadia Code', monospace" }}>
                                                        Hash: {truncHash(block.CurrentHash)}
                                                    </div>

                                                    {/* Expanded detail */}
                                                    {isSelected && (
                                                        <div style={{ marginTop: 14, padding: '14px', borderRadius: 10, background: 'var(--bg-soft)', border: '1px solid var(--border-light)' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                                                <div>
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Kode Block</div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{block.KodeBlock}</div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Status</div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{block.StatusBlock}</div>
                                                                </div>
                                                                <div style={{ gridColumn: '1/-1' }}>
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Previous Hash</div>
                                                                    <code style={{ fontSize: '0.68rem', wordBreak: 'break-all', color: 'var(--muted)' }}>{truncHash(block.PreviousHash)}</code>
                                                                </div>
                                                                <div style={{ gridColumn: '1/-1' }}>
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Current Hash</div>
                                                                    <code style={{ fontSize: '0.68rem', wordBreak: 'break-all', color: 'var(--primary)' }}>{truncHash(block.CurrentHash)}</code>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>Data Payload</div>
                                                                <pre style={{
                                                                    background: 'var(--panel)', padding: 12, borderRadius: 10,
                                                                    fontSize: '0.72rem', lineHeight: 1.6, overflowX: 'auto',
                                                                    border: '1px solid var(--border-light)', maxHeight: 240,
                                                                    overflowY: 'auto', margin: 0,
                                                                }}>
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
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}>
                                    <div style={{ width: 2, height: 16, background: 'var(--border)' }} />
                                    <div style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: 'var(--muted)', marginBottom: 6,
                                    }} />
                                    <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                        End of Chain • {blocks.length} blocks
                                    </span>
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
        case 'RECEIVE_FROM_FARM':
            return `Diterima dari ${payload.nama_peternakan || '?'}: ${payload.jumlah_diterima || payload.jumlah_pesanan || '?'} ${payload.satuan || 'ekor'}`
        case 'NOTA_PENERIMAAN':
            return `Nota: ${payload.jumlah_diterima || '?'} diterima, ${payload.jumlah_rusak || 0} rusak (${payload.kondisi_ayam || '?'})`
        case 'PROCESSING':
            return `Produksi: ${payload.jumlah_input || '?'} → ${payload.jumlah_output || '?'} (${payload.berat_total || 0} kg)`
        case 'HALAL_CHECK':
            return `Sertifikat Halal: ${payload.hasil_verifikasi || '?'} — ${payload.metode_penyembelihan || '?'}`
        case 'QUALITY_CHECK':
            return `QC: ${payload.hasil_qc || '?'} (suhu: ${payload.suhu || '?'}°C)`
        case 'LAPORAN_MASALAH':
            return `Masalah: ${payload.jenis_masalah || '?'} (${payload.tingkat || '?'})`
        case 'TRANSFER_TO_RETAIL':
            return `Kirim ke ${payload.nama_penerima || '?'}: ${payload.jumlah_kirim || '?'} (${payload.berat_kirim || 0} kg)`
        default:
            return tipeBlock
    }
}

export default AdminPanelBlockchain
