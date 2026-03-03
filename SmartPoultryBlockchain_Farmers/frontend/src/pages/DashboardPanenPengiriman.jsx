import { useState, useEffect } from 'react'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import { panenService } from '../services/warehouseService'
import { kandangService } from '../services/farmService'
import { staffService } from '../services/staffService'
import './DashboardPage.css'

function DashboardPanenPengiriman() {
  const [activeTab, setActiveTab] = useState('panen')
  const [panens, setPanens] = useState([])
  const [pengirimans, setPengirimans] = useState([])
  const [kandangs, setKandangs] = useState([])
  const [staffs, setStaffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('panen') // 'panen' or 'pengiriman'
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

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
    tanggalPengiriman: '',
    namaPerusahaanPengiriman: '',
    alamatTujuan: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [panenRes, pengirimanRes, kandangRes, staffRes] = await Promise.all([
        panenService.getPanen(),
        panenService.getPengiriman(),
        kandangService.getKandang(),
        staffService.getStaf()
      ])

      setPanens(panenRes || [])
      setPengirimans(pengirimanRes || [])
      setKandangs(kandangRes || [])
      setStaffs(staffRes?.data || staffRes || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    return dateStr ? new Date(dateStr).toLocaleDateString('id-ID') : '-'
  }

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '-'
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount)
  }

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
      tanggalPengiriman: '',
      namaPerusahaanPengiriman: '',
      alamatTujuan: ''
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
      tanggalPengiriman: pengiriman.TanggalPengiriman?.split('T')[0] || '',
      namaPerusahaanPengiriman: pengiriman.NamaPerusahaanPengiriman || '',
      alamatTujuan: pengiriman.AlamatTujuan || ''
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

  // Get panens for a specific kandang (for pengiriman dropdown)
  const getPanensForKandang = () => {
    if (!pengirimanForm.kodeKandang) return panens
    return panens.filter(p => p.KodeKandang === pengirimanForm.kodeKandang)
  }

  // =====================================================
  // COLUMNS
  // =====================================================
  const panenColumns = [
    { key: 'KodePanen', label: 'Kode Panen', sortable: true },
    { key: 'KodeKandang', label: 'Kandang', sortable: true },
    {
      key: 'TanggalPanen',
      label: 'Tanggal Panen',
      sortable: true,
      render: (val) => formatDate(val)
    },
    {
      key: 'TotalBerat',
      label: 'Total Berat (kg)',
      render: (val) => val ? `${parseFloat(val).toLocaleString('id-ID')} kg` : '-'
    },
    {
      key: 'TotalHarga',
      label: 'Total Harga',
      render: (val) => formatCurrency(val)
    },
    {
      key: 'JumlahPengiriman',
      label: 'Pengiriman',
      render: (val) => (
        <span className={`status-badge ${val > 0 ? 'success' : 'warning'}`}>
          {val || 0} pengiriman
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="table-actions">
          <button className="btn-action btn-edit" onClick={() => openPanenEdit(row)}>
            Edit
          </button>
          <button className="btn-action btn-delete" onClick={() => handlePanenDelete(row)}>
            Hapus
          </button>
        </div>
      )
    }
  ]

  const pengirimanColumns = [
    { key: 'KodePengiriman', label: 'Kode Pengiriman', sortable: true },
    {
      key: 'KodeNotaPengiriman',
      label: 'Nota Pengiriman',
      sortable: true,
      render: (val) => val ? (
        <span className="status-badge success">{val}</span>
      ) : (
        <span className="status-badge warning">Belum ada</span>
      )
    },
    { key: 'KodePanen', label: 'Panen', sortable: true },
    { key: 'KodeKandang', label: 'Kandang', sortable: true },
    {
      key: 'TanggalPengiriman',
      label: 'Tanggal Kirim',
      sortable: true,
      render: (val) => formatDate(val)
    },
    {
      key: 'TanggalPenerimaan',
      label: 'Est. Penerimaan',
      sortable: true,
      render: (val) => val ? formatDate(val) : '-'
    },
    {
      key: 'NamaStaf',
      label: 'Penanggung Jawab',
      render: (val) => val || '-'
    },
    {
      key: 'NamaPerusahaanPengiriman',
      label: 'Perusahaan Tujuan',
      render: (val) => val || '-'
    },
    {
      key: 'AlamatTujuan',
      label: 'Alamat Tujuan',
      render: (val) => val || '-'
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="table-actions">
          <button className="btn-action btn-edit" onClick={() => openPengirimanEdit(row)}>
            Edit
          </button>
          <button className="btn-action btn-delete" onClick={() => handlePengirimanDelete(row)}>
            Hapus
          </button>
        </div>
      )
    }
  ]

  if (loading) return (
    <div className="dashboard-page">
      <LoadingState text="Memuat data panen & pengiriman..." />
    </div>
  )

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Panen & Pengiriman</h1>
          <p>Kelola data panen dan pengiriman hasil ternak</p>
        </div>
        <button
          className="btn-primary"
          onClick={activeTab === 'panen' ? openPanenCreate : openPengirimanCreate}
        >
          {activeTab === 'panen' ? '+ Tambah Panen' : '+ Tambah Pengiriman'}
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'panen' ? 'active' : ''}`}
          onClick={() => setActiveTab('panen')}
        >
          🌾 Panen ({panens.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pengiriman' ? 'active' : ''}`}
          onClick={() => setActiveTab('pengiriman')}
        >
          🚚 Pengiriman ({pengirimans.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="page-content">
        {activeTab === 'panen' && (
          panens.length === 0 ? (
            <EmptyState
              title="Belum Ada Panen"
              message="Tambahkan data panen untuk dicatat"
              actionLabel="Tambah Panen"
              onAction={openPanenCreate}
            />
          ) : (
            <DataTable columns={panenColumns} data={panens} />
          )
        )}

        {activeTab === 'pengiriman' && (
          pengirimans.length === 0 ? (
            <EmptyState
              title="Belum Ada Pengiriman"
              message="Tambahkan data pengiriman setelah melakukan panen"
              actionLabel="Tambah Pengiriman"
              onAction={openPengirimanCreate}
            />
          ) : (
            <DataTable columns={pengirimanColumns} data={pengirimans} />
          )
        )}
      </div>

      {/* === PANEN MODAL === */}
      <Modal
        isOpen={modalOpen && modalType === 'panen'}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Panen' : 'Tambah Panen'}
      >
        <form onSubmit={handlePanenSubmit} className="modal-form">
          <div className="form-group">
            <label>Kandang *</label>
            <select
              value={panenForm.kodeKandang}
              onChange={(e) => setPanenForm({ ...panenForm, kodeKandang: e.target.value })}
              required
              disabled={!!editing}
            >
              <option value="">-- Pilih Kandang --</option>
              {kandangs.map(k => (
                <option key={k.KodeKandang} value={k.KodeKandang}>
                  {k.KodeKandang} ({k.NamaTim || '-'})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tanggal Panen *</label>
            <input
              type="date"
              value={panenForm.tanggalPanen}
              onChange={(e) => setPanenForm({ ...panenForm, tanggalPanen: e.target.value })}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Total Berat (kg)</label>
              <input
                type="number"
                value={panenForm.totalBerat}
                onChange={(e) => setPanenForm({ ...panenForm, totalBerat: e.target.value })}
                min="0"
                step="0.1"
                placeholder="Misal: 1500"
              />
            </div>
            <div className="form-group">
              <label>Total Harga (Rp)</label>
              <input
                type="number"
                value={panenForm.totalHarga}
                onChange={(e) => setPanenForm({ ...panenForm, totalHarga: e.target.value })}
                min="0"
                placeholder="Misal: 25000000"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editing ? 'Perbarui' : 'Tambah Panen')}
            </button>
          </div>
        </form>
      </Modal>

      {/* === PENGIRIMAN MODAL === */}
      <Modal
        isOpen={modalOpen && modalType === 'pengiriman'}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Pengiriman' : 'Tambah Pengiriman'}
      >
        <form onSubmit={handlePengirimanSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Kandang *</label>
              <select
                value={pengirimanForm.kodeKandang}
                onChange={(e) => setPengirimanForm({
                  ...pengirimanForm,
                  kodeKandang: e.target.value,
                  kodePanen: '' // Reset panen when kandang changes
                })}
                required
                disabled={!!editing}
              >
                <option value="">-- Pilih Kandang --</option>
                {kandangs.map(k => (
                  <option key={k.KodeKandang} value={k.KodeKandang}>
                    {k.KodeKandang} ({k.NamaTim || '-'})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Panen *</label>
              <select
                value={pengirimanForm.kodePanen}
                onChange={(e) => setPengirimanForm({ ...pengirimanForm, kodePanen: e.target.value })}
                required
                disabled={!!editing}
              >
                <option value="">-- Pilih Data Panen --</option>
                {getPanensForKandang().map(p => (
                  <option key={p.KodePanen} value={p.KodePanen}>
                    {p.KodePanen} - {formatDate(p.TanggalPanen)} ({p.TotalBerat ? `${p.TotalBerat} kg` : '-'})
                  </option>
                ))}
              </select>
              {pengirimanForm.kodeKandang && getPanensForKandang().length === 0 && (
                <small style={{ color: '#c23b32' }}>Belum ada data panen untuk kandang ini</small>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Penanggung Jawab (Staf) *</label>
              <select
                value={pengirimanForm.kodeStaf}
                onChange={(e) => setPengirimanForm({ ...pengirimanForm, kodeStaf: e.target.value })}
                required
              >
                <option value="">-- Pilih Staf --</option>
                {staffs.map(s => (
                  <option key={s.KodeStaf} value={s.KodeStaf}>
                    {s.NamaStaf} ({s.PosisiStaf || s.NamaTim || '-'})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tanggal Pengiriman *</label>
              <input
                type="date"
                value={pengirimanForm.tanggalPengiriman}
                onChange={(e) => setPengirimanForm({ ...pengirimanForm, tanggalPengiriman: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Nama Perusahaan Tujuan</label>
            <input
              type="text"
              value={pengirimanForm.namaPerusahaanPengiriman}
              onChange={(e) => setPengirimanForm({ ...pengirimanForm, namaPerusahaanPengiriman: e.target.value })}
              placeholder="Nama perusahaan penerima"
            />
          </div>

          <div className="form-group">
            <label>Alamat Tujuan</label>
            <textarea
              value={pengirimanForm.alamatTujuan}
              onChange={(e) => setPengirimanForm({ ...pengirimanForm, alamatTujuan: e.target.value })}
              placeholder="Alamat lengkap tujuan pengiriman"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editing ? 'Perbarui' : 'Tambah Pengiriman')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DashboardPanenPengiriman
