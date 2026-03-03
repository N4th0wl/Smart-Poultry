import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { warehouseService } from '../services'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import './DashboardPage.css'

function DashboardWarehouse() {
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState([])
  const [perlengkapanList, setPerlengkapanList] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState(null)
  const [formData, setFormData] = useState({ lokasiWarehouse: '' })
  const [transferData, setTransferData] = useState({
    fromWarehouse: '',
    toWarehouse: '',
    kodePerlengkapan: '',
    jumlah: ''
  })
  const [saving, setSaving] = useState(false)
  const [transferring, setTransferring] = useState(false)

  // Get stock for source warehouse to show available amount
  const [sourceStock, setSourceStock] = useState([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [warehouseData, perlengkapanData] = await Promise.all([
        warehouseService.getWarehouses(),
        warehouseService.getAllPerlengkapan()
      ])
      setWarehouses(warehouseData.data || warehouseData || [])
      setPerlengkapanList(perlengkapanData.data || [])
    } catch (error) {
      console.error('Failed to fetch warehouses:', error)
      toast.error('Gagal memuat data warehouse')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Fetch stock when source warehouse changes
  const fetchSourceStock = async (kodeWarehouse) => {
    if (!kodeWarehouse) {
      setSourceStock([])
      return
    }
    try {
      const data = await warehouseService.getWarehouseById(kodeWarehouse)
      // API returns { data: { stok: [...] } } with JumlahStok field
      const stokData = data.data?.stok || data.stok || []
      // Normalize to use 'Jumlah' field name
      setSourceStock(stokData.map(s => ({ ...s, Jumlah: s.JumlahStok || s.Jumlah || 0 })))
    } catch {
      setSourceStock([])
    }
  }

  const openCreateModal = () => {
    setEditingWarehouse(null)
    setFormData({ lokasiWarehouse: '' })
    setModalOpen(true)
  }

  const openEditModal = (warehouse) => {
    setEditingWarehouse(warehouse)
    setFormData({ lokasiWarehouse: warehouse.LokasiWarehouse || '' })
    setModalOpen(true)
  }

  const openTransferModal = () => {
    setTransferData({
      fromWarehouse: '',
      toWarehouse: '',
      kodePerlengkapan: '',
      jumlah: ''
    })
    setSourceStock([])
    setTransferModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.lokasiWarehouse) {
      toast.error('Lokasi warehouse wajib diisi')
      return
    }

    setSaving(true)
    try {
      if (editingWarehouse) {
        await warehouseService.updateWarehouse(editingWarehouse.KodeWarehouse, formData)
        toast.success('Warehouse berhasil diupdate')
      } else {
        await warehouseService.createWarehouse(formData)
        toast.success('Warehouse berhasil ditambahkan')
      }
      setModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save warehouse error:', error)
      toast.error('Gagal menyimpan warehouse')
    } finally {
      setSaving(false)
    }
  }

  const handleTransfer = async (e) => {
    e.preventDefault()

    if (!transferData.fromWarehouse || !transferData.toWarehouse || !transferData.kodePerlengkapan || !transferData.jumlah) {
      toast.error('Semua field wajib diisi')
      return
    }

    if (transferData.fromWarehouse === transferData.toWarehouse) {
      toast.error('Warehouse asal dan tujuan tidak boleh sama')
      return
    }

    const jumlah = parseInt(transferData.jumlah)
    if (jumlah <= 0) {
      toast.error('Jumlah harus lebih dari 0')
      return
    }

    setTransferring(true)
    try {
      await warehouseService.transferStock({
        ...transferData,
        jumlah
      })
      toast.success(`Berhasil memindahkan ${jumlah} item`)
      setTransferModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Transfer error:', error)
      toast.error(error.response?.data?.error || 'Gagal memindahkan stok')
    } finally {
      setTransferring(false)
    }
  }

  const handleDelete = async (warehouse) => {
    if (!confirm(`Hapus warehouse "${warehouse.LokasiWarehouse}"?`)) return

    try {
      await warehouseService.deleteWarehouse(warehouse.KodeWarehouse)
      toast.success('Warehouse berhasil dihapus')
      fetchData()
    } catch (error) {
      console.error('Delete warehouse error:', error)
      toast.error(error.response?.data?.error || 'Gagal menghapus warehouse')
    }
  }

  const viewPerlengkapan = (warehouse) => {
    navigate(`/dashboard/warehouse/${warehouse.KodeWarehouse}/perlengkapan`)
  }

  // Get available stock for the selected item in source warehouse
  const selectedItemStock = sourceStock.find(s => s.KodePerlengkapan === transferData.kodePerlengkapan)

  const columns = [
    { key: 'KodeWarehouse', label: 'Kode', sortable: true },
    { key: 'LokasiWarehouse', label: 'Lokasi', sortable: true },
    {
      key: 'jumlahItem',
      label: 'Jenis Item',
      sortable: true,
      render: (val) => `${val || 0} jenis`
    },
    {
      key: 'totalStok',
      label: 'Total Stok',
      sortable: true,
      render: (val) => `${val || 0} unit`
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="table-actions">
          <button className="btn-action btn-view" onClick={(e) => { e.stopPropagation(); viewPerlengkapan(row); }}>
            Lihat Stok
          </button>
          <button className="btn-action btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(row); }}>
            Edit
          </button>
          <button className="btn-action btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>
            Hapus
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="dashboard-page">
        <LoadingState variant="spinner" text="Memuat data warehouse..." />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Manajemen Warehouse</h1>
          <p>Kelola gudang penyimpanan barang</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {warehouses.length >= 2 && (
            <button className="btn-secondary" onClick={openTransferModal} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem'
            }}>
              🔄 Transfer Stok
            </button>
          )}
          <button className="btn-primary" onClick={openCreateModal}>
            Tambah Warehouse
          </button>
        </div>
      </div>

      {warehouses.length === 0 ? (
        <EmptyState
          title="Belum Ada Warehouse"
          message="Tambahkan warehouse untuk menyimpan perlengkapan"
          actionLabel="Tambah Warehouse"
          onAction={openCreateModal}
        />
      ) : (
        <div className="page-content">
          <DataTable
            columns={columns}
            data={warehouses}
            pageSize={10}
            onRowClick={viewPerlengkapan}
          />
        </div>
      )}

      {/* Create/Edit Warehouse Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingWarehouse ? 'Edit Warehouse' : 'Tambah Warehouse'}
        size="medium"
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="lokasiWarehouse">Lokasi Warehouse *</label>
            <input
              type="text"
              id="lokasiWarehouse"
              value={formData.lokasiWarehouse}
              onChange={(e) => setFormData({ ...formData, lokasiWarehouse: e.target.value })}
              placeholder="Contoh: Gudang Utama, Gudang Pakan"
              required
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editingWarehouse ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Stock Modal */}
      <Modal
        isOpen={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
        title="Transfer Stok Antar Warehouse"
        size="medium"
      >
        <form onSubmit={handleTransfer} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fromWarehouse">Warehouse Asal *</label>
              <select
                id="fromWarehouse"
                value={transferData.fromWarehouse}
                onChange={(e) => {
                  setTransferData({ ...transferData, fromWarehouse: e.target.value, kodePerlengkapan: '', jumlah: '' })
                  fetchSourceStock(e.target.value)
                }}
                required
              >
                <option value="">Pilih Warehouse Asal</option>
                {warehouses.map((w) => (
                  <option key={w.KodeWarehouse} value={w.KodeWarehouse}>
                    {w.LokasiWarehouse} ({w.totalStok || 0} stok)
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="toWarehouse">Warehouse Tujuan *</label>
              <select
                id="toWarehouse"
                value={transferData.toWarehouse}
                onChange={(e) => setTransferData({ ...transferData, toWarehouse: e.target.value })}
                required
              >
                <option value="">Pilih Warehouse Tujuan</option>
                {warehouses
                  .filter(w => w.KodeWarehouse !== transferData.fromWarehouse)
                  .map((w) => (
                    <option key={w.KodeWarehouse} value={w.KodeWarehouse}>
                      {w.LokasiWarehouse}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="kodePerlengkapan">Perlengkapan *</label>
            <select
              id="kodePerlengkapan"
              value={transferData.kodePerlengkapan}
              onChange={(e) => setTransferData({ ...transferData, kodePerlengkapan: e.target.value, jumlah: '' })}
              required
              disabled={!transferData.fromWarehouse}
            >
              <option value="">{transferData.fromWarehouse ? 'Pilih Perlengkapan' : 'Pilih warehouse asal terlebih dahulu'}</option>
              {sourceStock.map((s) => (
                <option key={s.KodePerlengkapan} value={s.KodePerlengkapan}>
                  {s.NamaPerlengkapan || s.KodePerlengkapan} — Stok: {s.Jumlah}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="jumlahTransfer">
              Jumlah Transfer *
              {selectedItemStock && (
                <span style={{ fontWeight: 'normal', color: 'var(--text-secondary, #64748b)', marginLeft: '0.5rem' }}>
                  (Tersedia: {selectedItemStock.Jumlah})
                </span>
              )}
            </label>
            <input
              type="number"
              id="jumlahTransfer"
              value={transferData.jumlah}
              onChange={(e) => setTransferData({ ...transferData, jumlah: e.target.value })}
              placeholder="0"
              min="1"
              max={selectedItemStock?.Jumlah || undefined}
              required
              disabled={!transferData.kodePerlengkapan}
            />
          </div>

          {/* Transfer summary */}
          {transferData.fromWarehouse && transferData.toWarehouse && transferData.kodePerlengkapan && transferData.jumlah && (
            <div style={{
              background: 'var(--bg-card, #f0fdf4)',
              padding: '1rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--success-color, #22c55e)',
              fontSize: '0.875rem'
            }}>
              <strong>Ringkasan Transfer:</strong>
              <p style={{ margin: '0.5rem 0 0' }}>
                📦 Memindahkan <strong>{transferData.jumlah}</strong> unit{' '}
                <strong>{sourceStock.find(s => s.KodePerlengkapan === transferData.kodePerlengkapan)?.NamaPerlengkapan || transferData.kodePerlengkapan}</strong>
                {' '}dari <strong>{warehouses.find(w => w.KodeWarehouse === transferData.fromWarehouse)?.LokasiWarehouse}</strong>
                {' '}ke <strong>{warehouses.find(w => w.KodeWarehouse === transferData.toWarehouse)?.LokasiWarehouse}</strong>
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setTransferModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={transferring}>
              {transferring ? 'Memindahkan...' : '🔄 Transfer'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DashboardWarehouse
