import { useState, useEffect } from 'react'
import { orderService } from '../services'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import './DashboardPage.css'

function DashboardNotaPenerimaan() {
    const [notaList, setNotaList] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedNota, setSelectedNota] = useState(null)
    const [detailModalOpen, setDetailModalOpen] = useState(false)

    const fetchData = async () => {
        try {
            setLoading(true)
            const response = await orderService.getNotaPenerimaan()
            setNotaList(response.data || [])
        } catch (error) {
            console.error('Failed to fetch nota:', error)
            toast.error('Gagal memuat nota penerimaan')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const viewDetail = async (nota) => {
        try {
            const response = await orderService.getNotaPenerimaanById(nota.KodePenerimaan)
            setSelectedNota(response.data)
            setDetailModalOpen(true)
        } catch (error) {
            console.error('Failed to get detail:', error)
            toast.error('Gagal memuat detail nota')
        }
    }

    const getStatusBadge = (status) => {
        const classes = status === 'LENGKAP' ? 'success' : 'warning'
        return <span className={`status-badge ${classes}`}>{status || 'Pending'}</span>
    }

    const columns = [
        { key: 'KodePenerimaan', label: 'Kode Nota', sortable: true },
        { key: 'KodeOrder', label: 'Kode Order', sortable: true },
        {
            key: 'TanggalPenerimaan',
            label: 'Tanggal Terima',
            sortable: true,
            render: (val) => val ? new Date(val).toLocaleDateString('id-ID') : '-'
        },
        {
            key: 'NamaPenerima',
            label: 'Diterima Oleh',
            sortable: true,
            render: (val) => val ? (
                <span style={{ fontWeight: 600 }}>👤 {val}</span>
            ) : '-'
        },
        {
            key: 'NamaSupplier',
            label: 'Supplier',
            sortable: true
        },
        {
            key: 'StatusPenerimaan',
            label: 'Status',
            sortable: true,
            render: (val) => getStatusBadge(val)
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (_, row) => (
                <div className="table-actions">
                    <button className="btn-action btn-view" onClick={(e) => { e.stopPropagation(); viewDetail(row); }}>
                        Lihat Detail
                    </button>
                </div>
            )
        }
    ]

    if (loading) {
        return (
            <div className="dashboard-page">
                <LoadingState variant="spinner" text="Memuat nota penerimaan..." />
            </div>
        )
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Nota Penerimaan</h1>
                    <p>Lihat riwayat penerimaan barang dari order</p>
                </div>
            </div>

            {notaList.length === 0 ? (
                <EmptyState
                    title="Belum Ada Nota Penerimaan"
                    message="Nota penerimaan akan muncul setelah order diterima"
                />
            ) : (
                <div className="page-content">
                    <DataTable columns={columns} data={notaList} pageSize={10} />
                </div>
            )}

            <Modal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={`Detail Nota ${selectedNota?.KodePenerimaan || ''}`}
                size="large"
            >
                {selectedNota && (
                    <div className="detail-panel" style={{ margin: 0, boxShadow: 'none' }}>
                        <div className="detail-stats">
                            <div className="detail-stat">
                                <div className="value">{selectedNota.KodeOrder}</div>
                                <div className="label">Kode Order</div>
                            </div>
                            <div className="detail-stat">
                                <div className="value">{new Date(selectedNota.TanggalPenerimaan).toLocaleDateString('id-ID')}</div>
                                <div className="label">Tanggal Terima</div>
                            </div>
                            <div className="detail-stat">
                                <div className="value">{selectedNota.NamaPenerima || '-'}</div>
                                <div className="label">Diterima Oleh</div>
                            </div>
                            <div className="detail-stat">
                                <div className="value">{selectedNota.NamaSupplier}</div>
                                <div className="label">Supplier</div>
                            </div>
                        </div>

                        <h3 style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>Barang Diterima</h3>
                        {selectedNota.details?.length > 0 ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(31,59,40,0.1)' }}>
                                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Jenis</th>
                                        <th style={{ textAlign: 'left', padding: '0.75rem' }}>Nama Barang</th>
                                        <th style={{ textAlign: 'right', padding: '0.75rem' }}>Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedNota.details.map((item, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid rgba(31,59,40,0.05)' }}>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span className={`status-badge ${item.JenisBarang === 'DOC' ? 'info' : 'success'}`}>
                                                    {item.JenisBarang}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem' }}>{item.NamaBarang}</td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right' }}>{item.Jumlah}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p style={{ color: '#5d7463' }}>Tidak ada detail barang</p>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    )
}

export default DashboardNotaPenerimaan
