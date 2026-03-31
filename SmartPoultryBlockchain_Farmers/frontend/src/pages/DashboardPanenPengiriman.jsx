import { useState, useEffect, useMemo } from 'react'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import { panenService } from '../services/warehouseService'
import { kandangService } from '../services/farmService'
import { staffService } from '../services/staffService'
import api from '../services/api'
import { useNavigate } from 'react-router-dom'
import './DashboardPage.css'

function DashboardPanenPengiriman() {
  const [activeTab, setActiveTab] = useState('pesanan') // 'pesanan', 'panen', 'pengiriman'
  const [panens, setPanens] = useState([])
  const [pengirimans, setPengirimans] = useState([])
  const [kandangs, setKandangs] = useState([])
  const [staffs, setStaffs] = useState([])
  const [orders, setOrders] = useState([])
  
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('panen') // 'panen' or 'pengiriman'
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  
  const [editing, setEditing] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  const [saving, setSaving] = useState(false)
  const [confirmLoading, setConfirmLoading] = useState(false)
  const navigate = useNavigate()

  // Panen form
  const [panenForm, setPanenForm] = useState({
    kodeKandang: '',
    tanggalPanen: '',
    totalBerat: '',
    totalHarga: ''
  })

  // Pengiriman form
  const [pengirimanForm, setPengirimanForm] = useState({
    kodePanen: '',
    kodeKandang: '',
    kodeStaf: '',
    tanggalPengiriman: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [panenRes, pengirimanRes, kandangRes, staffRes, ordersRes] = await Promise.all([
        panenService.getPanen().catch(() => []),
        panenService.getPengiriman().catch(() => []),
        kandangService.getKandang().catch(() => []),
        staffService.getStaf().catch(() => []),
        api.get('/orders/processor-orders').catch(() => ({ data: { data: [] } }))
      ])

      setPanens(panenRes || [])
      setPengirimans(pengirimanRes || [])
      setKandangs(kandangRes || [])
      setStaffs(staffRes?.data || staffRes || [])
      setOrders(ordersRes?.data?.data || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    return dateStr ? new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }

  // =====================================================
  // PESANAN PROCESSOR HANDLERS
  // =====================================================
  const pendingCount = useMemo(() => orders.filter(o => o.StatusOrder === 'PENDING').length, [orders])
  const confirmedCount = useMemo(() => orders.filter(o => o.StatusOrder === 'CONFIRMED').length, [orders])
  const shippedCount = useMemo(() => orders.filter(o => ['DIKIRIM', 'DITERIMA', 'SELESAI'].includes(o.StatusOrder)).length, [orders])

  const handleConfirm = async (order) => {
    if (!confirm(`Konfirmasi pesanan ${order.KodeOrder}? Status akan diubah ke CONFIRMED.`)) return
    setConfirmLoading(true)
    try {
      await api.put(`/orders/processor-orders/${order.IdOrder}/confirm`)
      toast.success(`Pesanan ${order.KodeOrder} berhasil dikonfirmasi!`)
      fetchData()
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
      toast.success(`Pesanan ${order.KodeOrder} ditandai sebagai DIKIRIM! Silakan buat data pengiriman.`)
      fetchData()
    } catch (error) {
      console.error('Ship error:', error)
      toast.error('Gagal mengupdate status pengiriman')
    } finally {
      setConfirmLoading(false)
    }
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
    const { cls, label } = map[status] || { cls: 'default', label: status || 'MENUNGGU_KURIR' }
    return <span className={`status-badge ${cls}`}>{label}</span>
  }

  const getTrackingBadge = (status) => {
    const map = {
      'MENUNGGU_KURIR': { cls: 'warning', label: '⏳ Menunggu Kurir' },
      'PICKUP': { cls: 'info', label: '📦 Sedang Di-Pickup' },
      'DALAM_PERJALANAN': { cls: 'info', label: '🚚 Dalam Perjalanan' },
      'TERKIRIM': { cls: 'success', label: '✅ Terkirim ke Processor' },
      'GAGAL': { cls: 'danger', label: '❌ Pengiriman Gagal' }
    }
    const { cls, label } = map[status] || { cls: 'warning', label: '⏳ Menunggu Kurir' }
    return <span className={`status-badge ${cls}`}>{label}</span>
  }

  const orderColumns = [
    { key: 'KodeOrder', label: 'Kode Order', sortable: true },
    { key: 'JenisAyam', label: 'Jenis Ayam', sortable: true },
    {
      key: 'JumlahPesanan', label: 'Jumlah', sortable: true,
      render: (val, row) => `${val?.toLocaleString()} ${row.Satuan || 'EKOR'}`
    },
    {
      key: 'TanggalDibutuhkan', label: 'Tgl Dibutuhkan', sortable: true,
      render: (val) => {
        if (!val) return '-'
        const isUrgent = new Date(val) <= new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000)
        return (
          <span style={{ color: isUrgent ? '#dc2626' : 'inherit', fontWeight: isUrgent ? 600 : 400 }}>
            {isUrgent ? '🔴 ' : ''}{formatDate(val)}
          </span>
        )
      }
    },
    {
      key: 'StatusOrder', label: 'Status', sortable: true,
      render: (val) => getStatusBadge(val)
    },
    {
      key: 'actions', label: 'Aksi',
      render: (_, row) => (
        <div className="table-actions">
          <button className="btn-action btn-edit" onClick={(e) => { e.stopPropagation(); openDetail(row) }} style={{ fontSize: '0.8rem' }}>Detail</button>
          {row.StatusOrder === 'PENDING' && (
            <button className="btn-action" onClick={(e) => { e.stopPropagation(); handleConfirm(row) }} disabled={confirmLoading} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' }}>✅ Confirm</button>
          )}
          {row.StatusOrder === 'CONFIRMED' && (
            <button className="btn-action" onClick={(e) => { e.stopPropagation(); handleShip(row) }} disabled={confirmLoading} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', fontSize: '0.8rem', cursor: 'pointer' }}>🚚 Ship Process</button>
          )}
        </div>
      )
    }
  ]

  // =====================================================
  // PANEN HANDLERS
  // =====================================================
  const openPanenCreate = () => {
    setPanenForm({ kodeKandang: '', tanggalPanen: '', totalBerat: '', totalHarga: '' })
    setEditing(null)
    setModalType('panen')
    setModalOpen(true)
  }

  const openPanenEdit = (panen) => {
    setPanenForm({
      kodeKandang: panen.KodeKandang,
      tanggalPanen: panen.TanggalPanen?.split('T')[0] || '',
      totalBerat: panen.TotalBerat || '',
      totalHarga: panen.TotalHarga || ''
    })
    setEditing(panen)
    setModalType('panen')
    setModalOpen(true)
  }

  const handlePanenSubmit = async (e) => {
    e.preventDefault()
    if (!panenForm.kodeKandang || !panenForm.tanggalPanen) {
      toast.error('Kandang dan tanggal panen wajib diisi')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await panenService.updatePanen(editing.KodePanen, panenForm)
        toast.success('Panen berhasil diperbarui')
      } else {
        await panenService.createPanen(panenForm)
        toast.success('Panen berhasil ditambahkan')
      }
      setModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error.response?.data?.error || 'Gagal menyimpan panen')
    } finally {
      setSaving(false)
    }
  }

  const handlePanenDelete = async (panen) => {
    if (!confirm(`Hapus data panen ${panen.KodePanen}? Semua pengiriman terkait juga akan dihapus.`)) return

    try {
      await panenService.deletePanen(panen.KodePanen)
      toast.success('Panen berhasil dihapus')
      fetchData()
    } catch (error) {
      toast.error('Gagal menghapus panen')
    }
  }

  // =====================================================
  // PENGIRIMAN HANDLERS
  // =====================================================
  const openPengirimanCreate = () => {
    setPengirimanForm({
      kodePanen: '',
      kodeKandang: '',
      kodeStaf: '',
      tanggalPengiriman: ''
    })
    setEditing(null)
    setModalType('pengiriman')
    setModalOpen(true)
  }

  const openPengirimanEdit = (pengiriman) => {
    setPengirimanForm({
      kodePanen: pengiriman.KodePanen,
      kodeKandang: pengiriman.KodeKandang,
      kodeStaf: pengiriman.KodeStaf || '',
      tanggalPengiriman: pengiriman.TanggalPengiriman?.split('T')[0] || ''
    })
    setEditing(pengiriman)
    setModalType('pengiriman')
    setModalOpen(true)
  }

  const handlePengirimanSubmit = async (e) => {
    e.preventDefault()
    if (!pengirimanForm.kodePanen || !pengirimanForm.kodeKandang || !pengirimanForm.kodeStaf || !pengirimanForm.tanggalPengiriman) {
      toast.error('Panen, Kandang, Staf, dan Tanggal wajib diisi')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await panenService.updatePengiriman(editing.KodePengiriman, pengirimanForm)
        toast.success('Pengiriman berhasil diperbarui')
      } else {
        await panenService.createPengiriman(pengirimanForm)
        toast.success('Pengiriman & Nota Pengiriman berhasil ditambahkan')
      }
      setModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error.response?.data?.error || 'Gagal menyimpan pengiriman')
    } finally {
      setSaving(false)
    }
  }

  const handlePengirimanDelete = async (pengiriman) => {
    if (!confirm(`Hapus data pengiriman ${pengiriman.KodePengiriman}?`)) return

    try {
      await panenService.deletePengiriman(pengiriman.KodePengiriman)
      toast.success('Pengiriman berhasil dihapus')
      fetchData()
    } catch (error) {
      toast.error('Gagal menghapus pengiriman')
    }
  }

  const getPanensForKandang = () => {
    if (!pengirimanForm.kodeKandang) return panens
    return panens.filter(p => p.KodeKandang === pengirimanForm.kodeKandang)
  }

  const panenColumns = [
    { key: 'KodePanen', label: 'Kode Panen', sortable: true },
    { key: 'KodeKandang', label: 'Kandang', sortable: true },
    { key: 'TanggalPanen', label: 'Tanggal Panen', sortable: true, render: (val) => formatDate(val) },
    { key: 'TotalBerat', label: 'Total (kg)', render: (val) => val ? `${parseFloat(val).toLocaleString('id-ID')} kg` : '-' },
    { key: 'TotalHarga', label: 'Total Harga', render: (val) => formatCurrency(val) },
    { key: 'JumlahPengiriman', label: 'Pengiriman', render: (val) => <span className={`status-badge ${val > 0 ? 'success' : 'warning'}`}>{val || 0} pengiriman</span> },
    { key: 'actions', label: 'Aksi', render: (_, row) => (
      <div className="table-actions">
        <button className="btn-action btn-edit" onClick={() => openPanenEdit(row)}>Edit</button>
        <button className="btn-action btn-delete" onClick={() => handlePanenDelete(row)}>Hapus</button>
      </div>
    )}
  ]

  const pengirimanColumns = [
    { key: 'KodePengiriman', label: 'Kode Pengiriman', sortable: true },
    { key: 'KodeNotaPengiriman', label: 'Nota Pengiriman', sortable: true, render: (val) => val ? <span className="status-badge success">{val}</span> : <span className="status-badge warning">Belum ada</span> },
    { key: 'KodePanen', label: 'Panen', sortable: true },
    { key: 'StatusPengiriman', label: 'Status Lacak', sortable: true, render: (val) => getTrackingBadge(val) },
    { key: 'TanggalPengiriman', label: 'Tanggal Kirim', sortable: true, render: (val) => formatDate(val) },
    { key: 'TanggalPenerimaan', label: 'Est. Penerimaan', render: (val) => val ? formatDate(val) : '-' },
    { key: 'NamaStaf', label: 'Penanggung Jawab', render: (val) => val || '-' },
    { key: 'NamaPerusahaanPengiriman', label: 'Tujuan Processor', render: (val) => val || '-' },
    { key: 'actions', label: 'Aksi', render: (_, row) => (
      <div className="table-actions">
        <button className="btn-action btn-edit" onClick={() => openPengirimanEdit(row)}>Edit</button>
        <button className="btn-action btn-delete" onClick={() => handlePengirimanDelete(row)}>Hapus</button>
      </div>
    )}
  ]

  if (loading) return (
    <div className="dashboard-page">
      <LoadingState text="Memuat data manajemen (Orders, Panen, Pengiriman)..." />
    </div>
  )

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Sistem Manajemen Farm</h1>
          <p>Terintegrasi: Pesanan dari Processor, Panen, dan Logistik Pengiriman</p>
        </div>
        {activeTab !== 'pesanan' && (
          <button
            className="btn-primary"
            onClick={activeTab === 'panen' ? openPanenCreate : openPengirimanCreate}
          >
            {activeTab === 'panen' ? '+ Tambah Panen' : '+ Tambah Pengiriman'}
          </button>
        )}
      </div>

      {/* TABS */}
      <div className="tabs" style={{ background: '#f8fafc', padding: '6px 6px', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '24px', display: 'flex', gap: '8px' }}>
        <button
          className={`tab-btn ${activeTab === 'pesanan' ? 'active' : ''}`}
          onClick={() => setActiveTab('pesanan')}
          style={{ flex: 1, padding: '12px 0', border: 'none', background: activeTab === 'pesanan' ? '#fff' : 'transparent', borderRadius: '10px', boxShadow: activeTab === 'pesanan' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: activeTab === 'pesanan' ? 600 : 500, color: activeTab === 'pesanan' ? '#3b82f6' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          📥  Pesanan Processor ({orders.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'panen' ? 'active' : ''}`}
          onClick={() => setActiveTab('panen')}
          style={{ flex: 1, padding: '12px 0', border: 'none', background: activeTab === 'panen' ? '#fff' : 'transparent', borderRadius: '10px', boxShadow: activeTab === 'panen' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: activeTab === 'panen' ? 600 : 500, color: activeTab === 'panen' ? '#b45309' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          🌾 Manajemen Panen ({panens.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pengiriman' ? 'active' : ''}`}
          onClick={() => setActiveTab('pengiriman')}
          style={{ flex: 1, padding: '12px 0', border: 'none', background: activeTab === 'pengiriman' ? '#fff' : 'transparent', borderRadius: '10px', boxShadow: activeTab === 'pengiriman' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', fontWeight: activeTab === 'pengiriman' ? 600 : 500, color: activeTab === 'pengiriman' ? '#059669' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          🚚 Pengiriman Aktual ({pengirimans.length})
        </button>
      </div>

      {/* TAB CONTENT: PESANAN PROCESSOR */}
      {activeTab === 'pesanan' && (
        <div className="page-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.05))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#92400e' }}>Menunggu (Pending)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#b45309', marginTop: 4 }}>{pendingCount}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e40af' }}>Dikonfirmasi (Aktif)</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2563eb', marginTop: 4 }}>{confirmedCount}</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#065f46' }}>Dikirim / Selesai</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#059669', marginTop: 4 }}>{shippedCount}</div>
            </div>
          </div>

          <div style={{ width: '100%', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
             <h2 style={{ fontSize: '1.2rem', marginBottom: '16px', color: '#1e293b' }}>Permintaan Order Datang</h2>
              {orders.length === 0 ? (
                <EmptyState title="Belum Ada Pesanan" message="Tidak ada order masuk dari Processor saat ini." />
              ) : (
                <DataTable columns={orderColumns} data={orders} pageSize={10} />
              )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: PANEN */}
      {activeTab === 'panen' && (
        <div className="page-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {panens.length === 0 ? (
            <EmptyState title="Belum Ada Panen" message="Tambahkan data panen untuk dicatat" actionLabel="Tambah Panen" onAction={openPanenCreate} />
          ) : (
            <div style={{ width: '100%', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <DataTable columns={panenColumns} data={panens} />
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: PENGIRIMAN */}
      {activeTab === 'pengiriman' && (
        <div className="page-content" style={{ animation: 'fadeIn 0.4s ease-out' }}>
          {pengirimans.length === 0 ? (
            <EmptyState title="Belum Ada Pengiriman" message="Tambahkan data pengiriman setelah melakukan panen" actionLabel="Tambah Pengiriman" onAction={openPengirimanCreate} />
          ) : (
            <div style={{ width: '100%', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <DataTable columns={pengirimanColumns} data={pengirimans} />
            </div>
          )}
        </div>
      )}

      {/* === DETAIL PESANAN MODAL === */}
      <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Detail Pesanan ${selectedOrder?.KodeOrder || ''}`} size="medium">
        {selectedOrder && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', padding: '12px 0' }}>{getStatusBadge(selectedOrder.StatusOrder)}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 24px', background: 'rgba(241,245,249,0.5)', borderRadius: 10, padding: 16 }}>
              <div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Kode Order</div><div style={{ fontWeight: 600 }}>{selectedOrder.KodeOrder}</div></div>
              <div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Jenis Ayam</div><div style={{ fontWeight: 600 }}>{selectedOrder.JenisAyam}</div></div>
              <div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Jumlah</div><div style={{ fontWeight: 600 }}>{selectedOrder.JumlahPesanan?.toLocaleString()} {selectedOrder.Satuan}</div></div>
              <div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Harga Satuan</div><div style={{ fontWeight: 600 }}>{formatCurrency(selectedOrder.HargaSatuan)}</div></div>
              <div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Total Harga</div><div style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(selectedOrder.TotalHarga)}</div></div>
              <div><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Tgl Order</div><div>{formatDate(selectedOrder.TanggalOrder)}</div></div>
              <div style={{ gridColumn: 'span 2' }}><div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Dibutuhkan Pada</div><div style={{ fontWeight: 600, color: '#b91c1c' }}>{formatDate(selectedOrder.TanggalDibutuhkan)}</div></div>
            </div>
            {selectedOrder.Catatan && (
              <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#92400e', marginBottom: 4 }}>📝 Catatan</div>
                <div style={{ fontSize: '0.9rem' }}>{selectedOrder.Catatan}</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              {selectedOrder.StatusOrder === 'PENDING' && (
                <button onClick={() => { handleConfirm(selectedOrder); setDetailModalOpen(false) }} disabled={confirmLoading} style={{ background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>✅ Konfirmasi</button>
              )}
              {selectedOrder.StatusOrder === 'CONFIRMED' && (
                <>
                  <button onClick={() => { handleShip(selectedOrder); setDetailModalOpen(false) }} disabled={confirmLoading} style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>🚚 Tandai Dikirim</button>
                  <button onClick={() => { setDetailModalOpen(false); setActiveTab('panen') }} style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer' }}>🌾 Buat Panen Skrg</button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* === PANEN MODAL === */}
      <Modal isOpen={modalOpen && modalType === 'panen'} onClose={() => setModalOpen(false)} title={editing ? 'Edit Panen' : 'Tambah Panen'}>
        <form onSubmit={handlePanenSubmit} className="modal-form">
          <div className="form-group">
            <label>Kandang *</label>
            <select value={panenForm.kodeKandang} onChange={(e) => setPanenForm({ ...panenForm, kodeKandang: e.target.value })} required disabled={!!editing}>
              <option value="">-- Pilih Kandang --</option>
              {kandangs.map(k => <option key={k.KodeKandang} value={k.KodeKandang}>{k.KodeKandang} ({k.NamaTim || '-'})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Tanggal Panen *</label>
            <input type="date" value={panenForm.tanggalPanen} onChange={(e) => setPanenForm({ ...panenForm, tanggalPanen: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Total Berat (kg)</label>
              <input type="number" value={panenForm.totalBerat} onChange={(e) => setPanenForm({ ...panenForm, totalBerat: e.target.value })} min="0" step="0.1" placeholder="1500" />
            </div>
            <div className="form-group">
              <label>Total Harga (Rp)</label>
              <input type="number" value={panenForm.totalHarga} onChange={(e) => setPanenForm({ ...panenForm, totalHarga: e.target.value })} min="0" placeholder="25000000" />
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : (editing ? 'Perbarui' : 'Tambah Panen')}</button>
          </div>
        </form>
      </Modal>

      {/* === PENGIRIMAN MODAL === */}
      <Modal isOpen={modalOpen && modalType === 'pengiriman'} onClose={() => setModalOpen(false)} title={editing ? 'Edit Pengiriman' : 'Tambah Pengiriman'}>
        <form onSubmit={handlePengirimanSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Kandang *</label>
              <select value={pengirimanForm.kodeKandang} onChange={(e) => setPengirimanForm({ ...pengirimanForm, kodeKandang: e.target.value, kodePanen: '' })} required disabled={!!editing}>
                <option value="">-- Pilih Kandang --</option>
                {kandangs.map(k => <option key={k.KodeKandang} value={k.KodeKandang}>{k.KodeKandang} ({k.NamaTim || '-'})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Panen *</label>
              <select value={pengirimanForm.kodePanen} onChange={(e) => setPengirimanForm({ ...pengirimanForm, kodePanen: e.target.value })} required disabled={!!editing}>
                <option value="">-- Pilih Data Panen --</option>
                {getPanensForKandang().map(p => <option key={p.KodePanen} value={p.KodePanen}>{p.KodePanen} - {formatDate(p.TanggalPanen)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Staf / PJ *</label>
              <select value={pengirimanForm.kodeStaf} onChange={(e) => setPengirimanForm({ ...pengirimanForm, kodeStaf: e.target.value })} required>
                <option value="">-- Pilih Staf --</option>
                {staffs.map(s => <option key={s.KodeStaf} value={s.KodeStaf}>{s.NamaStaf}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Tanggal Kirim *</label>
              <input type="date" value={pengirimanForm.tanggalPengiriman} onChange={(e) => setPengirimanForm({ ...pengirimanForm, tanggalPengiriman: e.target.value })} required />
            </div>
          </div>
          <div className="form-group" style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#3b82f6', marginBottom: '4px', display: 'block' }}>📍 Tujuan Pengiriman</label>
            <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#475569' }}>Pengiriman akan otomatis dirouting ke jaringan Blockchain Processor tujuan Anda.</p>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Menyimpan...' : (editing ? 'Perbarui' : 'Tambah Pengiriman')}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DashboardPanenPengiriman
