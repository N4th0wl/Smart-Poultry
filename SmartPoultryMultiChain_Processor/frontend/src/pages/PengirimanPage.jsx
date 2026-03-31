import { useEffect, useState, useMemo } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

const defaultForm = {
    idProduksi: '', tujuanPengiriman: '', namaPenerima: '', kontakPenerima: '',
    tanggalKirim: '', jumlahKirim: '', beratKirim: '', metodePengiriman: 'EKSPEDISI', namaEkspedisi: 'Kurir Sistem', catatan: '',
    kodeRetailer: '', namaRetailer: '', alamatRetailer: '',
}

const CLIENT_ORIGIN = import.meta.env.VITE_CLIENT_ORIGIN || window.location.origin

export default function PengirimanPage() {
    const [activeTab, setActiveTab] = useState('pengiriman')
    const [list, setList] = useState([])
    const [notaList, setNotaList] = useState([])
    const [produksiList, setProduksiList] = useState([])
    const [retailerList, setRetailerList] = useState([])
    const [kurirTracking, setKurirTracking] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isNotaModalOpen, setIsNotaModalOpen] = useState(false)
    const [trackingDetail, setTrackingDetail] = useState(null)
    const [form, setForm] = useState(defaultForm)
    const [notaForm, setNotaForm] = useState({ idPengiriman: '', tanggalNota: '', namaBarang: '', varian: '', jumlah: '', satuan: 'KG', hargaSatuan: '', catatan: '' })
    const [search, setSearch] = useState('')
    const [notaSearch, setNotaSearch] = useState('')
    const [trackingSearch, setTrackingSearch] = useState('')
    const [qrModal, setQrModal] = useState(null)
    const { showToast } = useToast()

    const loadData = async () => {
        try {
            const [res, prodRes, retRes, notaRes, trackRes] = await Promise.all([
                apiClient.get('/pengiriman'),
                apiClient.get('/produksi'),
                apiClient.get('/pengiriman/retailers'),
                apiClient.get('/nota'),
                apiClient.get('/pengiriman/kurir-tracking'),
            ])
            setList(res.data.data)
            setProduksiList(prodRes.data.data)
            setRetailerList(retRes.data.data || [])
            setNotaList(notaRes.data.data || [])
            setKurirTracking(trackRes.data.data || [])
        } catch { /* */ }
    }

    useEffect(() => { loadData() }, [])

    // Build a map of KodePengiriman -> kurir tracking info
    const kurirTrackingMap = useMemo(() => {
        const map = {}
        kurirTracking.forEach(t => {
            if (t.KodePengirimanProcessor) {
                map[t.KodePengirimanProcessor] = t
            }
        })
        return map
    }, [kurirTracking])

    const filtered = useMemo(() => {
        if (!search.trim()) return list
        const q = search.toLowerCase()
        return list.filter((p) => p.KodePengiriman?.toLowerCase().includes(q) || p.TujuanPengiriman?.toLowerCase().includes(q))
    }, [list, search])

    const notaFiltered = useMemo(() => {
        if (!notaSearch.trim()) return notaList
        const q = notaSearch.toLowerCase()
        return notaList.filter((n) => n.KodeNota?.toLowerCase().includes(q) || n.NamaBarang?.toLowerCase().includes(q))
    }, [notaList, notaSearch])

    const trackingFiltered = useMemo(() => {
        if (!trackingSearch.trim()) return kurirTracking
        const q = trackingSearch.toLowerCase()
        return kurirTracking.filter((t) =>
            t.KodePengirimanKurir?.toLowerCase().includes(q) ||
            t.KodePengirimanProcessor?.toLowerCase().includes(q) ||
            t.NamaKurir?.toLowerCase().includes(q) ||
            t.TujuanKurir?.toLowerCase().includes(q)
        )
    }, [kurirTracking, trackingSearch])

    const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
    const handleNotaChange = (f) => (e) => setNotaForm((p) => ({ ...p, [f]: e.target.value }))

    const handleRetailerSelect = (e) => {
        const kode = e.target.value
        if (!kode) {
            setForm(p => ({ ...p, kodeRetailer: '', namaRetailer: '', alamatRetailer: '', tujuanPengiriman: '', namaPenerima: '', kontakPenerima: '' }))
            return
        }
        const ret = retailerList.find(r => r.KodeRetailer === kode)
        if (ret) {
            setForm(p => ({
                ...p,
                kodeRetailer: ret.KodeRetailer,
                namaRetailer: ret.NamaRetailer,
                alamatRetailer: ret.AlamatRetailer || '',
                tujuanPengiriman: ret.AlamatRetailer || '',
                namaPenerima: ret.NamaRetailer,
                kontakPenerima: ret.KontakRetailer || '',
            }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            const res = await apiClient.post('/pengiriman', form)
            showToast({ title: 'Berhasil', description: res.data.message || 'Pengiriman dicatat & blockchain block dibuat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            loadData()

            // Find the linked order to generate QR code
            const produksi = produksiList.find(p => String(p.IdProduksi) === String(form.idProduksi))
            if (produksi?.order?.KodeOrder || produksi?.IdOrder) {
                try {
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
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        min-height: 100vh; padding: 40px; background: #fff;
                    }
                    .qr-print-card { border: 2px solid #e5e7eb; border-radius: 16px; padding: 32px; text-align: center; max-width: 400px; width: 100%; }
                    .qr-print-logo { font-size: 1.2rem; font-weight: 700; color: #8B1A1A; margin-bottom: 4px; }
                    .qr-print-subtitle { font-size: 0.75rem; color: #6b7280; margin-bottom: 24px; }
                    .qr-print-img { width: 250px; height: 250px; margin: 0 auto 20px; }
                    .qr-print-code { font-size: 1.1rem; font-weight: 700; color: #1f2937; margin-bottom: 4px; }
                    .qr-print-product { font-size: 0.85rem; color: #6b7280; margin-bottom: 16px; }
                    .qr-print-hint { font-size: 0.7rem; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 12px; }
                    @media print { body { padding: 0; } .qr-print-card { border: 1px solid #ccc; } }
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

    const handleNotaSubmit = async (e) => {
        e.preventDefault()
        try {
            await apiClient.post('/nota', notaForm)
            showToast({ title: 'Berhasil', description: 'Nota dibuat.', status: 'success' })
            setNotaForm({ idPengiriman: '', tanggalNota: '', namaBarang: '', varian: '', jumlah: '', satuan: 'KG', hargaSatuan: '', catatan: '' })
            setIsNotaModalOpen(false)
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal.', status: 'error' })
        }
    }

    const formatRp = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0)

    const handleOpenBuatNota = (idPengiriman) => {
        setNotaForm(p => ({ ...p, idPengiriman }))
        setActiveTab('nota')
        setIsNotaModalOpen(true)
    }

    const getKurirStatusBadge = (status) => {
        const map = {
            'PICKUP': { cls: 'info', icon: '📋', label: 'Pickup Kurir' },
            'DALAM_PERJALANAN': { cls: 'success', icon: '🚀', label: 'Dalam Perjalanan' },
            'TERKIRIM': { cls: 'success', icon: '✅', label: 'Terkirim' },
            'GAGAL': { cls: 'error', icon: '❌', label: 'Gagal' },
        }
        const s = map[status] || { cls: 'muted', label: status || '-' }
        return <span className={`sp-badge ${s.cls}`}>{s.icon || ''} {s.label}</span>
    }

    return (
        <div>
            <PageHeader 
                title={activeTab === 'pengiriman' ? "Pengiriman" : activeTab === 'tracking' ? "Tracking Kurir" : "Nota Pengiriman"} 
                subtitle={activeTab === 'pengiriman' ? "Kelola pengiriman produk ke retailer" : activeTab === 'tracking' ? "Lacak status pengiriman via Kurir Leg 2" : "Buat dan kelola nota pengiriman"}
                actions={
                    activeTab === 'pengiriman' 
                        ? <button className="sp-btn" onClick={() => setIsModalOpen(true)}>+ Tambah Pengiriman</button>
                        : activeTab === 'nota'
                        ? <button className="sp-btn" onClick={() => setIsNotaModalOpen(true)}>+ Buat Nota</button>
                        : <button className="sp-btn secondary" onClick={loadData}>🔄 Refresh</button>
                } 
            />

            <div className="sp-tabs" style={{ marginBottom: 16 }}>
                <button className={`sp-tab ${activeTab === 'pengiriman' ? 'active' : ''}`} onClick={() => setActiveTab('pengiriman')}>📋 Pengiriman</button>
                <button className={`sp-tab ${activeTab === 'tracking' ? 'active' : ''}`} onClick={() => setActiveTab('tracking')} style={{ position: 'relative' }}>
                    🚛 Tracking Kurir
                    {kurirTracking.length > 0 && (
                        <span style={{
                            position: 'absolute', top: 2, right: -2,
                            background: 'linear-gradient(135deg, #8B1A1A, #C0392B)', color: '#fff',
                            borderRadius: '50%', fontSize: '0.65rem', fontWeight: 700,
                            width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{kurirTracking.length}</span>
                    )}
                </button>
                <button className={`sp-tab ${activeTab === 'nota' ? 'active' : ''}`} onClick={() => setActiveTab('nota')}>📝 Nota Pengiriman</button>
            </div>

            {/* ==================== PENGIRIMAN TAB ==================== */}
            {activeTab === 'pengiriman' && (
                <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Pengiriman</span>
                    <input className="sp-searchInput" placeholder="Cari..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                    <table className="sp-table">
                        <thead><tr><th>Kode</th><th>Produksi</th><th>Tujuan</th><th>Penerima</th><th>Jumlah</th><th>Status</th><th>Kurir</th><th>Tgl Kirim</th><th>Aksi</th></tr></thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((p) => {
                                const kt = kurirTrackingMap[p.KodePengiriman]
                                return (
                                <tr key={p.IdPengiriman}>
                                    <td><strong>{p.KodePengiriman}</strong></td>
                                    <td>{p.produksi?.KodeProduksi || '-'}</td>
                                    <td>{p.TujuanPengiriman}</td>
                                    <td>{p.NamaPenerima}</td>
                                    <td>{p.JumlahKirim}</td>
                                    <td><span className={`sp-badge ${p.StatusPengiriman === 'TERKIRIM' ? 'success' : p.StatusPengiriman === 'DALAM_PERJALANAN' ? 'success' : p.StatusPengiriman === 'DIKIRIM_KURIR' ? 'info' : p.StatusPengiriman === 'GAGAL' ? 'error' : 'muted'}`}>{
                                        p.StatusPengiriman === 'DISIAPKAN' ? '📦 Disiapkan' :
                                        p.StatusPengiriman === 'DIKIRIM' ? '🚚 Dikirim' :
                                        p.StatusPengiriman === 'DIKIRIM_KURIR' ? '🚛 Dikirim via Kurir' :
                                        p.StatusPengiriman === 'DALAM_PERJALANAN' ? '🚀 Dalam Perjalanan' :
                                        p.StatusPengiriman === 'TERKIRIM' ? '✅ Terkirim' :
                                        p.StatusPengiriman === 'GAGAL' ? '❌ Gagal' :
                                        p.StatusPengiriman?.replace(/_/g, ' ')
                                    }</span></td>
                                    <td>
                                        {kt ? (
                                            <button 
                                                className="sp-btn secondary" 
                                                style={{ padding: '4px 10px', fontSize: '0.72rem', borderRadius: '8px', gap: 4 }}
                                                onClick={() => setTrackingDetail(kt)}
                                                title="Lihat detail tracking kurir"
                                            >
                                                🚛 {kt.NamaKurir || 'Kurir'}
                                            </button>
                                        ) : (
                                            <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                                                {p.StatusPengiriman === 'DIKIRIM' ? '⏳ Menunggu kurir' : '-'}
                                            </span>
                                        )}
                                    </td>
                                    <td>{p.TanggalKirim}</td>
                                    <td style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                                        <button
                                            className="sp-btn secondary"
                                            style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px' }}
                                            onClick={() => handleShowQR(p)}
                                            title="Lihat QR Traceability"
                                        >
                                            📱 QR
                                        </button>
                                        <button
                                            className="sp-btn outline"
                                            style={{ padding: '6px 10px', fontSize: '0.75rem', borderRadius: '8px' }}
                                            onClick={() => handleOpenBuatNota(p.IdPengiriman)}
                                            title="Buat Nota Pengiriman"
                                        >
                                            Nota
                                        </button>
                                    </td>
                                </tr>
                            )}) : <tr><td colSpan={9} className="sp-empty">Belum ada pengiriman.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
            )}

            {/* ==================== TRACKING KURIR TAB ==================== */}
            {activeTab === 'tracking' && (
                <div className="sp-card">
                    <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                        <span>🚛 Tracking Kurir Leg 2 — Processor → Retailer</span>
                        <input className="sp-searchInput" placeholder="Cari kurir, kode..." value={trackingSearch} onChange={(e) => setTrackingSearch(e.target.value)} style={{ maxWidth: 240 }} />
                    </div>
                    <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                        {trackingFiltered.length > 0 ? (
                            <table className="sp-table">
                                <thead>
                                    <tr>
                                        <th>Kode Processor</th>
                                        <th>Kode Kurir</th>
                                        <th>Nama Kurir</th>
                                        <th>Tujuan</th>
                                        <th>Status Kurir</th>
                                        <th>Bukti Terima</th>
                                        <th>Nota Kurir</th>
                                        <th>Detail</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {trackingFiltered.map((t, idx) => (
                                        <tr key={idx}>
                                            <td><strong>{t.KodePengirimanProcessor}</strong></td>
                                            <td style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{t.KodePengirimanKurir}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <span style={{
                                                        width: 28, height: 28, borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #8B1A1A, #C0392B)',
                                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                                                    }}>{(t.NamaKurir || '?')[0]}</span>
                                                    <div>
                                                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{t.NamaKurir || '-'}</div>
                                                        {t.KontakKurir && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{t.KontakKurir}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td>{t.TujuanKurir || '-'}</td>
                                            <td>{getKurirStatusBadge(t.StatusKurir)}</td>
                                            <td>
                                                {t.KodeBukti ? (
                                                    <span className="sp-badge success" style={{ fontSize: '0.72rem' }}>✅ {t.KodeBukti}</span>
                                                ) : (
                                                    <span className="sp-badge muted" style={{ fontSize: '0.72rem' }}>⏳ Belum</span>
                                                )}
                                            </td>
                                            <td>
                                                {t.KodeNotaKurir ? (
                                                    <div>
                                                        <span className="sp-badge success" style={{ fontSize: '0.72rem' }}>✅ {t.KodeNotaKurir}</span>
                                                        {t.KondisiBarang && t.KondisiBarang !== 'BAIK' && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--danger)', marginTop: 2 }}>⚠️ {t.KondisiBarang}</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="sp-badge muted" style={{ fontSize: '0.72rem' }}>⏳ Belum</span>
                                                )}
                                            </td>
                                            <td>
                                                <button
                                                    className="sp-btn secondary"
                                                    style={{ padding: '5px 10px', fontSize: '0.72rem', borderRadius: '8px' }}
                                                    onClick={() => setTrackingDetail(t)}
                                                >
                                                    🔍 Detail
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="sp-empty" style={{ padding: '48px 20px' }}>
                                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🚛</div>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>Belum ada tracking kurir</div>
                                <div style={{ fontSize: '0.85rem' }}>Pengiriman yang sudah diterima oleh kurir akan tampil di sini</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ==================== NOTA TAB ==================== */}
            {activeTab === 'nota' && (
                <div className="sp-card">
                    <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                        <span>Daftar Nota</span>
                        <input className="sp-searchInput" placeholder="Cari..." value={notaSearch} onChange={(e) => setNotaSearch(e.target.value)} style={{ maxWidth: 240 }} />
                    </div>
                    <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                        <table className="sp-table">
                            <thead><tr><th>Kode</th><th>Pengiriman</th><th>Barang</th><th>Jumlah</th><th>Harga</th><th>Total</th><th>Status</th><th>Tanggal</th></tr></thead>
                            <tbody>
                                {notaFiltered.length > 0 ? notaFiltered.map((n) => (
                                    <tr key={n.IdNota}>
                                        <td><strong>{n.KodeNota}</strong></td>
                                        <td>{n.pengiriman?.KodePengiriman || '-'}</td>
                                        <td>{n.NamaBarang}</td>
                                        <td>{n.Jumlah} {n.Satuan}</td>
                                        <td>{formatRp(n.HargaSatuan)}</td>
                                        <td><strong>{formatRp(n.TotalHarga)}</strong></td>
                                        <td><span className={`sp-badge ${n.StatusNota === 'LUNAS' ? 'success' : n.StatusNota === 'BATAL' ? 'error' : 'muted'}`}>{n.StatusNota}</span></td>
                                        <td>{n.TanggalNota}</td>
                                    </tr>
                                )) : <tr><td colSpan={8} className="sp-empty">Belum ada nota.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ==================== CREATE PENGIRIMAN MODAL ==================== */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Tambah Pengiriman" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="kirim-form">Simpan & Kirim ke Kurir</button>
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

                    {/* Retailer selection from retailer database */}
                    <label className="sp-field sp-fieldFull">
                        <span className="sp-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {'\u{1F3EA}'} Pilih Retailer Tujuan *
                            <span style={{ fontSize: 11, color: '#8b5cf6', fontWeight: 400 }}>(dari database retailer)</span>
                        </span>
                        <select className="sp-input" value={form.kodeRetailer} onChange={handleRetailerSelect} required
                            style={{ borderColor: form.kodeRetailer ? '#10b981' : undefined }}>
                            <option value="">-- Pilih Retailer --</option>
                            {retailerList.map((r) => (
                                <option key={r.KodeRetailer} value={r.KodeRetailer}>
                                    {r.NamaRetailer} {r.AlamatRetailer ? `(${r.AlamatRetailer})` : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    {form.kodeRetailer && (
                        <div className="sp-field sp-fieldFull" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                            <div style={{ fontWeight: 600, color: '#166534', marginBottom: 4 }}>{'\u2705'} Retailer Dipilih</div>
                            <div style={{ color: '#15803d' }}>{form.namaRetailer} — {form.alamatRetailer}</div>
                            <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>
                                {'\u{1F69A}'} Pengiriman akan otomatis masuk ke antrian Kurir Leg 2
                            </div>
                        </div>
                    )}

                    <label className="sp-field"><span className="sp-label">Tujuan *</span><input className="sp-input" value={form.tujuanPengiriman} onChange={handleChange('tujuanPengiriman')} required /></label>
                    <label className="sp-field"><span className="sp-label">Nama Penerima *</span><input className="sp-input" value={form.namaPenerima} onChange={handleChange('namaPenerima')} required /></label>
                    <label className="sp-field"><span className="sp-label">Kontak</span><input className="sp-input" value={form.kontakPenerima} onChange={handleChange('kontakPenerima')} /></label>
                    <label className="sp-field"><span className="sp-label">Tanggal Kirim *</span><input className="sp-input" type="date" value={form.tanggalKirim} onChange={handleChange('tanggalKirim')} required /></label>
                    <label className="sp-field"><span className="sp-label">Jumlah *</span><input className="sp-input" type="number" min="1" value={form.jumlahKirim} onChange={handleChange('jumlahKirim')} required /></label>
                    <label className="sp-field"><span className="sp-label">Berat (kg)</span><input className="sp-input" type="number" step="0.01" value={form.beratKirim} onChange={handleChange('beratKirim')} /></label>

                </form>
            </Modal>

            {/* ==================== QR CODE MODAL ==================== */}
            <Modal open={!!qrModal} onClose={() => setQrModal(null)} title={'\u{1F517} QR Code Traceability'} footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setQrModal(null)}>Tutup</button>
                    <button className="sp-btn" onClick={handlePrintQR}>{'\u{1F5A8}\uFE0F'} Cetak QR</button>
                </div>
            }>
                {qrModal && (
                    <div style={{ textAlign: 'center', padding: '12px 0' }}>
                        <div style={{
                            display: 'inline-block', padding: '20px', background: '#ffffff',
                            borderRadius: '16px', boxShadow: '0 4px 24px rgba(139, 26, 26, 0.08)', marginBottom: '20px',
                        }}>
                            <QRCodeSVG
                                value={`${CLIENT_ORIGIN}/trace/${qrModal.kodeOrder}`}
                                size={220} level="H" fgColor="#2C1810" bgColor="#FFFFFF" includeMargin
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '4px' }}>
                                {qrModal.kodeOrder}
                            </div>
                            <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
                                {qrModal.jenisAyam} {'\u2014'} {qrModal.kodePengiriman}
                            </div>
                        </div>

                        <div style={{
                            padding: '12px 16px', background: 'var(--bg-soft)', borderRadius: '10px',
                            fontSize: '0.78rem', color: 'var(--muted)', wordBreak: 'break-all', marginBottom: '12px',
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--ink-soft)' }}>URL Traceability:</div>
                            <a href={`${CLIENT_ORIGIN}/trace/${qrModal.kodeOrder}`} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                                {`${CLIENT_ORIGIN}/trace/${qrModal.kodeOrder}`}
                            </a>
                        </div>

                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                            padding: '10px 16px', background: 'rgba(16, 163, 74, 0.06)', borderRadius: '10px',
                            fontSize: '0.78rem', color: 'var(--success)', fontWeight: 500,
                        }}>
                            ✅ QR code ini dapat langsung dicetak dan ditempel pada kemasan produk
                        </div>
                    </div>
                )}
            </Modal>

            {/* ==================== TRACKING DETAIL MODAL ==================== */}
            <Modal open={!!trackingDetail} onClose={() => setTrackingDetail(null)} title="🚛 Detail Tracking Kurir" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setTrackingDetail(null)}>Tutup</button>
                </div>
            }>
                {trackingDetail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Progress Steps */}
                        <div style={{ 
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'var(--bg-soft)', borderRadius: 12, padding: '16px 20px', gap: 8,
                        }}>
                            {['PICKUP', 'DALAM_PERJALANAN', 'TERKIRIM'].map((step, i) => {
                                const isActive = step === trackingDetail.StatusKurir
                                const isDone = (['PICKUP', 'DALAM_PERJALANAN', 'TERKIRIM'].indexOf(trackingDetail.StatusKurir) >= i)
                                return (
                                    <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                            background: isDone ? 'linear-gradient(135deg, #8B1A1A, #C0392B)' : 'var(--border)',
                                            color: isDone ? '#fff' : 'var(--muted)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '0.7rem', fontWeight: 700,
                                            boxShadow: isActive ? '0 0 0 3px rgba(139,26,26,0.15)' : 'none',
                                        }}>{isDone ? '✓' : i + 1}</div>
                                        <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 700 : 500, color: isDone ? 'var(--primary)' : 'var(--muted)' }}>
                                            {step === 'PICKUP' ? 'Pickup' : step === 'DALAM_PERJALANAN' ? 'Perjalanan' : 'Terkirim'}
                                        </span>
                                        {i < 2 && <div style={{ flex: 1, height: 2, background: isDone ? 'var(--primary)' : 'var(--border)', borderRadius: 2, minWidth: 20 }} />}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Info Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Kurir</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{trackingDetail.NamaKurir || '-'}</div>
                                {trackingDetail.KontakKurir && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>📞 {trackingDetail.KontakKurir}</div>}
                            </div>
                            <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Tujuan</div>
                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{trackingDetail.TujuanKurir || '-'}</div>
                                {trackingDetail.AlamatTujuan && <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>📍 {trackingDetail.AlamatTujuan}</div>}
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Kode Pengiriman Processor</div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'monospace' }}>{trackingDetail.KodePengirimanProcessor}</div>
                            </div>
                            <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '12px 14px' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Kode Pengiriman Kurir</div>
                                <div style={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'monospace' }}>{trackingDetail.KodePengirimanKurir}</div>
                            </div>
                        </div>

                        {/* Bukti Tanda Terima */}
                        <div style={{
                            borderRadius: 10, padding: '14px 16px',
                            background: trackingDetail.KodeBukti ? 'linear-gradient(135deg, #f0fdf4, #dcfce7)' : 'var(--bg-soft)',
                            border: trackingDetail.KodeBukti ? '1px solid rgba(22,163,74,0.15)' : '1px solid var(--border-light)',
                        }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: trackingDetail.KodeBukti ? '#166534' : 'var(--muted)', marginBottom: 8 }}>
                                {trackingDetail.KodeBukti ? '✅ Bukti Tanda Terima' : '⏳ Bukti Tanda Terima — Belum dibuat'}
                            </div>
                            {trackingDetail.KodeBukti && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.82rem' }}>
                                    <div><span style={{ color: 'var(--muted)' }}>Kode:</span> <strong>{trackingDetail.KodeBukti}</strong></div>
                                    <div><span style={{ color: 'var(--muted)' }}>Tanggal:</span> {trackingDetail.TanggalPickupBukti || '-'}</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Pengirim:</span> {trackingDetail.NamaPengirimBukti || '-'}</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Penerima:</span> {trackingDetail.NamaPenerimaBukti || '-'}</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Jumlah:</span> {trackingDetail.JumlahBarang || '-'}</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Berat:</span> {trackingDetail.BeratTotal ? `${trackingDetail.BeratTotal} kg` : '-'}</div>
                                </div>
                            )}
                        </div>

                        {/* Nota Pengiriman Kurir */}
                        <div style={{
                            borderRadius: 10, padding: '14px 16px',
                            background: trackingDetail.KodeNotaKurir ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : 'var(--bg-soft)',
                            border: trackingDetail.KodeNotaKurir ? '1px solid rgba(37,99,235,0.15)' : '1px solid var(--border-light)',
                        }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: trackingDetail.KodeNotaKurir ? '#1e40af' : 'var(--muted)', marginBottom: 8 }}>
                                {trackingDetail.KodeNotaKurir ? '✅ Nota Pengiriman Kurir' : '⏳ Nota Pengiriman Kurir — Belum dibuat'}
                            </div>
                            {trackingDetail.KodeNotaKurir && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: '0.82rem' }}>
                                    <div><span style={{ color: 'var(--muted)' }}>Kode:</span> <strong>{trackingDetail.KodeNotaKurir}</strong></div>
                                    <div><span style={{ color: 'var(--muted)' }}>Tgl Sampai:</span> {trackingDetail.TanggalSampai || '-'}</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Penerima:</span> {trackingDetail.PenerimaAkhir || '-'}</div>
                                    <div><span style={{ color: 'var(--muted)' }}>Kondisi:</span> <span style={{
                                        color: trackingDetail.KondisiBarang === 'BAIK' ? '#16a34a' : trackingDetail.KondisiBarang === 'RUSAK_TOTAL' ? '#dc2626' : '#d97706',
                                        fontWeight: 600,
                                    }}>{trackingDetail.KondisiBarang || '-'}</span></div>
                                    {trackingDetail.KeteranganNota && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--muted)' }}>Keterangan:</span> {trackingDetail.KeteranganNota}</div>}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ==================== NOTA MODAL ==================== */}
            <Modal open={isNotaModalOpen} onClose={() => setIsNotaModalOpen(false)} title="Buat Nota" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" onClick={() => setIsNotaModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="nota-form">Simpan</button>
                </div>
            }>
                <form id="nota-form" className="sp-formGrid" onSubmit={handleNotaSubmit}>
                    <label className="sp-field"><span className="sp-label">Pengiriman *</span>
                        <select className="sp-input" value={notaForm.idPengiriman} onChange={handleNotaChange('idPengiriman')} required>
                            <option value="">Pilih</option>
                            {list.map((p) => (
                                <option key={p.IdPengiriman} value={p.IdPengiriman}>{p.KodePengiriman} - {p.TujuanPengiriman}</option>
                            ))}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Tanggal *</span><input className="sp-input" type="date" value={notaForm.tanggalNota} onChange={handleNotaChange('tanggalNota')} required /></label>
                    <label className="sp-field"><span className="sp-label">Nama Barang *</span><input className="sp-input" value={notaForm.namaBarang} onChange={handleNotaChange('namaBarang')} required /></label>
                    <label className="sp-field"><span className="sp-label">Varian</span><input className="sp-input" value={notaForm.varian} onChange={handleNotaChange('varian')} /></label>
                    <div className="sp-fieldGroup">
                        <label className="sp-field"><span className="sp-label">Jumlah *</span><input className="sp-input" type="number" min="1" value={notaForm.jumlah} onChange={handleNotaChange('jumlah')} required /></label>
                        <label className="sp-field"><span className="sp-label">Satuan</span>
                            <select className="sp-input" value={notaForm.satuan} onChange={handleNotaChange('satuan')}><option value="KG">Kg</option><option value="EKOR">Ekor</option><option value="PCS">Pcs</option></select>
                        </label>
                    </div>
                    <label className="sp-field"><span className="sp-label">Harga Satuan (Rp) *</span><input className="sp-input" type="number" min="0" value={notaForm.hargaSatuan} onChange={handleNotaChange('hargaSatuan')} required /></label>
                </form>
            </Modal>
        </div>
    )
}
