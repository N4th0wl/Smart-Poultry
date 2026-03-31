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
    const [qrModal, setQrModal] = useState({ open: false, data: null })
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
            const res = await apiClient.post('/qc', { ...form, origin: window.location.origin })
            showToast({ title: 'Berhasil', description: res.data.message || 'Laporan QC dicatat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()

            // If QR code was generated (QC LULUS), show QR modal
            if (res.data.qrCode) {
                setQrModal({ open: true, data: res.data.qrCode })
            }
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal.', status: 'error' })
        }
    }

    const handleViewQr = async (qc) => {
        try {
            const prod = produksiList.find(p => p.IdProduksi === qc.IdProduksi)
            if (!prod) {
                showToast({ title: 'Info', description: 'Data produksi tidak ditemukan.', status: 'error' })
                return
            }
            // Try getting kodeOrder from the included association first
            let kodeOrder = prod.order?.KodeOrder
            if (!kodeOrder && prod.IdOrder) {
                try {
                    const orderRes = await apiClient.get(`/orders/${prod.IdOrder}`)
                    kodeOrder = orderRes.data?.data?.KodeOrder
                } catch { /* ignore */ }
            }
            if (!kodeOrder) {
                showToast({ title: 'Info', description: 'Order terkait tidak ditemukan. Data mungkin sudah dihapus.', status: 'error' })
                return
            }
            const qrRes = await apiClient.get(`/qr-trace/generate/${kodeOrder}?origin=${encodeURIComponent(window.location.origin)}`)
            setQrModal({ open: true, data: qrRes.data })
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Tidak dapat membuat QR Code.', status: 'error' })
        }
    }

    const handlePrintQr = () => {
        if (!qrModal.data?.qrCode) return
        const win = window.open('', '_blank')
        win.document.write(`
            <html><head><title>QR Code - ${qrModal.data.kodeOrder}</title>
            <style>body{font-family:system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb}
            .card{background:#fff;border-radius:16px;padding:32px;box-shadow:0 4px 24px rgba(0,0,0,.08);text-align:center;max-width:400px}
            img{width:280px;height:280px;margin:16px 0}h2{margin:0 0 4px;color:#1e293b}
            .meta{color:#64748b;font-size:14px;margin:4px 0}.url{font-size:12px;color:#8b5cf6;word-break:break-all;margin-top:12px;background:#f5f3ff;padding:8px 12px;border-radius:8px}
            .badge{display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:4px 14px;border-radius:999px;font-size:13px;font-weight:600;margin-top:8px}
            @media print{body{background:#fff}.card{box-shadow:none}}</style></head>
            <body><div class="card">
            <h2>\u{1F414} SmartPoultry</h2>
            <div class="meta">${qrModal.data.jenisAyam || 'Ayam'} \u2014 ${qrModal.data.namaPeternakan || 'Peternakan'}</div>
            <div class="badge">\u2713 QC Verified</div>
            <img src="${qrModal.data.qrCode}" alt="QR Code"/>
            <div style="font-weight:600;color:#1e293b">${qrModal.data.kodeOrder}</div>
            <div class="url">Scan untuk melihat jejak produk</div>
            </div></body></html>
        `)
        win.document.close()
        setTimeout(() => win.print(), 500)
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
                        <thead><tr><th>Kode</th><th>Produksi</th><th>Suhu</th><th>Bau</th><th>Tekstur</th><th>Hasil</th><th>Tanggal</th><th>Aksi</th></tr></thead>
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
                                    <td>
                                        {qc.HasilQC === 'LULUS' && (
                                            <button className="sp-btn" style={{ padding: '4px 12px', fontSize: '12px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
                                                onClick={() => handleViewQr(qc)}>{'\u{1F4F1}'} QR Code</button>
                                        )}
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={8} className="sp-empty">Belum ada laporan.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE QC MODAL */}
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

            {/* QR CODE MODAL */}
            <Modal open={qrModal.open} onClose={() => setQrModal({ open: false, data: null })} title={'\u{1F389} QR Code Traceability'} footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setQrModal({ open: false, data: null })}>Tutup</button>
                    <button className="sp-btn" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }} onClick={handlePrintQr}>{'\u{1F5A8}\uFE0F'} Cetak QR</button>
                </div>
            }>
                {qrModal.data && (
                    <div style={{ textAlign: 'center', padding: '8px 0' }}>
                        <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 20 }}>{'\u2705'}</span>
                            <span style={{ fontWeight: 600, color: '#166534' }}>Quality Control LULUS {'\u2014'} Produk Terverifikasi</span>
                        </div>

                        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'inline-block' }}>
                            <img src={qrModal.data.qrCode} alt="QR Code" style={{ width: 240, height: 240 }} />
                        </div>

                        <div style={{ marginTop: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 18, color: '#1e293b' }}>{qrModal.data.kodeOrder}</div>
                            <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                                {qrModal.data.jenisAyam} {'\u2014'} {qrModal.data.namaPeternakan}
                            </div>
                        </div>

                        <div style={{ marginTop: 16, background: '#f5f3ff', borderRadius: 10, padding: '10px 16px', fontSize: 13 }}>
                            <div style={{ color: '#7c3aed', fontWeight: 600, marginBottom: 4 }}>{'\u{1F4F1}'} Scan untuk melihat jejak produk</div>
                            <a href={qrModal.data.traceUrl} target="_blank" rel="noopener noreferrer"
                                style={{ color: '#8b5cf6', textDecoration: 'none', wordBreak: 'break-all', fontSize: 12 }}>
                                {qrModal.data.traceUrl}
                            </a>
                        </div>

                        <p style={{ marginTop: 12, color: '#94a3b8', fontSize: 12 }}>
                            QR Code ini mengarah ke halaman publik yang menampilkan seluruh jejak produk dari peternakan hingga ke tangan konsumen, termasuk data blockchain terverifikasi.
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    )
}
