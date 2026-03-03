import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { LoadingState, EmptyState } from '../components'
import { blockchainService } from '../services'

function AdminPanelBlockchain() {
    const [ledger, setLedger] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadLedger() }, [])

    const loadLedger = async () => {
        try {
            const data = await blockchainService.getLedger()
            setLedger(data)
        } catch (error) {
            toast.error('Gagal memuat ledger')
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <LoadingState />

    return (
        <div>
            <div className="page-header">
                <h2>Blockchain Ledger</h2>
            </div>

            {ledger.length === 0 ? (
                <EmptyState message="Belum ada block" icon="🔗" />
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Kode Block</th>
                                <th>Pengiriman</th>
                                <th>Tipe</th>
                                <th>Index</th>
                                <th>Previous Hash</th>
                                <th>Current Hash</th>
                                <th>Status</th>
                                <th>Created</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ledger.map(b => (
                                <tr key={b.IdBlock}>
                                    <td>{b.IdBlock}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '.78rem' }}>{b.KodeBlock}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '.78rem' }}>{b.KodePengiriman || '—'}</td>
                                    <td><span className="badge badge-active">{b.TipeBlock}</span></td>
                                    <td>{b.BlockIndex}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '.72rem', color: 'rgba(200,215,240,0.4)' }}>{b.PreviousHash?.substring(0, 16)}...</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '.72rem', color: 'rgba(200,215,240,0.6)' }}>{b.CurrentHash?.substring(0, 16)}...</td>
                                    <td><span className={`badge ${b.StatusBlock === 'VALIDATED' ? 'badge-completed' : 'badge-failed'}`}>{b.StatusBlock}</span></td>
                                    <td style={{ fontSize: '.78rem', color: 'rgba(200,215,240,0.4)' }}>{b.CreatedAt ? new Date(b.CreatedAt).toLocaleString('id-ID') : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default AdminPanelBlockchain
