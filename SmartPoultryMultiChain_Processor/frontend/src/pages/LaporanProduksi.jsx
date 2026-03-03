import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

const defaultForm = {
    idProduksi: '', idKaryawan: '', tanggalQC: '',
    suhu: '', kelembaban: '', warnaAyam: '', bauAyam: 'NORMAL', teksturAyam: 'NORMAL',
    hasilQC: 'LULUS', catatan: '',
}

export default function LaporanProduksi() {
    const [qcList, setQcList] = useState([])
    const [produksiList, setProduksiList] = useState([])
    const [karyawanList, setKaryawanList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [search, setSearch] = useState('')
    const { showToast } = useToast()

    const loadData = async () => {
        try {
            const [qcRes, prodRes, karRes] = await Promise.all([
                apiClient.get('/qc'), apiClient.get('/produksi'), apiClient.get('/karyawan'),
            ])
            setQcList(qcRes.data.data)
            setProduksiList(prodRes.data.data)
            setKaryawanList(karRes.data.data)
        } catch { /* ignore */ }
    }

    useEffect(() => { loadData() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return qcList
        const q = search.toLowerCase()
        return qcList.filter((qc) => qc.KodeQC?.toLowerCase().includes(q) || qc.HasilQC?.toLowerCase().includes(q))
    }, [qcList, search])

    const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            await apiClient.post('/qc', form)
            showToast({ title: 'Berhasil', description: 'Laporan QC dicatat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal.', status: 'error' })
        }
    }

    const totalQC = qcList.length
    const lulusQC = qcList.filter((q) => q.HasilQC === 'LULUS').length
    const gagalQC = totalQC - lulusQC
    const lulusRate = totalQC > 0 ? ((lulusQC / totalQC) * 100).toFixed(1) : '0'

    return (
        <div>
            <PageHeader title="Laporan Hasil Produksi" subtitle="Quality Control & laporan produksi"
                actions={<button className="sp-btn" type="button" onClick={() => setIsModalOpen(true)}>+ Buat Laporan QC</button>} />

            <div className="sp-grid cols-4">
                <div className="sp-card"><div className="sp-cardHeader">Total QC</div><div className="sp-cardBody"><div className="sp-statValue">{totalQC}</div></div></div>
                <div className="sp-card"><div className="sp-cardHeader">Lulus QC</div><div className="sp-cardBody"><div className="sp-statValue" style={{ color: '#22c55e' }}>{lulusQC}</div></div></div>
                <div className="sp-card"><div className="sp-cardHeader">Gagal QC</div><div className="sp-cardBody"><div className="sp-statValue" style={{ color: '#ef4444' }}>{gagalQC}</div></div></div>
                <div className="sp-card"><div className="sp-cardHeader">Pass Rate</div><div className="sp-cardBody"><div className="sp-statValue">{lulusRate}%</div></div></div>
            </div>

            <div className="sp-card" style={{ marginTop: 16 }}>
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Riwayat QC</span>
                    <input className="sp-searchInput" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                    <table className="sp-table">
                        <thead><tr><th>Kode</th><th>Produksi</th><th>Suhu</th><th>Bau</th><th>Tekstur</th><th>Hasil</th><th>Tanggal</th></tr></thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((qc) => (
                                <tr key={qc.IdQC}>
                                    <td><strong>{qc.KodeQC}</strong></td>
                                    <td>{qc.produksi?.KodeProduksi || '-'}</td>
                                    <td>{qc.Suhu ? `${qc.Suhu}°C` : '-'}</td>
                                    <td>{qc.BauAyam}</td>
                                    <td>{qc.TeksturAyam}</td>
                                    <td><span className={`sp-badge ${qc.HasilQC === 'LULUS' ? 'success' : 'danger'}`}>{qc.HasilQC}</span></td>
                                    <td>{qc.TanggalQC}</td>
                                </tr>
                            )) : <tr><td colSpan={7} className="sp-empty">Belum ada laporan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Laporan QC" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="qc-form">Simpan</button>
                </div>
            }>
                <form id="qc-form" className="sp-formGrid" onSubmit={handleSubmit}>
                    <label className="sp-field"><span className="sp-label">Produksi *</span>
                        <select className="sp-input" value={form.idProduksi} onChange={handleChange('idProduksi')} required>
                            <option value="">Pilih</option>
                            {produksiList.filter((p) => p.StatusProduksi === 'PROSES').map((p) => (
                                <option key={p.IdProduksi} value={p.IdProduksi}>{p.KodeProduksi}</option>
                            ))}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Tanggal *</span><input className="sp-input" type="date" value={form.tanggalQC} onChange={handleChange('tanggalQC')} required /></label>
                    <label className="sp-field"><span className="sp-label">Suhu (°C)</span><input className="sp-input" type="number" step="0.1" value={form.suhu} onChange={handleChange('suhu')} /></label>
                    <label className="sp-field"><span className="sp-label">Kelembaban (%)</span><input className="sp-input" type="number" step="0.1" value={form.kelembaban} onChange={handleChange('kelembaban')} /></label>
                    <label className="sp-field"><span className="sp-label">Warna</span><input className="sp-input" value={form.warnaAyam} onChange={handleChange('warnaAyam')} /></label>
                    <label className="sp-field"><span className="sp-label">Bau</span>
                        <select className="sp-input" value={form.bauAyam} onChange={handleChange('bauAyam')}><option value="NORMAL">Normal</option><option value="TIDAK_NORMAL">Tidak Normal</option></select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Tekstur</span>
                        <select className="sp-input" value={form.teksturAyam} onChange={handleChange('teksturAyam')}><option value="NORMAL">Normal</option><option value="TIDAK_NORMAL">Tidak Normal</option></select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Hasil QC *</span>
                        <select className="sp-input" value={form.hasilQC} onChange={handleChange('hasilQC')}><option value="LULUS">LULUS</option><option value="GAGAL">GAGAL</option></select>
                    </label>
                    <label className="sp-field sp-fieldFull"><span className="sp-label">Catatan</span><textarea className="sp-textarea" rows={2} value={form.catatan} onChange={handleChange('catatan')} /></label>
                </form>
            </Modal>
        </div>
    )
}
