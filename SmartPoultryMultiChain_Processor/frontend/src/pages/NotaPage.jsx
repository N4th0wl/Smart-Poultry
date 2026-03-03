import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

const defaultForm = {
    idPengiriman: '', tanggalNota: '', namaBarang: '', varian: '',
    jumlah: '', satuan: 'KG', hargaSatuan: '', catatan: '',
}

export default function NotaPage() {
    const [list, setList] = useState([])
    const [pengirimanList, setPengirimanList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [search, setSearch] = useState('')
    const { showToast } = useToast()

    const loadData = async () => {
        try {
            const [res, pRes] = await Promise.all([apiClient.get('/nota'), apiClient.get('/pengiriman')])
            setList(res.data.data)
            setPengirimanList(pRes.data.data)
        } catch { /* */ }
    }

    useEffect(() => { loadData() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return list
        const q = search.toLowerCase()
        return list.filter((n) => n.KodeNota?.toLowerCase().includes(q) || n.NamaBarang?.toLowerCase().includes(q))
    }, [list, search])

    const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await apiClient.post('/nota', form)
            showToast({ title: 'Berhasil', description: 'Nota dibuat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal.', status: 'error' })
        }
    }

    const formatRp = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)

    return (
        <div>
            <PageHeader title="Nota Pengiriman" subtitle="Buat dan kelola nota pengiriman"
                actions={<button className="sp-btn" onClick={() => setIsModalOpen(true)}>+ Buat Nota</button>} />

            <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Nota</span>
                    <input className="sp-searchInput" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                    <table className="sp-table">
                        <thead><tr><th>Kode</th><th>Pengiriman</th><th>Barang</th><th>Jumlah</th><th>Harga</th><th>Total</th><th>Status</th><th>Tanggal</th></tr></thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((n) => (
                                <tr key={n.IdNota}>
                                    <td><strong>{n.KodeNota}</strong></td>
                                    <td>{n.pengiriman?.KodePengiriman || '-'}</td>
                                    <td>{n.NamaBarang}</td>
                                    <td>{n.Jumlah} {n.Satuan}</td>
                                    <td>{formatRp(n.HargaSatuan)}</td>
                                    <td><strong>{formatRp(n.TotalHarga)}</strong></td>
                                    <td><span className={`sp-badge ${n.StatusNota === 'LUNAS' ? 'success' : n.StatusNota === 'BATAL' ? 'danger' : 'muted'}`}>{n.StatusNota}</span></td>
                                    <td>{n.TanggalNota}</td>
                                </tr>
                            )) : <tr><td colSpan={8} className="sp-empty">Belum ada nota.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Nota" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="nota-form">Simpan</button>
                </div>
            }>
                <form id="nota-form" className="sp-formGrid" onSubmit={handleSubmit}>
                    <label className="sp-field"><span className="sp-label">Pengiriman *</span>
                        <select className="sp-input" value={form.idPengiriman} onChange={handleChange('idPengiriman')} required>
                            <option value="">Pilih</option>
                            {pengirimanList.map((p) => (
                                <option key={p.IdPengiriman} value={p.IdPengiriman}>{p.KodePengiriman} - {p.TujuanPengiriman}</option>
                            ))}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Tanggal *</span><input className="sp-input" type="date" value={form.tanggalNota} onChange={handleChange('tanggalNota')} required /></label>
                    <label className="sp-field"><span className="sp-label">Nama Barang *</span><input className="sp-input" value={form.namaBarang} onChange={handleChange('namaBarang')} required /></label>
                    <label className="sp-field"><span className="sp-label">Varian</span><input className="sp-input" value={form.varian} onChange={handleChange('varian')} /></label>
                    <div className="sp-fieldGroup">
                        <label className="sp-field"><span className="sp-label">Jumlah *</span><input className="sp-input" type="number" min="1" value={form.jumlah} onChange={handleChange('jumlah')} required /></label>
                        <label className="sp-field"><span className="sp-label">Satuan</span>
                            <select className="sp-input" value={form.satuan} onChange={handleChange('satuan')}><option value="KG">Kg</option><option value="EKOR">Ekor</option><option value="PCS">Pcs</option></select>
                        </label>
                    </div>
                    <label className="sp-field"><span className="sp-label">Harga Satuan (Rp) *</span><input className="sp-input" type="number" min="0" value={form.hargaSatuan} onChange={handleChange('hargaSatuan')} required /></label>
                </form>
            </Modal>
        </div>
    )
}
