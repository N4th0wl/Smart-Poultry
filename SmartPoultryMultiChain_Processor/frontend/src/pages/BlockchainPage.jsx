import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

/* ── Block type labels ── */
const BLOCK_LABELS = {
    RECEIVE_FROM_FARM: { label: 'Penerimaan dari Farm', color: '#2563eb', icon: '📦' },
    NOTA_PENERIMAAN: { label: 'Nota Penerimaan', color: '#7c3aed', icon: '📋' },
    PROCESSING: { label: 'Produksi', color: '#d97706', icon: '🏭' },
    HALAL_CHECK: { label: 'Sertifikat Halal', color: '#059669', icon: '☪️' },
    QUALITY_CHECK: { label: 'Quality Control', color: '#0891b2', icon: '✅' },
    LAPORAN_MASALAH: { label: 'Laporan Masalah', color: '#dc2626', icon: '⚠️' },
    TRANSFER_TO_RETAIL: { label: 'Kirim ke Retail', color: '#16a34a', icon: '🚚' },
}

const STATUS_BADGES = {
    ACTIVE: 'info',
    COMPLETED: 'success',
    FAILED: 'danger',
    TRANSFERRED: 'success',
}

export default function BlockchainPage() {
    const [overview, setOverview] = useState(null)
    const [chains, setChains] = useState([])
    const [selectedChain, setSelectedChain] = useState(null)
    const [blocks, setBlocks] = useState([])
    const [validation, setValidation] = useState(null)
    const [traceData, setTraceData] = useState(null)
    const [farmChain, setFarmChain] = useState(null)
    const [showTraceModal, setShowTraceModal] = useState(false)
    const [showBlockModal, setShowBlockModal] = useState(false)
    const [selectedBlock, setSelectedBlock] = useState(null)
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const { showToast } = useToast()

    /* ── Load overview ── */
    useEffect(() => {
        loadOverview()
    }, [])

    const loadOverview = async () => {
        try {
            const res = await apiClient.get('/blockchain/overview')
            setOverview(res.data)
            setChains(res.data.chains || [])
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memuat data blockchain.', status: 'error' })
        }
    }

    /* ── Filter chains ── */
    const filteredChains = useMemo(() => {
        if (!search.trim()) return chains
        const q = search.toLowerCase()
        return chains.filter(c =>
            c.KodeIdentity?.toLowerCase().includes(q) ||
            c.KodeOrder?.toLowerCase().includes(q) ||
            c.NamaPeternakan?.toLowerCase().includes(q) ||
            c.StatusChain?.toLowerCase().includes(q)
        )
    }, [chains, search])

    /* ── Select chain & load blocks ── */
    const handleSelectChain = async (chain) => {
        setSelectedChain(chain)
        setBlocks([])
        setValidation(null)
        setFarmChain(null)

        try {
            const [blocksRes, validRes] = await Promise.all([
                apiClient.get(`/blockchain/${chain.IdIdentity}/blocks`),
                apiClient.get(`/blockchain/${chain.IdIdentity}/validate`),
            ])
            setBlocks(blocksRes.data.data || [])
            setValidation(validRes.data.data || null)

            // Try to load farm chain if linked
            if (chain.KodeCycleFarm) {
                try {
                    const farmRes = await apiClient.get(`/blockchain/farm-chain/${chain.KodeCycleFarm}`)
                    if (farmRes.data.data?.found) {
                        setFarmChain(farmRes.data.data)
                    }
                } catch (e) {
                    // Farm chain not available, that's ok
                }
            }
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memuat data block.', status: 'error' })
        }
    }

    /* ── Load traceability data ── */
    const handleTrace = async (chain) => {
        setLoading(true)
        try {
            const res = await apiClient.get(`/blockchain/${chain.IdIdentity}/trace`)
            setTraceData(res.data.data)
            setShowTraceModal(true)
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memuat traceability.', status: 'error' })
        }
        setLoading(false)
    }

    /* ── View block detail ── */
    const handleViewBlock = (block) => {
        setSelectedBlock(block)
        setShowBlockModal(true)
    }

    /* ── Validate chain ── */
    const handleValidate = async () => {
        if (!selectedChain) return
        try {
            const res = await apiClient.get(`/blockchain/${selectedChain.IdIdentity}/validate`)
            setValidation(res.data.data)
            showToast({
                title: res.data.data.valid ? '✅ Valid' : '❌ Invalid',
                description: res.data.data.message,
                status: res.data.data.valid ? 'success' : 'error'
            })
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memvalidasi chain.', status: 'error' })
        }
    }

    return (
        <div>
            <PageHeader
                title="Blockchain Ledger"
                subtitle="Traceability & supply chain integrity"
            />

            {/* ── Overview Stats ── */}
            {overview && (
                <div className="sp-grid cols-4" style={{ marginBottom: 28 }}>
                    <div className="sp-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div className="sp-cardBody">
                            <div className="sp-statValue">{overview.totalChains}</div>
                            <div className="sp-statHint">Total Chains</div>
                        </div>
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                            background: 'linear-gradient(90deg, #2563eb, #60a5fa)'
                        }} />
                    </div>
                    <div className="sp-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div className="sp-cardBody">
                            <div className="sp-statValue">{overview.activeChains}</div>
                            <div className="sp-statHint">Active Chains</div>
                        </div>
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                            background: 'linear-gradient(90deg, #0891b2, #22d3ee)'
                        }} />
                    </div>
                    <div className="sp-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div className="sp-cardBody">
                            <div className="sp-statValue">{overview.transferredChains}</div>
                            <div className="sp-statHint">Transferred</div>
                        </div>
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                            background: 'linear-gradient(90deg, #16a34a, #4ade80)'
                        }} />
                    </div>
                    <div className="sp-card" style={{ position: 'relative', overflow: 'hidden' }}>
                        <div className="sp-cardBody">
                            <div className="sp-statValue">{overview.totalBlocks}</div>
                            <div className="sp-statHint">Total Blocks</div>
                        </div>
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                            background: 'linear-gradient(90deg, #d97706, #fbbf24)'
                        }} />
                    </div>
                </div>
            )}

            {/* ── Chain List ── */}
            <div className="sp-card" style={{ marginBottom: 24 }}>
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Blockchain Chains</span>
                    <input
                        className="sp-searchInput"
                        placeholder="Cari chain..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ maxWidth: 240 }}
                    />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto', padding: 0 }}>
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th>Identity</th>
                                <th>Order</th>
                                <th>Peternakan</th>
                                <th>Link Farm</th>
                                <th>Blocks</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredChains.length > 0 ? filteredChains.map((c) => (
                                <tr
                                    key={c.IdIdentity}
                                    style={{
                                        background: selectedChain?.IdIdentity === c.IdIdentity ? 'rgba(139,26,26,0.04)' : undefined,
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => handleSelectChain(c)}
                                >
                                    <td><strong style={{ fontFamily: "'Cascadia Code', monospace", fontSize: '0.8rem' }}>{c.KodeIdentity}</strong></td>
                                    <td>{c.KodeOrder}</td>
                                    <td>{c.NamaPeternakan || '-'}</td>
                                    <td>
                                        {c.KodeCycleFarm ? (
                                            <span className="sp-chip">{c.KodeCycleFarm}</span>
                                        ) : (
                                            <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>-</span>
                                        )}
                                    </td>
                                    <td><strong>{c.ActualBlockCount || c.TotalBlocks}</strong></td>
                                    <td><span className={`sp-badge ${STATUS_BADGES[c.StatusChain] || 'muted'}`}>{c.StatusChain}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                className="sp-btn secondary"
                                                style={{ height: 30, fontSize: 11, padding: '0 10px', borderRadius: 8 }}
                                                onClick={(e) => { e.stopPropagation(); handleSelectChain(c) }}
                                            >
                                                Blocks
                                            </button>
                                            <button
                                                className="sp-btn"
                                                style={{ height: 30, fontSize: 11, padding: '0 10px', borderRadius: 8 }}
                                                onClick={(e) => { e.stopPropagation(); handleTrace(c) }}
                                                disabled={loading}
                                            >
                                                Trace
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="sp-empty">Belum ada blockchain chain.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Selected Chain: Block Timeline ── */}
            {selectedChain && (
                <div className="sp-section">
                    <div className="sp-sectionHeader">
                        <div className="sp-sectionTitle">
                            Block Timeline — {selectedChain.KodeIdentity}
                        </div>
                        <button
                            className="sp-btn secondary"
                            style={{ height: 36, fontSize: 12, padding: '0 16px', borderRadius: 8 }}
                            onClick={handleValidate}
                        >
                            🔒 Validate Chain
                        </button>
                    </div>

                    {/* Validation Status */}
                    {validation && (
                        <div
                            style={{
                                padding: '12px 18px',
                                borderRadius: 12,
                                marginBottom: 16,
                                background: validation.valid
                                    ? 'rgba(22,163,74,0.08)'
                                    : 'rgba(220,38,38,0.08)',
                                border: `1px solid ${validation.valid ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}`,
                                fontSize: '0.88rem',
                                fontWeight: 600,
                                color: validation.valid ? 'var(--success)' : 'var(--danger)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            {validation.valid ? '🟢' : '🔴'} {validation.message}
                            <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--muted)', fontSize: '0.82rem' }}>
                                {validation.totalBlocks} blocks
                            </span>
                        </div>
                    )}

                    {/* Farm chain link info */}
                    {selectedChain.FarmLastBlockHash && (
                        <div
                            style={{
                                padding: '12px 18px',
                                borderRadius: 12,
                                marginBottom: 16,
                                background: 'rgba(124,58,237,0.06)',
                                border: '1px solid rgba(124,58,237,0.12)',
                                fontSize: '0.84rem',
                            }}
                        >
                            <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 4 }}>
                                🔗 Linked to Farm Chain
                            </div>
                            <div style={{ color: 'var(--muted)' }}>
                                Cycle: <strong>{selectedChain.KodeCycleFarm || 'N/A'}</strong> &nbsp;|&nbsp;
                                Farm Hash: <code style={{ fontSize: '0.72rem' }}>{selectedChain.FarmLastBlockHash?.substring(0, 24)}...</code>
                            </div>
                        </div>
                    )}

                    {/* Block timeline */}
                    <div className="sp-card">
                        <div className="sp-cardBody" style={{ padding: '12px 20px' }}>
                            {blocks.length > 0 ? (
                                <div className="sp-blockchainTimeline">
                                    {blocks.map((block) => {
                                        const info = BLOCK_LABELS[block.TipeBlock] || { label: block.TipeBlock, color: '#888', icon: '📦' }
                                        const payload = typeof block.DataPayload === 'string'
                                            ? (() => { try { return JSON.parse(block.DataPayload) } catch { return block.DataPayload } })()
                                            : block.DataPayload

                                        return (
                                            <div className="sp-blockItem" key={block.IdBlock || block.BlockIndex} onClick={() => handleViewBlock({ ...block, DataPayload: payload })}>
                                                <div className="sp-blockIndex" style={{ background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)` }}>
                                                    {info.icon}
                                                </div>
                                                <div className="sp-blockContent">
                                                    <div className="sp-blockType">
                                                        {info.label}
                                                        <span className={`sp-badge ${block.StatusBlock === 'VALIDATED' ? 'success' : 'danger'}`} style={{ marginLeft: 8 }}>
                                                            {block.StatusBlock}
                                                        </span>
                                                    </div>
                                                    <div className="sp-blockHash">
                                                        #{block.BlockIndex} &nbsp;|&nbsp; {block.CurrentHash?.substring(0, 24)}...
                                                    </div>
                                                    <div className="sp-blockDate">
                                                        {block.CreatedAt ? new Date(block.CreatedAt).toLocaleString('id-ID') : '-'}
                                                    </div>
                                                    {payload && (
                                                        <div className="sp-blockPayload">
                                                            <details>
                                                                <summary>Data Payload</summary>
                                                                <pre>{JSON.stringify(payload, null, 2)}</pre>
                                                            </details>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <div className="sp-empty">Belum ada block di chain ini.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Traceability Modal ── */}
            <Modal open={showTraceModal} onClose={() => setShowTraceModal(false)} title="📊 Full Traceability">
                {traceData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* Chain info */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>ORDER</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{traceData.chain.kodeOrder}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>PETERNAKAN</div>
                                <div style={{ fontSize: '1rem', fontWeight: 700 }}>{traceData.chain.namaPeternakan}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>JENIS AYAM</div>
                                <div>{traceData.chain.jenisAyam}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 600 }}>STATUS</div>
                                <span className={`sp-badge ${STATUS_BADGES[traceData.chain.statusChain] || 'muted'}`}>
                                    {traceData.chain.statusChain}
                                </span>
                            </div>
                        </div>

                        {/* Farm link */}
                        {traceData.chain.farmLink?.kodeCycleFarm && (
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: 12,
                                background: 'rgba(124,58,237,0.06)',
                                border: '1px solid rgba(124,58,237,0.12)',
                            }}>
                                <div style={{ fontWeight: 700, color: '#7c3aed', fontSize: '0.85rem', marginBottom: 4 }}>
                                    🔗 Farm Chain Link
                                </div>
                                <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                                    Cycle: {traceData.chain.farmLink.kodeCycleFarm}<br />
                                    Farm: {traceData.chain.farmLink.kodePeternakan || 'N/A'}
                                </div>
                            </div>
                        )}

                        {/* Validation */}
                        <div style={{
                            padding: '10px 14px',
                            borderRadius: 10,
                            background: traceData.validation?.valid ? 'rgba(22,163,74,0.06)' : 'rgba(220,38,38,0.06)',
                            border: `1px solid ${traceData.validation?.valid ? 'rgba(22,163,74,0.15)' : 'rgba(220,38,38,0.15)'}`,
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: traceData.validation?.valid ? 'var(--success)' : 'var(--danger)',
                        }}>
                            {traceData.validation?.valid ? '✅' : '❌'} {traceData.validation?.message}
                        </div>

                        {/* Timeline */}
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10 }}>Supply Chain Timeline</div>
                            {traceData.timeline?.map((t, i) => {
                                const info = BLOCK_LABELS[t.type] || { label: t.type, color: '#888', icon: '📦' }
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            display: 'flex',
                                            gap: 12,
                                            padding: '10px 0',
                                            borderLeft: `2px solid ${info.color}30`,
                                            marginLeft: 14,
                                            paddingLeft: 18,
                                            position: 'relative',
                                        }}
                                    >
                                        <div style={{
                                            position: 'absolute', left: -5, top: 14,
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: info.color
                                        }} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                                                {info.icon} {info.label}
                                            </div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                                                {t.summary}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2, fontFamily: 'monospace' }}>
                                                #{t.index} | {t.hash}...
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Node info */}
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center', paddingTop: 8, borderTop: '1px solid var(--border-light)' }}>
                            🏭 {traceData.nodeDescription || 'Processor Node'}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ── Block Detail Modal ── */}
            <Modal open={showBlockModal} onClose={() => setShowBlockModal(false)} title={`Block Detail — #${selectedBlock?.BlockIndex ?? ''}`}>
                {selectedBlock && (() => {
                    const info = BLOCK_LABELS[selectedBlock.TipeBlock] || { label: selectedBlock.TipeBlock, color: '#888', icon: '📦' }
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: `linear-gradient(135deg, ${info.color}, ${info.color}cc)`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.2rem'
                                }}>
                                    {info.icon}
                                </span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{info.label}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{selectedBlock.KodeBlock}</div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div>
                                    <div className="sp-label">Block Index</div>
                                    <div style={{ fontWeight: 600 }}>#{selectedBlock.BlockIndex}</div>
                                </div>
                                <div>
                                    <div className="sp-label">Status</div>
                                    <span className={`sp-badge ${selectedBlock.StatusBlock === 'VALIDATED' ? 'success' : 'danger'}`}>
                                        {selectedBlock.StatusBlock}
                                    </span>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div className="sp-label">Previous Hash</div>
                                    <code style={{ fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--muted)' }}>
                                        {selectedBlock.PreviousHash}
                                    </code>
                                </div>
                                <div style={{ gridColumn: '1 / -1' }}>
                                    <div className="sp-label">Current Hash</div>
                                    <code style={{ fontSize: '0.72rem', wordBreak: 'break-all', color: 'var(--primary)' }}>
                                        {selectedBlock.CurrentHash}
                                    </code>
                                </div>
                            </div>

                            <div>
                                <div className="sp-label" style={{ marginBottom: 6 }}>Data Payload</div>
                                <pre style={{
                                    background: 'var(--bg-soft)',
                                    padding: 14,
                                    borderRadius: 12,
                                    fontSize: '0.75rem',
                                    lineHeight: 1.7,
                                    overflowX: 'auto',
                                    border: '1px solid var(--border-light)',
                                    maxHeight: 300,
                                    overflowY: 'auto'
                                }}>
                                    {JSON.stringify(selectedBlock.DataPayload, null, 2)}
                                </pre>
                            </div>

                            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                                Created: {selectedBlock.CreatedAt ? new Date(selectedBlock.CreatedAt).toLocaleString('id-ID') : '-'}
                            </div>
                        </div>
                    )
                })()}
            </Modal>
        </div>
    )
}
