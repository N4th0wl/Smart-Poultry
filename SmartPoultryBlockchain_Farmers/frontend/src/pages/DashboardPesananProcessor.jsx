import { useState, useEffect, useMemo } from 'react'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import './DashboardPage.css'

function DashboardPesananProcessor() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const navigate = useNavigate()

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await api.get('/orders/processor-orders')
      setOrders(res.data.data || [])
    } catch (error) {
      console.error('Failed to fetch processor orders:', error)
      toast.error('Gagal memuat pesanan dari Processor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const pendingCount = useMemo(() => orders.filter(o => o.StatusOrder === 'PENDING').length, [orders])
  const confirmedCount = useMemo(() => orders.filter(o => o.StatusOrder === 'CONFIRMED').length, [orders])
  const shippedCount = useMemo(() => orders.filter(o => ['DIKIRIM', 'DITERIMA', 'SELESAI'].includes(o.StatusOrder)).length, [orders])

  const handleConfirm = async (order) => {
    if (!confirm(`Konfirmasi pesanan ${order.KodeOrder}? Status akan diubah ke CONFIRMED.`)) return
    setConfirmLoading(true)
    try {
      await api.put(`/orders/processor-orders/${order.IdOrder}/confirm`)
      toast.success(`Pesanan ${order.KodeOrder} berhasil dikonfirmasi!`)
      fetchOrders()
    } catch (error) {
      console.error('Confirm error:', error)
      toast.error('Gagal mengkonfirmasi pesanan')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleShip = async (order) => {
    setConfirmLoading(true)
    try {
      await api.put(`/orders/processor-orders/${order.IdOrder}/ship`)
      toast.success(`Pesanan ${order.KodeOrder} ditandai sebagai DIKIRIM! Silakan buat pengiriman di halaman Panen & Pengiriman.`)
      fetchOrders()
    } catch (error) {
      console.error('Ship error:', error)
      toast.error('Gagal mengupdate status pengiriman')
    } finally {
      setConfirmLoading(false)
    }
  }

  const handleGoToPengiriman = () => {
    navigate('/dashboard/panen')
  }

  const openDetail = (order) => {
    setSelectedOrder(order)
    setDetailModalOpen(true)
  }

  const getStatusBadge = (status) => {
    const map = {
      'PENDING': { cls: 'warning', label: '⏳ Menunggu' },
      'CONFIRMED': { cls: 'info', label: '✅ Dikonfirmasi' },
      'DIKIRIM': { cls: 'info', label: '🚚 Dikirim' },
      'DITERIMA': { cls: 'success', label: '📦 Diterima Processor' },
      'SELESAI': { cls: 'success', label: '✅ Selesai' },
      'DITOLAK': { cls: 'danger', label: '❌ Ditolak' },
    }
    const { cls, label } = map[status] || { cls: 'default', label: status }
    return <span className={`status-badge ${cls}`}>{label}</span>
  }

  const formatDate = (d) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatCurrency = (val) => {
    if (!val) return '-'
    return `Rp ${parseFloat(val).toLocaleString('id-ID')}`
  }

  const columns = [
    { key: 'KodeOrder', label: 'Kode Order', sortable: true },
    {
      key: 'JenisAyam',
      label: 'Jenis Ayam',
      sortable: true,
    },
    {
      key: 'JumlahPesanan',
      label: 'Jumlah',
      sortable: true,
      render: (val, row) => `${val?.toLocaleString()} ${row.Satuan || 'EKOR'}`
    },
    {
      key: 'TanggalOrder',
      label: 'Tgl Order',
      sortable: true,
      render: (val) => formatDate(val)
    },
    {
      key: 'TanggalDibutuhkan',
      label: 'Dibutuhkan',
      sortable: true,
      render: (val) => {
        if (!val) return '-'
        const deadline = new Date(val)
        const today = new Date()
        const isUrgent = deadline <= new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
        return (
          <span style={{ color: isUrgent ? '#dc2626' : 'inherit', fontWeight: isUrgent ? 600 : 400 }}>
            {isUrgent ? '🔴 ' : ''}{formatDate(val)}
          </span>
        )
      }
    },
    {
      key: 'StatusOrder',
      label: 'Status',
      sortable: true,
      render: (val) => getStatusBadge(val)
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="table-actions">
          <button
            className="btn-action btn-edit"
            onClick={(e) => { e.stopPropagation(); openDetail(row) }}
            style={{ fontSize: '0.8rem' }}
          >
            Detail
          </button>
          {row.StatusOrder === 'PENDING' && (
            <button
              className="btn-action"
              onClick={(e) => { e.stopPropagation(); handleConfirm(row) }}
              disabled={confirmLoading}
              style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              ✅ Konfirmasi
            </button>
          )}
          {row.StatusOrder === 'CONFIRMED' && (
            <button
              className="btn-action"
              onClick={(e) => { e.stopPropagation(); handleShip(row) }}
              disabled={confirmLoading}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              🚚 Kirim
            </button>
          )}
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="dashboard-page">
        <LoadingState variant="spinner" text="Memuat pesanan dari Processor..." />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Pesanan dari Processor</h1>
          <p>Pesanan ayam masuk dari pabrik pemrosesan (Cross-Database)</p>
        </div>
        <button className="btn-primary" onClick={handleGoToPengiriman}>
          📦 Buat Pengiriman
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))',
          border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 12, padding: '16px 20px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400e' }}>Menunggu</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>{pendingCount}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: 12, padding: '16px 20px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e40af' }}>Dikonfirmasi</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{confirmedCount}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 12, padding: '16px 20px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#065f46' }}>Dikirim/Selesai</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>{shippedCount}</div>
        </div>
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(79,70,229,0.05))',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 12, padding: '16px 20px'
        }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3730a3' }}>Total Pesanan</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#4f46e5', marginTop: 4 }}>{orders.length}</div>
        </div>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Belum Ada Pesanan dari Processor"
          message="Pesanan akan muncul di sini ketika Processor membuat order ayam ke peternakan."
        />
      ) : (
        <div className="page-content">
          <DataTable columns={columns} data={orders} pageSize={10} />
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Detail Pesanan ${selectedOrder?.KodeOrder || ''}`}
        size="medium"
      >
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Status Badge */}
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              {getStatusBadge(selectedOrder.StatusOrder)}
            </div>

            {/* Order Info Grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px',
              background: 'rgba(241,245,249,0.6)', borderRadius: 10, padding: 16
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Kode Order</div>
                <div style={{ fontWeight: 600 }}>{selectedOrder.KodeOrder}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Jenis Ayam</div>
                <div style={{ fontWeight: 600 }}>{selectedOrder.JenisAyam}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Jumlah Pesanan</div>
                <div style={{ fontWeight: 600 }}>{selectedOrder.JumlahPesanan?.toLocaleString()} {selectedOrder.Satuan}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Harga Satuan</div>
                <div style={{ fontWeight: 600 }}>{formatCurrency(selectedOrder.HargaSatuan)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Total Harga</div>
                <div style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(selectedOrder.TotalHarga)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Processor</div>
                <div>{selectedOrder.NamaProcessor || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Tanggal Order</div>
                <div>{formatDate(selectedOrder.TanggalOrder)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Dibutuhkan</div>
                <div style={{ fontWeight: 600, color: '#b91c1c' }}>{formatDate(selectedOrder.TanggalDibutuhkan)}</div>
              </div>
            </div>

            {selectedOrder.Catatan && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: 4 }}>📝 Catatan</div>
                <div style={{ fontSize: '0.9rem' }}>{selectedOrder.Catatan}</div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {selectedOrder.StatusOrder === 'PENDING' && (
                <button
                  onClick={() => { handleConfirm(selectedOrder); setDetailModalOpen(false) }}
                  disabled={confirmLoading}
                  style={{
                    background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff',
                    border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  ✅ Konfirmasi Pesanan
                </button>
              )}
              {selectedOrder.StatusOrder === 'CONFIRMED' && (
                <>
                  <button
                    onClick={() => { handleShip(selectedOrder); setDetailModalOpen(false) }}
                    disabled={confirmLoading}
                    style={{
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff',
                      border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    🚚 Tandai Dikirim
                  </button>
                  <button
                    onClick={() => { setDetailModalOpen(false); handleGoToPengiriman() }}
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff',
                      border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    📦 Buat Pengiriman
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default DashboardPesananProcessor
