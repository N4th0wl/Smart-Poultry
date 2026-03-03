import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import apiClient from '../services/apiClient'

export default function BlockchainPage() {
    const [overview, setOverview] = useState(null)
    const [selectedChain, setSelectedChain] = useState(null)
    const [blocks, setBlocks] = useState([])
    const [showBlocksModal, setShowBlocksModal] = useState(false)

    useEffect(() => { loadOverview() }, [])
    async function loadOverview() {
        try { const r = await apiClient.get('/blockchain/overview'); setOverview(r.data) } catch { }
    }

    async function viewBlocks(chain) {
        setSelectedChain(chain)
        try {
            const r = await apiClient.get(`/blockchain/${chain.IdIdentity}/blocks`)
            setBlocks(r.data.data)
            setShowBlocksModal(true)
        } catch { }
    }

    return (
        <div>
            <PageHeader title="Blockchain" subtitle="Monitor rantai blockchain retailer" />
            {overview && (
                <div className="sp-grid cols-4" style={{ marginBottom: 20 }}>
                    <div className="sp-card"><div className="sp-cardHeader">Total Chain</div><div className="sp-cardBody"><div className="sp-statValue">{overview.totalChains}</div></div></div>
                    <div className="sp-card"><div className="sp-cardHeader">Aktif</div><div className="sp-cardBody"><div className="sp-statValue">{overview.activeChains}</div></div></div>
                    <div className="sp-card"><div className="sp-cardHeader">Selesai</div><div className="sp-cardBody"><div className="sp-statValue">{overview.completedChains}</div></div></div>
                    <div className="sp-card"><div className="sp-cardHeader">Total Block</div><div className="sp-cardBody"><div className="sp-statValue">{overview.totalBlocks}</div></div></div>
                </div>
            )}

            <div className="sp-card"><div className="sp-cardBody">
                <table className="sp-table"><thead><tr><th>Identity</th><th>Order</th><th>Processor</th><th>Produk</th><th>Blocks</th><th>Status</th><th>Aksi</th></tr></thead>
                    <tbody>{overview?.chains?.length > 0 ? overview.chains.map(c => (
                        <tr key={c.IdIdentity}>
                            <td><strong>{c.KodeIdentity}</strong></td><td>{c.KodeOrder}</td><td>{c.NamaProcessor}</td><td>{c.NamaProduk}</td>
                            <td>{c.ActualBlockCount}</td>
                            <td><span className={`sp-badge ${c.StatusChain === 'ACTIVE' ? 'info' : c.StatusChain === 'COMPLETED' ? 'success' : 'danger'}`}>{c.StatusChain}</span></td>
                            <td><button className="sp-btn secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }} onClick={() => viewBlocks(c)}>Lihat</button></td>
                        </tr>
                    )) : <tr><td colSpan={7} className="sp-empty">Belum ada blockchain.</td></tr>}</tbody></table>
            </div></div>

            <Modal open={showBlocksModal} onClose={() => setShowBlocksModal(false)} title={`Chain: ${selectedChain?.KodeIdentity || ''}`}>
                <div className="sp-blockchainTimeline">
                    {blocks.map((b, i) => {
                        let payload = b.DataPayload
                        if (typeof payload === 'string') { try { payload = JSON.parse(payload) } catch { } }
                        return (
                            <div key={i} className="sp-blockItem">
                                <div className="sp-blockIndex">{b.BlockIndex}</div>
                                <div className="sp-blockContent">
                                    <div className="sp-blockType">{b.TipeBlock}</div>
                                    <div className="sp-blockHash">#{b.CurrentHash?.substring(0, 16)}...</div>
                                    <div className="sp-blockDate">{new Date(b.CreatedAt).toLocaleString('id-ID')}</div>
                                    <div className="sp-blockPayload">
                                        <details><summary>Data Payload</summary>
                                            <pre>{JSON.stringify(payload, null, 2)}</pre>
                                        </details>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {blocks.length === 0 && <p style={{ color: 'var(--muted)' }}>Tidak ada block.</p>}
                </div>
            </Modal>
        </div>
    )
}
