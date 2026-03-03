import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

const defaultForm = {
    idOrder: '', idTugas: '', idKaryawan: '',
    tanggalProduksi: '', jenisAyam: '', jumlahInput: '', jumlahOutput: '',
    beratTotal: '', varian: '', sertifikatHalal: 'TIDAK_ADA', catatan: '',
}

export default function MonitoringProduksi() {
    const [produksiList, setProduksiList] = useState([])
    const [orders, setOrders] = useState([])
    const [tugasList, setTugasList] = useState([])
    const [karyawanList, setKaryawanList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [search, setSearch] = useState('')
    const { showToast } = useToast()

    const loadData = async () => {
        try {
            const [prodRes, ordRes, tugRes, karRes] = await Promise.all([
                apiClient.get('/produksi'), apiClient.get('/orders'), apiClient.get('/tugas'), apiClient.get('/karyawan'),
            ])
            setProduksiList(prodRes.data.data)
            setOrders(ordRes.data.data)
            setTugasList(tugRes.data.data)
            setKaryawanList(karRes.data.data)
        } catch { /* ignore */ }
    }

    useEffect(() => { loadData() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return produksiList
        const q = search.toLowerCase()
        return produksiList.filter((p) =>
            p.KodeProduksi?.toLowerCase().includes(q) ||
            p.JenisAyam?.toLowerCase().includes(q) ||
            p.StatusProduksi?.toLowerCase().includes(q)
        )
    }, [produksiList, search])

    const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await apiClient.post('/produksi', form)
            showToast({ title: 'Berhasil', description: 'Produksi berhasil dicatat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal mencatat.', status: 'error' })
        }
    }

    const statusColor = (s) => {
        if (s === 'SELESAI' || s === 'LULUS_QC') return 'success'
        if (s === 'PROSES' || s === 'QUALITY_CHECK') return 'info'
        if (s === 'GAGAL_QC') return 'danger'
        return 'muted'
    }

    return (
        <div>
            <PageHeader
                title="Monitoring Produksi"
                subtitle="Pantau dan catat aktivitas produksi"
                actions={<button className="sp-btn" type="button" onClick={() => setIsModalOpen(true)}>+ Catat Produksi</button>}
            />

            <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Produksi</span>
                    <input className="sp-searchInput" placeholder="Cari produksi..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th>Kode</th>
                                <th>Order</th>
                                <th>Jenis Ayam</th>
                                <th>Input</th>
                                <th>Output</th>
                                <th>Berat (kg)</th>
                                <th>Status</th>
                                <th>Tanggal</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((p) => (
                                <tr key={p.IdProduksi}>
                                    <td><strong>{p.KodeProduksi}</strong></td>
                                    <td>{p.order?.KodeOrder || '-'}</td>
                                    <td>{p.JenisAyam}</td>
                                    <td>{p.JumlahInput}</td>
                                    <td>{p.JumlahOutput}</td>
                                    <td>{p.BeratTotal}</td>
                                    <td><span className={`sp-badge ${statusColor(p.StatusProduksi)}`}>{p.StatusProduksi?.replace(/_/g, ' ')}</span></td>
                                    <td>{p.TanggalProduksi}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="sp-empty">Belum ada data produksi.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Catat Produksi Baru" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" type="button" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="produksi-form">Simpan</button>
                </div>
            }>
                <form id="produksi-form" className="sp-formGrid" onSubmit={handleSubmit}>
                    <label className="sp-field"><span className="sp-label">Order *</span>
                        <select className="sp-input" value={form.idOrder} onChange={handleChange('idOrder')} required>
                            <option value="">Pilih Order</option>
                            {orders.filter((o) => o.StatusOrder === 'DITERIMA').map((o) => (
                                <option key={o.IdOrder} value={o.IdOrder}>{o.KodeOrder} - {o.NamaPeternakan}</option>
                            ))}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Tugas (Opsional)</span>
                        <select className="sp-input" value={form.idTugas} onChange={handleChange('idTugas')}>
                            <option value="">Tanpa tugas</option>
                            {tugasList.map((t) => (
                                <option key={t.IdTugas} value={t.IdTugas}>{t.KodeTugas} - {t.NamaTugas}</option>
                            ))}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Karyawan</span>
                        <select className="sp-input" value={form.idKaryawan} onChange={handleChange('idKaryawan')}>
                            <option value="">Pilih Karyawan</option>
                            {karyawanList.filter((k) => k.StatusKaryawan === 'ACTIVE').map((k) => (
                                <option key={k.IdKaryawan} value={k.IdKaryawan}>{k.NamaLengkap}</option>
                            ))}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Tanggal Produksi *</span><input className="sp-input" type="date" value={form.tanggalProduksi} onChange={handleChange('tanggalProduksi')} required /></label>
                    <label className="sp-field"><span className="sp-label">Jenis Ayam *</span><input className="sp-input" value={form.jenisAyam} onChange={handleChange('jenisAyam')} required /></label>
                    <label className="sp-field"><span className="sp-label">Varian</span><input className="sp-input" value={form.varian} onChange={handleChange('varian')} placeholder="Whole, Fillet, dll" /></label>
                    <div className="sp-fieldGroup">
                        <label className="sp-field"><span className="sp-label">Jumlah Input *</span><input className="sp-input" type="number" min="1" value={form.jumlahInput} onChange={handleChange('jumlahInput')} required /></label>
                        <label className="sp-field"><span className="sp-label">Jumlah Output *</span><input className="sp-input" type="number" min="0" value={form.jumlahOutput} onChange={handleChange('jumlahOutput')} required /></label>
                    </div>
                    <label className="sp-field"><span className="sp-label">Berat Total (kg)</span><input className="sp-input" type="number" step="0.01" value={form.beratTotal} onChange={handleChange('beratTotal')} /></label>
                    <label className="sp-field"><span className="sp-label">Sertifikat Halal</span>
                        <select className="sp-input" value={form.sertifikatHalal} onChange={handleChange('sertifikatHalal')}>
                            <option value="TIDAK_ADA">Tidak Ada</option>
                            <option value="ADA">Ada</option>
                        </select>
                    </label>
                    <label className="sp-field sp-fieldFull"><span className="sp-label">Catatan</span><textarea className="sp-textarea" rows={3} value={form.catatan} onChange={handleChange('catatan')} /></label>
                </form>
            </Modal>
        </div>
    )
}
