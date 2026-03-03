import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { LoadingState, EmptyState, Modal } from '../components'
import { adminService } from '../services'

function AdminPanelUser() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => { loadUsers() }, [])

    const loadUsers = async () => {
        try {
            const data = await adminService.getUsers()
            setUsers(data)
        } catch (error) {
            toast.error('Gagal memuat data users')
        } finally {
            setLoading(false)
        }
    }

    const handleRoleChange = async (userId, newRole) => {
        try {
            await adminService.updateRole(userId, newRole)
            toast.success('Role berhasil diperbarui')
            loadUsers()
        } catch (error) {
            toast.error('Gagal mengubah role')
        }
    }

    const handleDelete = async (userId) => {
        if (!confirm('Hapus user ini?')) return
        try {
            await adminService.deleteUser(userId)
            toast.success('User berhasil dihapus')
            loadUsers()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal menghapus user')
        }
    }

    if (loading) return <LoadingState />

    return (
        <div>
            <div className="page-header">
                <h2>User Management</h2>
            </div>

            {users.length === 0 ? (
                <EmptyState message="Belum ada user" icon="👤" />
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Email</th>
                                <th>Perusahaan</th>
                                <th>Role</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.UserID}>
                                    <td>{u.UserID}</td>
                                    <td>{u.Email}</td>
                                    <td>{u.PerusahaanKurir?.NamaPerusahaan || '—'}</td>
                                    <td>
                                        <select
                                            value={u.Role}
                                            onChange={(e) => handleRoleChange(u.UserID, e.target.value)}
                                            style={{
                                                background: 'rgba(15,25,45,0.6)',
                                                border: '1px solid rgba(59,130,246,0.15)',
                                                borderRadius: '8px',
                                                padding: '4px 8px',
                                                color: '#c8d7f0',
                                                fontFamily: 'inherit',
                                                fontSize: '.82rem'
                                            }}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td>
                                        <button className="ghost-button" style={{ color: '#f87171', fontSize: '.82rem' }} onClick={() => handleDelete(u.UserID)}>
                                            Hapus
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default AdminPanelUser
