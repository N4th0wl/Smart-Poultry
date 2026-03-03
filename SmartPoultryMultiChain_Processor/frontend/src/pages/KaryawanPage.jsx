import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

const defaultForm = { email: '', namaLengkap: '', jabatan: 'Staf Produksi', noTelp: '', password: '' }

export default function KaryawanPage() {
    const [list, setList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [search, setSearch] = useState('')
    const { showToast } = useToast()

    const loadData = async () => {
        try { const res = await apiClient.get('/karyawan'); setList(res.data.data) } catch { /* */ }
    }

    useEffect(() => { loadData() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return list
        const q = search.toLowerCase()
        return list.filter((k) => k.KodeKaryawan?.toLowerCase().includes(q) || k.NamaLengkap?.toLowerCase().includes(q))
    }, [list, search])

    const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await apiClient.post('/karyawan', form)
            showToast({ title: 'Berhasil', description: 'Karyawan ditambahkan.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal.', status: 'error' })
        }
    }

    const handleDeactivate = async (id) => {
        if (!confirm('Nonaktifkan karyawan ini?')) return
        try {
            await apiClient.delete(`/karyawan/${id}`)
            showToast({ title: 'Berhasil', description: 'Karyawan dinonaktifkan.', status: 'success' })
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal.', status: 'error' })
        }
    }

    return (
        <div>
            <PageHeader title="Manajemen Karyawan" subtitle="Tambah dan kelola karyawan processor"
                actions={<button className="sp-btn" onClick={() => setIsModalOpen(true)}>+ Tambah Karyawan</button>} />

            <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Karyawan</span>
                    <input className="sp-searchInput" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                    <table className="sp-table">
                        <thead><tr><th>Kode</th><th>Nama</th><th>Jabatan</th><th>No Telp</th><th>Email</th><th>Status</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((k) => (
                                <tr key={k.IdKaryawan}>
                                    <td><strong>{k.KodeKaryawan}</strong></td>
                                    <td>{k.NamaLengkap}</td>
                                    <td>{k.Jabatan}</td>
                                    <td>{k.NoTelp || '-'}</td>
                                    <td>{k.user?.Email || '-'}</td>
                                    <td><span className={`sp-badge ${k.StatusKaryawan === 'ACTIVE' ? 'success' : 'danger'}`}>{k.StatusKaryawan}</span></td>
                                    <td>
                                        {k.StatusKaryawan === 'ACTIVE' && (
                                            <button className="sp-btn danger" style={{ height: 28, fontSize: 11, padding: '0 8px' }} onClick={() => handleDeactivate(k.IdKaryawan)}>Nonaktifkan</button>
                                        )}
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={7} className="sp-empty">Belum ada karyawan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Karyawan" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="karyawan-form">Simpan</button>
                </div>
            }>
                <form id="karyawan-form" className="sp-formGrid" onSubmit={handleSubmit}>
                    <label className="sp-field"><span className="sp-label">Email *</span><input className="sp-input" type="email" value={form.email} onChange={handleChange('email')} required /></label>
                    <label className="sp-field"><span className="sp-label">Nama Lengkap *</span><input className="sp-input" value={form.namaLengkap} onChange={handleChange('namaLengkap')} required /></label>
                    <label className="sp-field"><span className="sp-label">Jabatan *</span><input className="sp-input" value={form.jabatan} onChange={handleChange('jabatan')} required /></label>
                    <label className="sp-field"><span className="sp-label">No Telp</span><input className="sp-input" value={form.noTelp} onChange={handleChange('noTelp')} /></label>
                    <label className="sp-field"><span className="sp-label">Password *</span><input className="sp-input" type="password" value={form.password} onChange={handleChange('password')} required /></label>
                </form>
            </Modal>
        </div>
    )
}
