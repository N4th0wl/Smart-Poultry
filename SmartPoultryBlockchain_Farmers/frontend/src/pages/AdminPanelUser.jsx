import { useState, useEffect, useCallback } from 'react'
import adminService from '../services/adminService'
import toast from 'react-hot-toast'
import '../styles/AdminDashboard.css'

function AdminPanelUser() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('create') // create | edit
    const [selectedUser, setSelectedUser] = useState(null)
    const [form, setForm] = useState({ email: '', password: '', namaPeternakan: '', lokasiPeternakan: '' })
    const [saving, setSaving] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const loadUsers = useCallback(async () => {
        setLoading(true)
        try {
            const data = await adminService.getUsers(searchQuery)
            setUsers(data)
        } catch (error) {
            toast.error('Gagal memuat data user')
        } finally {
            setLoading(false)
        }
    }, [searchQuery])

    useEffect(() => {
        const timer = setTimeout(() => {
            loadUsers()
        }, 300) // debounce search
        return () => clearTimeout(timer)
    }, [loadUsers])

    const handleCreate = () => {
        setModalMode('create')
        setForm({ email: '', password: '', namaPeternakan: '', lokasiPeternakan: '' })
        setSelectedUser(null)
        setShowModal(true)
    }

    const handleEdit = (user) => {
        setModalMode('edit')
        setSelectedUser(user)
        setForm({
            email: user.email,
            password: '',
            namaPeternakan: user.namaPeternakan,
            lokasiPeternakan: user.lokasiPeternakan
        })
        setShowModal(true)
    }

    const handleDeleteClick = (user) => {
        setDeleteConfirm(user)
    }

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return
        try {
            await adminService.deleteUser(deleteConfirm.userId)
            toast.success('User berhasil dihapus')
            setDeleteConfirm(null)
            loadUsers()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal menghapus user')
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setSaving(true)
        try {
            if (modalMode === 'create') {
                if (!form.email || !form.password || !form.namaPeternakan || !form.lokasiPeternakan) {
                    toast.error('Semua field wajib diisi')
                    setSaving(false)
                    return
                }
                await adminService.createUser(form)
                toast.success('User berhasil dibuat')
            } else {
                const updateData = {
                    email: form.email,
                    namaPeternakan: form.namaPeternakan,
                    lokasiPeternakan: form.lokasiPeternakan
                }
                await adminService.updateUser(selectedUser.userId, updateData)
                toast.success('User berhasil diperbarui')
            }
            setShowModal(false)
            loadUsers()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal menyimpan data user')
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
                    <div className="admin-header-icon">👥</div>
                    <div>
                        <h1 id="admin-users-title">Panel User</h1>
                        <p className="admin-subtitle">Manajemen akun peternakan terdaftar</p>
                    </div>
                </div>
                <button className="admin-create-btn" onClick={handleCreate}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Tambah User
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
                        placeholder="Cari berdasarkan email, nama peternakan, atau lokasi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        id="admin-user-search"
                    />
                    {searchQuery && (
                        <button className="admin-search-clear" onClick={() => setSearchQuery('')}>
                            ✕
                        </button>
                    )}
                </div>
                <span className="admin-search-count">{users.length} user ditemukan</span>
            </div>

            {/* Users Table */}
            <div className="admin-table-card">
                {loading ? (
                    <div className="admin-loading">
                        <div className="admin-spinner" />
                        <p>Memuat data user...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="admin-empty">
                        <div className="admin-empty-icon">👥</div>
                        <h3>Belum ada user terdaftar</h3>
                        <p>Klik tombol "Tambah User" untuk mendaftarkan peternakan baru.</p>
                    </div>
                ) : (
                    <div className="admin-table-wrapper">
                        <table className="admin-table" id="admin-users-table">
                            <thead>
                                <tr>
                                    <th>Email</th>
                                    <th>Nama Peternakan</th>
                                    <th>Lokasi</th>
                                    <th>Kode Peternakan</th>
                                    <th>Terdaftar</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.userId}>
                                        <td>
                                            <span className="admin-email-cell">{user.email}</span>
                                        </td>
                                        <td>
                                            <strong>{user.namaPeternakan}</strong>
                                        </td>
                                        <td>{user.lokasiPeternakan}</td>
                                        <td>
                                            <span className="admin-code-badge">#{user.kodePeternakan}</span>
                                        </td>
                                        <td>{formatDate(user.createdAt)}</td>
                                        <td>
                                            <div className="admin-action-btns">
                                                <button
                                                    className="admin-edit-btn"
                                                    onClick={() => handleEdit(user)}
                                                    title="Edit user"
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                    </svg>
                                                    Edit
                                                </button>
                                                <button
                                                    className="admin-delete-btn"
                                                    onClick={() => handleDeleteClick(user)}
                                                    title="Hapus user"
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
                            <h2>{modalMode === 'create' ? 'Tambah User Baru' : 'Edit User'}</h2>
                            <button className="admin-modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="admin-modal-form">
                            <div className="admin-form-grid">
                                <label>
                                    <span>Email</span>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="email@peternakan.id"
                                        required
                                        disabled={saving}
                                    />
                                </label>
                                {modalMode === 'create' && (
                                    <label>
                                        <span>Password</span>
                                        <input
                                            type="password"
                                            value={form.password}
                                            onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                                            placeholder="Password akun"
                                            required
                                            disabled={saving}
                                        />
                                    </label>
                                )}
                                <label>
                                    <span>Nama Peternakan</span>
                                    <input
                                        type="text"
                                        value={form.namaPeternakan}
                                        onChange={(e) => setForm(prev => ({ ...prev, namaPeternakan: e.target.value }))}
                                        placeholder="Nama peternakan"
                                        required
                                        disabled={saving}
                                    />
                                </label>
                                <label>
                                    <span>Lokasi Peternakan</span>
                                    <input
                                        type="text"
                                        value={form.lokasiPeternakan}
                                        onChange={(e) => setForm(prev => ({ ...prev, lokasiPeternakan: e.target.value }))}
                                        placeholder="Kota / Kabupaten"
                                        required
                                        disabled={saving}
                                    />
                                </label>
                            </div>
                            <div className="admin-modal-actions">
                                <button type="button" className="ghost-button" onClick={() => setShowModal(false)} disabled={saving}>
                                    Batal
                                </button>
                                <button type="submit" className="admin-save-btn" disabled={saving}>
                                    {saving ? 'Menyimpan...' : modalMode === 'create' ? 'Buat User' : 'Simpan Perubahan'}
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
                        <h2>Hapus User</h2>
                        <p>Apakah Anda yakin ingin menghapus akun <strong>{deleteConfirm.email}</strong> ({deleteConfirm.namaPeternakan})?</p>
                        <p className="admin-delete-warning">Tindakan ini tidak dapat dibatalkan.</p>
                        <div className="admin-modal-actions">
                            <button className="ghost-button" onClick={() => setDeleteConfirm(null)}>Batal</button>
                            <button className="admin-confirm-delete-btn" onClick={handleDeleteConfirm}>Hapus User</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default AdminPanelUser
