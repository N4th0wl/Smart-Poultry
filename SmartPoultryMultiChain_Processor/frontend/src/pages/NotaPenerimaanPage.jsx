import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

const defaultForm = {
    idOrder: '', kodeNotaPengirimanFarm: '', kodeCycleFarm: '',
    tanggalPenerimaan: new Date().toISOString().split('T')[0],
    namaPengirim: '', namaPenerima: '',
    jumlahDikirim: '', jumlahDiterima: '', jumlahRusak: '0',
    kondisiAyam: 'BAIK', suhuSaatTerima: '', catatanPenerimaan: '',
}

export default function NotaPenerimaanPage() {
    const [list, setList] = useState([])
    const [orders, setOrders] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [search, setSearch] = useState('')
    const { showToast } = useToast()

    const loadData = async () => {
        try {
            const [notaRes, ordersRes] = await Promise.all([
                apiClient.get('/nota-penerimaan'),
                apiClient.get('/orders'),
            ])
            setList(notaRes.data.data || [])
            const receivedOrders = (ordersRes.data.data || []).filter(o => o.StatusOrder === 'DITERIMA')
            setOrders(receivedOrders)
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memuat data.', status: 'error' })
        }
    }

    useEffect(() => { loadData() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return list
        const q = search.toLowerCase()
        return list.filter(n =>
            n.KodeNotaPenerimaan?.toLowerCase().includes(q) ||
            n.order?.KodeOrder?.toLowerCase().includes(q) ||
            n.order?.NamaPeternakan?.toLowerCase().includes(q) ||
            n.NamaPenerima?.toLowerCase().includes(q)
        )
    }, [list, search])

    const handleChange = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await apiClient.post('/nota-penerimaan', form)
            showToast({ title: 'Berhasil', description: 'Nota penerimaan dan block blockchain berhasil dibuat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal membuat nota.', status: 'error' })
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Hapus nota penerimaan ini?')) return
        try {
            await apiClient.delete(`/nota-penerimaan/${id}`)
            showToast({ title: 'Dihapus', description: 'Nota penerimaan dihapus.', status: 'success' })
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: 'Gagal menghapus.', status: 'error' })
        }
    }

    return (
        <div>
            <PageHeader
                title="Nota Penerimaan"
                subtitle="Catat penerimaan ayam dari peternakan — terhubung ke blockchain"
                actions={<button className="sp-btn" type="button" onClick={() => setIsModalOpen(true)}>+ Buat Nota Penerimaan</button>}
            />

            <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Nota Penerimaan</span>
                    <input className="sp-searchInput" placeholder="Cari nota..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto', padding: 0 }}>
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th>Kode Nota</th>
                                <th>Order</th>
                                <th>Peternakan</th>
                                <th>Tanggal</th>
                                <th>Jumlah</th>
                                <th>Rusak</th>
                                <th>Kondisi</th>
                                <th>Farm Link</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map(n => (
                                <tr key={n.IdNotaPenerimaan}>
                                    <td><strong style={{ fontFamily: 'monospace', fontSize: '0.82rem' }}>{n.KodeNotaPenerimaan}</strong></td>
                                    <td>{n.order?.KodeOrder || '-'}</td>
                                    <td>{n.order?.NamaPeternakan || '-'}</td>
                                    <td>{n.TanggalPenerimaan}</td>
                                    <td><strong>{n.JumlahDiterima}</strong></td>
                                    <td>{n.JumlahRusak || 0}</td>
                                    <td>
                                        <span className={`sp-badge ${n.KondisiAyam === 'BAIK' ? 'success' : n.KondisiAyam === 'CUKUP' ? 'warning' : 'danger'}`}>
                                            {n.KondisiAyam}
                                        </span>
                                    </td>
                                    <td>
                                        {n.KodeNotaPengirimanFarm
                                            ? <span className="sp-chip">{n.KodeNotaPengirimanFarm}</span>
                                            : <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>-</span>
                                        }
                                    </td>
                                    <td>
                                        <button className="sp-btn danger" style={{ height: 30, fontSize: 11, padding: '0 10px', borderRadius: 8 }}
                                            onClick={() => handleDelete(n.IdNotaPenerimaan)}>Hapus</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={9} className="sp-empty">Belum ada nota penerimaan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Nota Penerimaan" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" type="button" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="nota-penerimaan-form">Simpan & Catat Block</button>
                </div>
            }>
                <form id="nota-penerimaan-form" className="sp-formGrid" onSubmit={handleSubmit}>
                    <label className="sp-field sp-fieldFull">
                        <span className="sp-label">Order *</span>
                        <select className="sp-input" value={form.idOrder} onChange={handleChange('idOrder')} required>
                            <option value="">-- Pilih Order --</option>
                            {orders.map(o => <option key={o.IdOrder} value={o.IdOrder}>{o.KodeOrder} — {o.NamaPeternakan}</option>)}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Kode Nota Pengiriman Farm</span><input className="sp-input" value={form.kodeNotaPengirimanFarm} onChange={handleChange('kodeNotaPengirimanFarm')} placeholder="NTP-..." /></label>
                    <label className="sp-field"><span className="sp-label">Kode Cycle Farm</span><input className="sp-input" value={form.kodeCycleFarm} onChange={handleChange('kodeCycleFarm')} placeholder="CYC-..." /></label>
                    <label className="sp-field"><span className="sp-label">Tanggal Penerimaan *</span><input className="sp-input" type="date" value={form.tanggalPenerimaan} onChange={handleChange('tanggalPenerimaan')} required /></label>
                    <label className="sp-field"><span className="sp-label">Nama Pengirim</span><input className="sp-input" value={form.namaPengirim} onChange={handleChange('namaPengirim')} /></label>
                    <label className="sp-field"><span className="sp-label">Nama Penerima *</span><input className="sp-input" value={form.namaPenerima} onChange={handleChange('namaPenerima')} required /></label>
                    <label className="sp-field"><span className="sp-label">Jumlah Dikirim</span><input className="sp-input" type="number" min="0" value={form.jumlahDikirim} onChange={handleChange('jumlahDikirim')} /></label>
                    <label className="sp-field"><span className="sp-label">Jumlah Diterima *</span><input className="sp-input" type="number" min="0" value={form.jumlahDiterima} onChange={handleChange('jumlahDiterima')} required /></label>
                    <label className="sp-field"><span className="sp-label">Jumlah Rusak</span><input className="sp-input" type="number" min="0" value={form.jumlahRusak} onChange={handleChange('jumlahRusak')} /></label>
                    <label className="sp-field"><span className="sp-label">Kondisi Ayam</span>
                        <select className="sp-input" value={form.kondisiAyam} onChange={handleChange('kondisiAyam')}>
                            <option value="BAIK">Baik</option>
                            <option value="CUKUP">Cukup</option>
                            <option value="BURUK">Buruk</option>
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Suhu Saat Terima (°C)</span><input className="sp-input" type="number" step="0.1" value={form.suhuSaatTerima} onChange={handleChange('suhuSaatTerima')} /></label>
                    <label className="sp-field sp-fieldFull"><span className="sp-label">Catatan</span><textarea className="sp-textarea" rows={3} value={form.catatanPenerimaan} onChange={handleChange('catatanPenerimaan')} /></label>
                </form>
            </Modal>
        </div>
    )
}
