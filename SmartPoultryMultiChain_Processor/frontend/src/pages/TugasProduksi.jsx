import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import useAuthStore from '../stores/authStore'
import apiClient from '../services/apiClient'

const defaultForm = { idOrder: '', idKaryawan: '', namaTugas: '', deskripsiTugas: '', jenisTugas: 'PEMOTONGAN', tanggalMulai: '' }

export default function TugasProduksi() {
    const { user } = useAuthStore()
    const isAdmin = user?.role === 'ADMIN'
    const [tugas, setTugas] = useState([])
    const [orders, setOrders] = useState([])
    const [karyawanList, setKaryawanList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [search, setSearch] = useState('')
    const { showToast } = useToast()

    const loadData = async () => {
        try {
            const [tugasRes] = await Promise.all([apiClient.get('/tugas')])
            setTugas(tugasRes.data.data)
            if (isAdmin) {
                const [ordersRes, karyRes] = await Promise.all([apiClient.get('/orders'), apiClient.get('/karyawan')])
                setOrders(ordersRes.data.data)
                setKaryawanList(karyRes.data.data)
            }
        } catch { /* ignore */ }
    }

    useEffect(() => { loadData() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return tugas
        const q = search.toLowerCase()
        return tugas.filter((t) => t.KodeTugas?.toLowerCase().includes(q) || t.NamaTugas?.toLowerCase().includes(q) || t.StatusTugas?.toLowerCase().includes(q))
    }, [tugas, search])

    const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await apiClient.post('/tugas', form)
            showToast({ title: 'Berhasil', description: 'Tugas berhasil dibuat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal membuat tugas.', status: 'error' })
        }
    }

    const updateStatus = async (id, statusTugas) => {
        try {
            await apiClient.put(`/tugas/${id}`, { statusTugas, tanggalSelesai: statusTugas === 'SELESAI' ? new Date().toISOString().split('T')[0] : null })
            showToast({ title: 'Berhasil', description: 'Status tugas diperbarui.', status: 'success' })
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal memperbarui.', status: 'error' })
        }
    }

    const statusColor = (s) => {
        if (s === 'SELESAI') return 'success'
        if (s === 'SEDANG_DIKERJAKAN') return 'info'
        if (s === 'DIBATALKAN') return 'danger'
        return 'muted'
    }

    return (
        <div>
            <PageHeader
                title="Tugas Produksi"
                subtitle={isAdmin ? 'Buat dan kelola tugas produksi untuk karyawan' : 'Daftar tugas yang ditugaskan kepada Anda'}
                actions={isAdmin && <button className="sp-btn" type="button" onClick={() => setIsModalOpen(true)}>+ Tambah Tugas</button>}
            />

            <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Tugas</span>
                    <input className="sp-searchInput" placeholder="Cari tugas..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th>Kode</th>
                                <th>Nama Tugas</th>
                                <th>Jenis</th>
                                <th>Order</th>
                                <th>Karyawan</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((t) => (
                                <tr key={t.IdTugas}>
                                    <td><strong>{t.KodeTugas}</strong></td>
                                    <td>{t.NamaTugas}</td>
                                    <td>{t.JenisTugas?.replace(/_/g, ' ')}</td>
                                    <td>{t.order?.KodeOrder || '-'}</td>
                                    <td>{t.karyawan?.NamaLengkap || <span className="sp-badge muted">Belum ditugaskan</span>}</td>
                                    <td><span className={`sp-badge ${statusColor(t.StatusTugas)}`}>{t.StatusTugas?.replace(/_/g, ' ')}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {t.StatusTugas === 'BELUM_DIKERJAKAN' && (
                                                <button className="sp-btn" style={{ height: 28, fontSize: 11, padding: '0 8px' }} onClick={() => updateStatus(t.IdTugas, 'SEDANG_DIKERJAKAN')}>Mulai</button>
                                            )}
                                            {t.StatusTugas === 'SEDANG_DIKERJAKAN' && (
                                                <button className="sp-btn" style={{ height: 28, fontSize: 11, padding: '0 8px', background: '#22c55e' }} onClick={() => updateStatus(t.IdTugas, 'SELESAI')}>Selesai</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="sp-empty">Belum ada tugas.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isAdmin && (
                <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Tugas Baru" footer={
                    <div className="sp-modalActions">
                        <button className="sp-btn secondary" type="button" onClick={() => setIsModalOpen(false)}>Batal</button>
                        <button className="sp-btn" type="submit" form="tugas-form">Simpan</button>
                    </div>
                }>
                    <form id="tugas-form" className="sp-formGrid" onSubmit={handleSubmit}>
                        <label className="sp-field"><span className="sp-label">Order *</span>
                            <select className="sp-input" value={form.idOrder} onChange={handleChange('idOrder')} required>
                                <option value="">Pilih Order</option>
                                {orders.filter((o) => o.StatusOrder === 'DITERIMA').map((o) => (
                                    <option key={o.IdOrder} value={o.IdOrder}>{o.KodeOrder} - {o.NamaPeternakan}</option>
                                ))}
                            </select>
                        </label>
                        <label className="sp-field"><span className="sp-label">Karyawan</span>
                            <select className="sp-input" value={form.idKaryawan} onChange={handleChange('idKaryawan')}>
                                <option value="">Pilih Karyawan</option>
                                {karyawanList.filter((k) => k.StatusKaryawan === 'ACTIVE').map((k) => (
                                    <option key={k.IdKaryawan} value={k.IdKaryawan}>{k.NamaLengkap} ({k.Jabatan})</option>
                                ))}
                            </select>
                        </label>
                        <label className="sp-field"><span className="sp-label">Nama Tugas *</span><input className="sp-input" value={form.namaTugas} onChange={handleChange('namaTugas')} required /></label>
                        <label className="sp-field"><span className="sp-label">Jenis Tugas *</span>
                            <select className="sp-input" value={form.jenisTugas} onChange={handleChange('jenisTugas')}>
                                <option value="PEMOTONGAN">Pemotongan</option>
                                <option value="PENCABUTAN_BULU">Pencabutan Bulu</option>
                                <option value="PEMBERSIHAN">Pembersihan</option>
                                <option value="PENGEMASAN">Pengemasan</option>
                                <option value="PENYIMPANAN">Penyimpanan</option>
                                <option value="LAINNYA">Lainnya</option>
                            </select>
                        </label>
                        <label className="sp-field"><span className="sp-label">Tanggal Mulai</span><input className="sp-input" type="date" value={form.tanggalMulai} onChange={handleChange('tanggalMulai')} /></label>
                        <label className="sp-field sp-fieldFull"><span className="sp-label">Deskripsi</span><textarea className="sp-textarea" rows={3} value={form.deskripsiTugas} onChange={handleChange('deskripsiTugas')} /></label>
                    </form>
                </Modal>
            )}
        </div>
    )
}
