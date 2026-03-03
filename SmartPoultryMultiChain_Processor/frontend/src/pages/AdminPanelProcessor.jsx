import { useState, useEffect, useCallback } from 'react'
import adminService from '../services/adminService'
import { useToast } from '../components/ToastProvider'
import '../styles/AdminDashboard.css'

function AdminPanelProcessor() {
    const [processors, setProcessors] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('create')
    const [selectedProcessor, setSelectedProcessor] = useState(null)
    const [form, setForm] = useState({
        namaProcessor: '', alamatProcessor: '', kontakProcessor: '',
        email: '', password: '',
    })
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const { showToast } = useToast()

    const loadProcessors = useCallback(async () => {
        setLoading(true)
        try {
            const data = await adminService.getProcessors(searchQuery)
            setProcessors(data)
        } catch (error) {
            showToast({ title: 'Error', description: 'Gagal memuat data processor', status: 'error' })
        } finally {
            setLoading(false)
        }
    }, [searchQuery])

    useEffect(() => {
        const timer = setTimeout(() => {
            loadProcessors()
        }, 300)
        return () => clearTimeout(timer)
    }, [loadProcessors])

    const handleCreate = () => {
        setModalMode('create')
        setForm({ namaProcessor: '', alamatProcessor: '', kontakProcessor: '', email: '', password: '' })
        setSelectedProcessor(null)
        setShowModal(true)
    }

    const handleEdit = (processor) => {
        setModalMode('edit')
        setSelectedProcessor(processor)
        setForm({
            namaProcessor: processor.namaProcessor,
            alamatProcessor: processor.alamatProcessor === '-' ? '' : processor.alamatProcessor,
            kontakProcessor: processor.kontakProcessor === '-' ? '' : processor.kontakProcessor,
            email: '', password: '',
        })
        setShowModal(true)
    }

    const handleDeleteClick = (processor) => {
        setDeleteConfirm(processor)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return
        try {
            await adminService.deleteProcessor(deleteConfirm.idProcessor)
            showToast({ title: 'Berhasil', description: 'Processor berhasil dihapus', status: 'success' })
            setDeleteConfirm(null)
            loadProcessors()
        } catch (error) {
            showToast({ title: 'Error', description: error.response?.data?.message || 'Gagal menghapus processor', status: 'error' })
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (modalMode === 'create') {
                if (!form.namaProcessor || !form.email || !form.password) {
                    showToast({ title: 'Peringatan', description: 'Nama processor, email, dan password wajib diisi', status: 'warning' })
                    setSaving(false)
                    return
                }
                await adminService.createProcessor(form)
                showToast({ title: 'Berhasil', description: 'Processor berhasil dibuat', status: 'success' })
            } else {
                const updateData = {
                    namaProcessor: form.namaProcessor,
                    alamatProcessor: form.alamatProcessor,
                    kontakProcessor: form.kontakProcessor,
                }
                await adminService.updateProcessor(selectedProcessor.idProcessor, updateData)
                showToast({ title: 'Berhasil', description: 'Processor berhasil diperbarui', status: 'success' })
            }
            setShowModal(false)
            loadProcessors()
        } catch (error) {
            showToast({ title: 'Error', description: error.response?.data?.message || 'Gagal menyimpan data processor', status: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const formatDate = (dateStr) => {
        if (!dateStr) return '-'
        try {
            return new Date(dateStr).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric'
            })
        } catch { return dateStr }
    }

    return (
        <div className="admin-page">
            {/* Page Header */}
            <div className="admin-page-header">
                <div className="admin-header-content">
                    <div className="admin-header-icon">🏭</div>
                    <div>
                        <h1 id="admin-processors-title">Panel Processor</h1>
                        <p className="admin-subtitle">Manajemen unit pengolahan terdaftar</p>
                    </div>
                </div>
                <button className="admin-create-btn" onClick={handleCreate}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Tambah Processor
                </button>
            </div>

            {/* Search Bar */}
            <div className="admin-search-container">
                <div className="admin-search-wrapper">
                    <svg className="admin-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Cari berdasarkan kode, nama, atau alamat processor..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        id="admin-processor-search"
                    />
                    {searchQuery && (
                        <button className="admin-search-clear" onClick={() => setSearchQuery('')}>
                            ✕
                        </button>
                    )}
                </div>
                <span className="admin-search-count">{processors.length} processor ditemukan</span>
            </div>

            {/* Processors Table */}
            <div className="admin-table-card">
                {loading ? (
                    <div className="admin-loading">
                        <div className="admin-spinner" />
                        <p>Memuat data processor...</p>
                    </div>
                ) : processors.length === 0 ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">🏭</div>
                        <h3>Belum ada processor terdaftar</h3>
                        <p>Klik tombol "Tambah Processor" untuk mendaftarkan unit pengolahan baru.</p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table" id="admin-processors-table">
                            <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Nama Processor</th>
                                    <th>Alamat</th>
                                    <th>Kontak</th>
                                    <th>Users</th>
                                    <th>Orders</th>
                                    <th>Chains</th>
                                    <th>Terdaftar</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processors.map((proc) => (
                                    <tr key={proc.idProcessor}>
                                        <td>
                                            <span className="admin-code-badge">{proc.kodeProcessor}</span>
                                        </td>
                                        <td>
                                            <strong>{proc.namaProcessor}</strong>
                                        </td>
                                        <td>{proc.alamatProcessor}</td>
                                        <td>{proc.kontakProcessor}</td>
                                        <td>
                                            <span className="admin-stat-mini">👤 {proc.totalUsers}</span>
                                        </td>
                                        <td>
                                            <span className="admin-stat-mini">📦 {proc.totalOrders}</span>
                                        </td>
                                        <td>
                                            <span className="admin-stat-mini">🔗 {proc.totalChains}</span>
                                        </td>
                                        <td>{formatDate(proc.createdAt)}</td>
                                        <td>
                                            <div className="admin-action-btns">
                                                <button
                                                    className="admin-edit-btn"
                                                    onClick={() => handleEdit(proc)}
                                                    title="Edit processor"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button
                                                    className="admin-delete-btn"
                                                    onClick={() => handleDeleteClick(proc)}
                                                    title="Hapus processor"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6" />
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                    </svg>
                                                    Hapus
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-modal-header">
                            <h2>{modalMode === 'create' ? 'Tambah Processor Baru' : 'Edit Processor'}</h2>
                            <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="admin-modal-form">
                            <div className="admin-form-grid">
                                <label className="admin-form-full">
                                    <span>Nama Processor</span>
                                    <input
                                        type="text"
                                        value={form.namaProcessor}
                                        onChange={(e) => setForm(prev => ({ ...prev, namaProcessor: e.target.value }))}
                                        placeholder="PT. Processor Ayam Indonesia"
                                        required
                                        disabled={saving}
                                    />
                                </label>
                                <label>
                                    <span>Alamat</span>
                                    <input
                                        type="text"
                                        value={form.alamatProcessor}
                                        onChange={(e) => setForm(prev => ({ ...prev, alamatProcessor: e.target.value }))}
                                        placeholder="Kota / Kabupaten"
                                        disabled={saving}
                                    />
                                </label>
                                <label>
                                    <span>Kontak</span>
                                    <input
                                        type="text"
                                        value={form.kontakProcessor}
                                        onChange={(e) => setForm(prev => ({ ...prev, kontakProcessor: e.target.value }))}
                                        placeholder="08xxxxxxxxxx"
                                        disabled={saving}
                                    />
                                </label>
                                {modalMode === 'create' && (
                                    <>
                                        <label>
                                            <span>Email User Awal</span>
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                                placeholder="admin@processor.id"
                                                required
                                                disabled={saving}
                                            />
                                        </label>
                                        <label>
                                            <span>Password</span>
                                            <input
                                                type="password"
                                                value={form.password}
                                                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                                placeholder="Min. 6 karakter"
                                                required
                                                disabled={saving}
                                            />
                                        </label>
                                    </>
                                )}
                            </div>
                            <div className="admin-modal-actions">
                                <button type="button" className="ghost-button" onClick={() => setShowModal(false)} disabled={saving}>
                                    Batal
                                </button>
                                <button type="submit" className="admin-save-btn" disabled={saving}>
                                    {saving ? 'Menyimpan...' : modalMode === 'create' ? 'Buat Processor' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {deleteConfirm && (
                <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
                    <div className="admin-modal-card admin-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="admin-delete-modal-icon">⚠️</div>
                        <h2>Hapus Processor</h2>
                        <p>Apakah Anda yakin ingin menghapus <strong>{deleteConfirm.namaProcessor}</strong> ({deleteConfirm.kodeProcessor})?</p>
                        <p className="admin-delete-warning">Tindakan ini tidak dapat dibatalkan.</p>
                        <div className="admin-modal-actions">
                            <button className="ghost-button" onClick={() => setDeleteConfirm(null)}>Batal</button>
                            <button className="admin-confirm-delete-btn" onClick={handleDeleteConfirm}>Hapus Processor</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminPanelProcessor
