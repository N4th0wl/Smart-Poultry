import { useEffect, useState, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

const defaultForm = {
    idProduksi: '', tujuanPengiriman: '', namaPenerima: '', kontakPenerima: '',
    tanggalKirim: '', jumlahKirim: '', beratKirim: '', metodePengiriman: 'DIANTAR', namaEkspedisi: '', catatan: '',
}

const CLIENT_ORIGIN = import.meta.env.VITE_CLIENT_ORIGIN || window.location.origin

export default function PengirimanPage() {
    const [list, setList] = useState([])
    const [produksiList, setProduksiList] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [search, setSearch] = useState('')
    const [qrModal, setQrModal] = useState(null) // { kodeOrder, kodePengiriman, jenisAyam }
    const { showToast } = useToast()

    const loadData = async () => {
        try {
            const [res, prodRes] = await Promise.all([apiClient.get('/pengiriman'), apiClient.get('/produksi')])
            setList(res.data.data)
            setProduksiList(prodRes.data.data)
        } catch { /* */ }
    }

    useEffect(() => { loadData() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return list
        const q = search.toLowerCase()
        return list.filter((p) => p.KodePengiriman?.toLowerCase().includes(q) || p.TujuanPengiriman?.toLowerCase().includes(q))
    }, [list, search])

    const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await apiClient.post('/pengiriman', form)
            showToast({ title: 'Berhasil', description: 'Pengiriman dicatat & blockchain block dibuat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()

            // Find the linked order to generate QR code
            const produksi = produksiList.find(p => String(p.IdProduksi) === String(form.idProduksi))
            if (produksi?.order?.KodeOrder || produksi?.IdOrder) {
                try {
                    // Find kodeOrder from the produksi's order
                    const kodeOrder = produksi.order?.KodeOrder
                    if (kodeOrder) {
                        setQrModal({
                            kodeOrder,
                            kodePengiriman: res.data?.data?.KodePengiriman || '',
                            jenisAyam: produksi.JenisAyam || produksi.order?.JenisAyam || '',
                        })
                    }
                } catch { /* QR generation is optional */ }
            }
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal.', status: 'error' })
        }
    }

    const handleShowQR = (pengiriman) => {
        // Find kodeOrder from the pengiriman's linked produksi
        const produksi = produksiList.find(p => String(p.IdProduksi) === String(pengiriman.IdProduksi))
        if (produksi?.order?.KodeOrder) {
            setQrModal({
                kodeOrder: produksi.order.KodeOrder,
                kodePengiriman: pengiriman.KodePengiriman,
                jenisAyam: pengiriman.produksi?.JenisAyam || produksi.JenisAyam || '',
            })
        } else {
            showToast({ title: 'Info', description: 'Kode order tidak ditemukan untuk pengiriman ini.', status: 'error' })
        }
    }

    const handlePrintQR = () => {
        if (!qrModal) return
        const printWindow = window.open('', '_blank', 'width=500,height=600')
        const traceUrl = `${CLIENT_ORIGIN}/trace/${qrModal.kodeOrder}`
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>QR Code - ${qrModal.kodeOrder}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Inter', sans-serif;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 100vh;
                        padding: 40px;
                        background: #fff;
                    }
                    .qr-print-card {
                        border: 2px solid #e5e7eb;
                        border-radius: 16px;
                        padding: 32px;
                        text-align: center;
                        max-width: 400px;
                        width: 100%;
                    }
                    .qr-print-logo {
                        font-size: 1.2rem;
                        font-weight: 700;
                        color: #8B1A1A;
                        margin-bottom: 4px;
                    }
                    .qr-print-subtitle {
                        font-size: 0.75rem;
                        color: #6b7280;
                        margin-bottom: 24px;
                    }
                    .qr-print-img {
                        width: 250px;
                        height: 250px;
                        margin: 0 auto 20px;
                    }
                    .qr-print-code {
                        font-size: 1.1rem;
                        font-weight: 700;
                        color: #1f2937;
                        margin-bottom: 4px;
                    }
                    .qr-print-product {
                        font-size: 0.85rem;
                        color: #6b7280;
                        margin-bottom: 16px;
                    }
                    .qr-print-hint {
                        font-size: 0.7rem;
                        color: #9ca3af;
                        border-top: 1px solid #e5e7eb;
                        padding-top: 12px;
                    }
                    @media print {
                        body { padding: 0; }
                        .qr-print-card { border: 1px solid #ccc; }
                    }
                </style>
            </head>
            <body>
                <div class="qr-print-card">
                    <div class="qr-print-logo">🐔 SmartPoultry</div>
                    <div class="qr-print-subtitle">Scan untuk Traceability Produk</div>
                    <div class="qr-print-img">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(traceUrl)}" 
                             alt="QR Code" width="250" height="250" />
                    </div>
                    <div class="qr-print-code">${qrModal.kodeOrder}</div>
                    <div class="qr-print-product">${qrModal.jenisAyam} — ${qrModal.kodePengiriman}</div>
                    <div class="qr-print-hint">
                        Scan QR code ini untuk melihat jejak produk<br/>dari peternakan hingga ke tangan Anda
                    </div>
                </div>
                <script>setTimeout(() => window.print(), 400);</script>
            </body>
            </html>
        `)
        printWindow.document.close()
    }

    return (
        <div>
            <PageHeader title="Pengiriman" subtitle="Kelola pengiriman produk"
                actions={<button className="sp-btn" onClick={() => setIsModalOpen(true)}>+ Tambah Pengiriman</button>} />

            <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Pengiriman</span>
                    <input className="sp-searchInput" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                    <table className="sp-table">
                        <thead><tr><th>Kode</th><th>Produksi</th><th>Tujuan</th><th>Penerima</th><th>Jumlah</th><th>Status</th><th>Tgl Kirim</th><th>QR</th></tr></thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((p) => (
                                <tr key={p.IdPengiriman}>
                                    <td><strong>{p.KodePengiriman}</strong></td>
                                    <td>{p.produksi?.KodeProduksi || '-'}</td>
                                    <td>{p.TujuanPengiriman}</td>
                                    <td>{p.NamaPenerima}</td>
                                    <td>{p.JumlahKirim}</td>
                                    <td><span className={`sp-badge ${p.StatusPengiriman === 'SAMPAI' ? 'success' : p.StatusPengiriman === 'DALAM_PERJALANAN' ? 'info' : 'muted'}`}>{p.StatusPengiriman?.replace(/_/g, ' ')}</span></td>
                                    <td>{p.TanggalKirim}</td>
                                    <td>
                                        <button
                                            className="sp-btn secondary"
                                            style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px' }}
                                            onClick={() => handleShowQR(p)}
                                            title="Lihat QR Traceability"
                                        >
                                            📱 QR
                                        </button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan={8} className="sp-empty">Belum ada pengiriman.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Pengiriman Modal */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Pengiriman" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="kirim-form">Simpan</button>
                </div>
            }>
                <form id="kirim-form" className="sp-formGrid" onSubmit={handleSubmit}>
                    <label className="sp-field"><span className="sp-label">Produksi *</span>
                        <select className="sp-input" value={form.idProduksi} onChange={handleChange('idProduksi')} required>
                            <option value="">Pilih</option>
                            {produksiList.filter((p) => p.StatusProduksi === 'LULUS_QC').map((p) => (
                                <option key={p.IdProduksi} value={p.IdProduksi}>{p.KodeProduksi} - {p.JenisAyam}</option>
                            ))}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Tujuan *</span><input className="sp-input" value={form.tujuanPengiriman} onChange={handleChange('tujuanPengiriman')} required /></label>
                    <label className="sp-field"><span className="sp-label">Nama Penerima *</span><input className="sp-input" value={form.namaPenerima} onChange={handleChange('namaPenerima')} required /></label>
                    <label className="sp-field"><span className="sp-label">Kontak</span><input className="sp-input" value={form.kontakPenerima} onChange={handleChange('kontakPenerima')} /></label>
                    <label className="sp-field"><span className="sp-label">Tanggal Kirim *</span><input className="sp-input" type="date" value={form.tanggalKirim} onChange={handleChange('tanggalKirim')} required /></label>
                    <label className="sp-field"><span className="sp-label">Jumlah *</span><input className="sp-input" type="number" min="1" value={form.jumlahKirim} onChange={handleChange('jumlahKirim')} required /></label>
                    <label className="sp-field"><span className="sp-label">Berat (kg)</span><input className="sp-input" type="number" step="0.01" value={form.beratKirim} onChange={handleChange('beratKirim')} /></label>
                    <label className="sp-field"><span className="sp-label">Metode</span>
                        <select className="sp-input" value={form.metodePengiriman} onChange={handleChange('metodePengiriman')}>
                            <option value="DIANTAR">Diantar</option><option value="DIAMBIL">Diambil</option><option value="EKSPEDISI">Ekspedisi</option>
                        </select>
                    </label>
                </form>
            </Modal>

            {/* QR Code Modal */}
            <Modal open={!!qrModal} onClose={() => setQrModal(null)} title="🔗 QR Code Traceability" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setQrModal(null)}>Tutup</button>
                    <button className="sp-btn" onClick={handlePrintQR}>🖨️ Cetak QR</button>
                </div>
            }>
                {qrModal && (
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                        {/* QR Code */}
                        <div style={{
                            display: 'inline-block',
                            padding: '20px',
                            background: '#ffffff',
                            borderRadius: '16px',
                            boxShadow: '0 4px 24px rgba(139, 26, 26, 0.08)',
                            marginBottom: '20px',
                        }}>
                            <QRCodeSVG
                                value={`${CLIENT_ORIGIN}/trace/${qrModal.kodeOrder}`}
                                size={220}
                                level="H"
                                fgColor="#2C1810"
                                bgColor="#FFFFFF"
                                includeMargin
                                imageSettings={{
                                    src: '',
                                    height: 0,
                                    width: 0,
                                }}
                            />
                        </div>

                        {/* Info */}
                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                                {qrModal.kodeOrder}
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
                                {qrModal.jenisAyam} — {qrModal.kodePengiriman}
                            </div>
                        </div>

                        {/* Link Preview */}
                        <div style={{
                            padding: '12px 16px',
                            background: 'var(--bg-soft)',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            color: 'var(--muted)',
                            wordBreak: 'break-all',
                            marginBottom: '12px',
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--ink-soft)' }}>URL Traceability:</div>
                            <a
                                href={`${CLIENT_ORIGIN}/trace/${qrModal.kodeOrder}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', textDecoration: 'underline' }}
                            >
                                {`${CLIENT_ORIGIN}/trace/${qrModal.kodeOrder}`}
                            </a>
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            justifyContent: 'center',
                            padding: '10px 16px',
                            background: 'rgba(16, 163, 74, 0.06)',
                            borderRadius: '10px',
                            fontSize: '0.78rem',
                            color: 'var(--success)',
                            fontWeight: 500,
                        }}>
                            ✅ QR code ini dapat langsung dicetak dan ditempel pada kemasan produk
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
