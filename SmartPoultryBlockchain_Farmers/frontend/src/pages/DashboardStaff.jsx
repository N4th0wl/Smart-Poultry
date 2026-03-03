import { useState, useEffect } from 'react'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import { staffService } from '../services/staffService'
import './DashboardPage.css'

function DashboardStaff() {
  const [activeTab, setActiveTab] = useState('tim')
  const [teams, setTeams] = useState([])
  const [staffs, setStaffs] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('tim') // 'tim' or 'staf'
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  // Tim form (includes initial staff member)
  const [timForm, setTimForm] = useState({
    namaTim: '',
    stafAwal: {
      namaStaf: '',
      posisiStaf: ''
    }
  })

  // Edit tim form (name only)
  const [editTimForm, setEditTimForm] = useState({
    namaTim: ''
  })

  // Staf form
  const [stafForm, setStafForm] = useState({
    kodeTim: '',
    namaStaf: '',
    posisiStaf: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [timRes, stafRes] = await Promise.all([
        staffService.getTim(),
        staffService.getStaf()
      ])

      setTeams(timRes.data || timRes || [])
      setStaffs(stafRes.data || stafRes || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  // =====================================================
  // TIM HANDLERS
  // =====================================================
  const openTimCreate = () => {
    setTimForm({
      namaTim: '',
      stafAwal: { namaStaf: '', posisiStaf: '' }
    })
    setEditing(null)
    setModalType('tim')
    setModalOpen(true)
  }

  const openTimEdit = (tim) => {
    setEditTimForm({ namaTim: tim.NamaTim })
    setEditing(tim)
    setModalType('editTim')
    setModalOpen(true)
  }

  const handleTimSubmit = async (e) => {
    e.preventDefault()
    if (!timForm.namaTim) {
      toast.error('Nama tim wajib diisi')
      return
    }
    if (!timForm.stafAwal.namaStaf) {
      toast.error('Tim harus memiliki minimal 1 anggota staf. Isi data staf awal.')
      return
    }

    setSaving(true)
    try {
      await staffService.createTim({
        namaTim: timForm.namaTim,
        stafAwal: timForm.stafAwal
      })
      toast.success('Tim dan staf awal berhasil dibuat')
      setModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error.response?.data?.error || 'Gagal membuat tim')
    } finally {
      setSaving(false)
    }
  }

  const handleTimEditSubmit = async (e) => {
    e.preventDefault()
    if (!editTimForm.namaTim) {
      toast.error('Nama tim wajib diisi')
      return
    }

    setSaving(true)
    try {
      await staffService.updateTim(editing.KodeTim, editTimForm)
      toast.success('Tim berhasil diperbarui')
      setModalOpen(false)
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal memperbarui tim')
    } finally {
      setSaving(false)
    }
  }

  const handleTimDelete = async (tim) => {
    const staffCount = tim.jumlahStaf || tim.JumlahAnggota || 0
    if (staffCount > 0) {
      toast.error(`Tidak dapat menghapus tim "${tim.NamaTim}" karena masih memiliki ${staffCount} anggota. Pindahkan atau hapus staf terlebih dahulu.`)
      return
    }
    if (!confirm(`Hapus tim "${tim.NamaTim}"?`)) return

    try {
      await staffService.deleteTim(tim.KodeTim)
      toast.success('Tim berhasil dihapus')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menghapus tim')
    }
  }

  // =====================================================
  // STAF HANDLERS
  // =====================================================
  const openStafCreate = () => {
    setStafForm({ kodeTim: '', namaStaf: '', posisiStaf: '' })
    setEditing(null)
    setModalType('staf')
    setModalOpen(true)
  }

  const openStafEdit = (staf) => {
    setStafForm({
      kodeTim: staf.KodeTim,
      namaStaf: staf.NamaStaf,
      posisiStaf: staf.PosisiStaf || ''
    })
    setEditing(staf)
    setModalType('staf')
    setModalOpen(true)
  }

  const handleStafSubmit = async (e) => {
    e.preventDefault()
    if (!stafForm.kodeTim || !stafForm.namaStaf) {
      toast.error('Tim dan nama staf wajib diisi')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await staffService.updateStaf(editing.KodeStaf, stafForm)
        toast.success('Staf berhasil diperbarui')
      } else {
        await staffService.createStaf(stafForm)
        toast.success('Staf berhasil ditambahkan')
      }
      setModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save error:', error)
      toast.error(error.response?.data?.error || 'Gagal menyimpan staf')
    } finally {
      setSaving(false)
    }
  }

  const handleStafDelete = async (staf) => {
    if (!confirm(`Hapus staf "${staf.NamaStaf}"?`)) return

    try {
      await staffService.deleteStaf(staf.KodeStaf)
      toast.success('Staf berhasil dihapus')
      fetchData()
    } catch (error) {
      toast.error(error.response?.data?.error || 'Gagal menghapus staf')
    }
  }

  // =====================================================
  // COLUMNS
  // =====================================================
  const timColumns = [
    { key: 'KodeTim', label: 'Kode Tim', sortable: true },
    { key: 'NamaTim', label: 'Nama Tim', sortable: true },
    {
      key: 'jumlahStaf',
      label: 'Jumlah Anggota',
      render: (val, row) => {
        const count = val ?? row.JumlahAnggota ?? 0
        return (
          <span className={`status-badge ${count > 0 ? 'success' : 'danger'}`}>
            {count} anggota
          </span>
        )
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="table-actions">
          <button className="btn-action btn-view" onClick={() => viewTimDetail(row)}>
            Detail
          </button>
          <button className="btn-action btn-edit" onClick={() => openTimEdit(row)}>
            Edit
          </button>
          <button className="btn-action btn-delete" onClick={() => handleTimDelete(row)}>
            Hapus
          </button>
        </div>
      )
    }
  ]

  const stafColumns = [
    { key: 'KodeStaf', label: 'Kode Staf', sortable: true },
    { key: 'NamaStaf', label: 'Nama', sortable: true },
    {
      key: 'PosisiStaf',
      label: 'Posisi',
      render: (val) => val || '-'
    },
    {
      key: 'NamaTim',
      label: 'Tim',
      render: (val) => val || '-',
      sortable: true
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="table-actions">
          <button className="btn-action btn-edit" onClick={() => openStafEdit(row)}>
            Edit
          </button>
          <button className="btn-action btn-delete" onClick={() => handleStafDelete(row)}>
            Hapus
          </button>
        </div>
      )
    }
  ]

  // Tim detail view
  const [detailModal, setDetailModal] = useState(false)
  const [selectedTim, setSelectedTim] = useState(null)
  const [timStaff, setTimStaff] = useState([])

  const viewTimDetail = async (tim) => {
    try {
      const res = await staffService.getTimById(tim.KodeTim)
      const data = res.data || res
      setSelectedTim(data)
      setTimStaff(data.staf || [])
      setDetailModal(true)
    } catch (error) {
      toast.error('Gagal memuat detail tim')
    }
  }

  if (loading) return (
    <div className="dashboard-page">
      <LoadingState text="Memuat data staf & tim..." />
    </div>
  )

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Tim & Staf</h1>
          <p>Kelola tim kerja dan anggota staf peternakan</p>
        </div>
        <button
          className="btn-primary"
          onClick={activeTab === 'tim' ? openTimCreate : openStafCreate}
        >
          {activeTab === 'tim' ? '+ Buat Tim Baru' : '+ Tambah Staf'}
        </button>
      </div>

      {/* Info banner about team constraint */}
      <div style={{
        background: 'linear-gradient(135deg, #fff8e1, #fff3c4)',
        border: '1px solid #ffe082',
        borderRadius: '12px',
        padding: '0.75rem 1.25rem',
        marginBottom: '1.5rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        fontSize: '0.9rem',
        color: '#6d5700'
      }}>
        <span style={{ fontSize: '1.2rem' }}>ℹ️</span>
        <span>Setiap tim <strong>wajib memiliki minimal 1 anggota staf</strong>. Saat membuat tim baru, Anda perlu mengisi data staf pertama.</span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'tim' ? 'active' : ''}`}
          onClick={() => setActiveTab('tim')}
        >
          👥 Tim Kerja ({teams.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'staf' ? 'active' : ''}`}
          onClick={() => setActiveTab('staf')}
        >
          👤 Staf ({staffs.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="page-content">
        {activeTab === 'tim' && (
          teams.length === 0 ? (
            <EmptyState
              title="Belum Ada Tim"
              message="Buat tim kerja baru untuk mengelola kandang"
              actionLabel="Buat Tim"
              onAction={openTimCreate}
            />
          ) : (
            <DataTable columns={timColumns} data={teams} />
          )
        )}

        {activeTab === 'staf' && (
          staffs.length === 0 ? (
            <EmptyState
              title="Belum Ada Staf"
              message="Tambahkan staf ke dalam tim yang sudah dibuat"
              actionLabel="Tambah Staf"
              onAction={openStafCreate}
            />
          ) : (
            <DataTable columns={stafColumns} data={staffs} />
          )
        )}
      </div>

      {/* === CREATE TIM MODAL (with required initial staff) === */}
      <Modal
        isOpen={modalOpen && modalType === 'tim'}
        onClose={() => setModalOpen(false)}
        title="Buat Tim Kerja Baru"
      >
        <form onSubmit={handleTimSubmit} className="modal-form">
          <div className="form-group">
            <label>Nama Tim *</label>
            <input
              type="text"
              value={timForm.namaTim}
              onChange={(e) => setTimForm({ ...timForm, namaTim: e.target.value })}
              placeholder="Misal: Tim Kandang A"
              required
            />
          </div>

          <div style={{
            background: 'rgba(47, 90, 60, 0.06)',
            border: '1px solid rgba(47, 90, 60, 0.15)',
            borderRadius: '12px',
            padding: '1.25rem'
          }}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#2f5a3c', fontSize: '0.95rem' }}>
              👤 Staf Awal (Wajib)
            </h4>
            <div className="form-group">
              <label>Nama Staf *</label>
              <input
                type="text"
                value={timForm.stafAwal.namaStaf}
                onChange={(e) => setTimForm({
                  ...timForm,
                  stafAwal: { ...timForm.stafAwal, namaStaf: e.target.value }
                })}
                placeholder="Nama lengkap staf"
                required
              />
            </div>
            <div className="form-group">
              <label>Posisi</label>
              <input
                type="text"
                value={timForm.stafAwal.posisiStaf}
                onChange={(e) => setTimForm({
                  ...timForm,
                  stafAwal: { ...timForm.stafAwal, posisiStaf: e.target.value }
                })}
                placeholder="Misal: Ketua Tim, Anak Kandang"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Membuat...' : 'Buat Tim & Staf'}
            </button>
          </div>
        </form>
      </Modal>

      {/* === EDIT TIM MODAL === */}
      <Modal
        isOpen={modalOpen && modalType === 'editTim'}
        onClose={() => setModalOpen(false)}
        title="Edit Tim"
      >
        <form onSubmit={handleTimEditSubmit} className="modal-form">
          <div className="form-group">
            <label>Nama Tim *</label>
            <input
              type="text"
              value={editTimForm.namaTim}
              onChange={(e) => setEditTimForm({ namaTim: e.target.value })}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>

      {/* === STAF MODAL (Create/Edit) === */}
      <Modal
        isOpen={modalOpen && modalType === 'staf'}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Staf' : 'Tambah Staf'}
      >
        <form onSubmit={handleStafSubmit} className="modal-form">
          <div className="form-group">
            <label>Tim Kerja *</label>
            <select
              value={stafForm.kodeTim}
              onChange={(e) => setStafForm({ ...stafForm, kodeTim: e.target.value })}
              required
            >
              <option value="">-- Pilih Tim --</option>
              {teams.map(tim => (
                <option key={tim.KodeTim} value={tim.KodeTim}>
                  {tim.NamaTim} ({tim.jumlahStaf ?? tim.JumlahAnggota ?? 0} anggota)
                </option>
              ))}
            </select>
            {editing && stafForm.kodeTim !== editing.KodeTim && (
              <small style={{ color: '#e57300' }}>
                ⚠️ Memindahkan staf ke tim lain. Tim lama harus tetap memiliki min 1 anggota.
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Nama Staf *</label>
            <input
              type="text"
              value={stafForm.namaStaf}
              onChange={(e) => setStafForm({ ...stafForm, namaStaf: e.target.value })}
              placeholder="Nama lengkap staf"
              required
            />
          </div>

          <div className="form-group">
            <label>Posisi</label>
            <input
              type="text"
              value={stafForm.posisiStaf}
              onChange={(e) => setStafForm({ ...stafForm, posisiStaf: e.target.value })}
              placeholder="Misal: Ketua Tim, Anak Kandang, Operator"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editing ? 'Perbarui Staf' : 'Tambah Staf')}
            </button>
          </div>
        </form>
      </Modal>

      {/* === TIM DETAIL MODAL === */}
      <Modal
        isOpen={detailModal}
        onClose={() => setDetailModal(false)}
        title={`Detail Tim: ${selectedTim?.NamaTim || ''}`}
      >
        {selectedTim && (
          <div>
            <div className="detail-stats" style={{ marginBottom: '1.5rem' }}>
              <div className="detail-stat">
                <div className="value">{selectedTim.KodeTim}</div>
                <div className="label">Kode Tim</div>
              </div>
              <div className="detail-stat">
                <div className="value">{timStaff.length}</div>
                <div className="label">Jumlah Anggota</div>
              </div>
            </div>

            <h4 style={{ margin: '0 0 1rem 0', color: '#2f5a3c' }}>Daftar Anggota:</h4>

            {timStaff.length === 0 ? (
              <EmptyState title="Belum Ada Anggota" message="Belum ada staf dalam tim ini" />
            ) : (
              <div className="detail-table-wrapper">
                <table className="detail-table">
                  <thead>
                    <tr>
                      <th>Kode</th>
                      <th>Nama</th>
                      <th>Posisi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timStaff.map(s => (
                      <tr key={s.KodeStaf}>
                        <td>{s.KodeStaf}</td>
                        <td style={{ fontWeight: 600 }}>{s.NamaStaf}</td>
                        <td>{s.PosisiStaf || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default DashboardStaff
