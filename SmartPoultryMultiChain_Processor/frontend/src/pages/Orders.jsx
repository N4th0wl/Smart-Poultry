import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'
import { useNavigate } from 'react-router-dom'

const defaultForm = {
    kodePeternakan: '', namaPeternakan: '', alamatPeternakan: '', kontakPeternakan: '',
    jenisAyam: '', jumlahPesanan: '', satuan: 'EKOR',
    tanggalOrder: new Date().toISOString().split('T')[0],
    tanggalDibutuhkan: '', hargaSatuan: '', catatan: '',
}

const defaultTerimaForm = {
    penerimaOrder: '', jumlahDiterima: '', kondisiTerima: '', tanggalDiterima: '',
}

export default function Orders() {
    const [activeTab, setActiveTab] = useState('RETAILER') // 'RETAILER' | 'PETERNAKAN'

    // States for Peternakan
    const [orders, setOrders] = useState([])
    const [peternakanList, setPeternakanList] = useState([])
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    
    // States for Retailer
    const [retailerOrders, setRetailerOrders] = useState([])
    const [stock, setStock] = useState({ stockByType: [], totalAvailable: 0, hasStock: false })
    const [searchRetailer, setSearchRetailer] = useState('')
    const [prefillSource, setPrefillSource] = useState(null)

    // States for Terima Modal
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [isTerimaModalOpen, setIsTerimaModalOpen] = useState(false)
    const [terimaForm, setTerimaForm] = useState(defaultTerimaForm)

    const { showToast } = useToast()
    const navigate = useNavigate()

    const loadOrders = async () => {
        try {
            const res = await apiClient.get('/orders')
            setOrders(res.data.data)
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memuat data order peternakan.', status: 'error' })
        }
    }

    const loadPeternakan = async () => {
        try {
            const res = await apiClient.get('/orders/peternakan')
            setPeternakanList(res.data.data || [])
        } catch (err) {
            console.error('Failed to load farms', err)
        }
    }

    const loadRetailerOrders = async () => {
        try {
            const res = await apiClient.get('/orders/retailer-orders')
            setRetailerOrders(res.data.data)
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memuat data pesanan masuk dari Retailer.', status: 'error' })
        }
    }

    const loadStock = async () => {
        try {
            const res = await apiClient.get('/orders/stock-summary')
            setStock(res.data.data)
        } catch (err) {
            console.error('Gagal memuat data stok:', err)
        }
    }

    useEffect(() => { 
        loadOrders()
        loadPeternakan()
        loadRetailerOrders()
        loadStock()
    }, [])

    // --- Search & Filters ---
    const filteredOrders = useMemo(() => {
        if (!search.trim()) return orders
        const q = search.toLowerCase()
        return orders.filter((o) =>
            o.KodeOrder?.toLowerCase().includes(q) ||
            o.NamaPeternakan?.toLowerCase().includes(q) ||
            o.JenisAyam?.toLowerCase().includes(q) ||
            o.StatusOrder?.toLowerCase().includes(q)
        )
    }, [orders, search])

    const filteredRetailerOrders = useMemo(() => {
        if (!searchRetailer.trim()) return retailerOrders
        const q = searchRetailer.toLowerCase()
        return retailerOrders.filter((o) =>
            o.KodeOrder?.toLowerCase().includes(q) ||
            o.NamaRetailer?.toLowerCase().includes(q) ||
            o.NamaProduk?.toLowerCase().includes(q) ||
            o.StatusOrder?.toLowerCase().includes(q)
        )
    }, [retailerOrders, searchRetailer])

    const getStockForType = (jenisAyam) => {
        if (!jenisAyam) return 0
        const match = stock.stockByType.find(s =>
            s.JenisAyam?.toLowerCase().includes(jenisAyam.toLowerCase()) ||
            jenisAyam.toLowerCase().includes(s.JenisAyam?.toLowerCase())
        )
        return match ? parseInt(match.StokTersedia) || 0 : 0
    }

    // --- Actions for Peternakan Orders ---
    const handleChange = (field) => (e) => {
        if (field === 'kodePeternakan') {
            const selected = peternakanList.find(p => String(p.KodePeternakan) === String(e.target.value))
            if (selected) {
                setForm(p => ({
                    ...p, 
                    kodePeternakan: selected.KodePeternakan,
                    namaPeternakan: selected.NamaPeternakan,
                    alamatPeternakan: selected.AlamatPeternakan || '',
                    kontakPeternakan: selected.KontakPeternakan || ''
                }))
                return
            }
        }
        setForm((p) => ({ ...p, [field]: e.target.value }))
    }

    const handleTerimaChange = (field) => (e) => setTerimaForm((p) => ({ ...p, [field]: e.target.value }))

    const isFormValid = useMemo(() => {
        return form.kodePeternakan && form.namaPeternakan.trim() && form.jenisAyam.trim() && form.jumlahPesanan && form.tanggalOrder && form.tanggalDibutuhkan
    }, [form])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isFormValid) return
        try {
            await apiClient.post('/orders', form)
            showToast({ title: 'Berhasil', description: 'Order ke peternakan berhasil dibuat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
            setPrefillSource(null)
            loadOrders()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal membuat order.', status: 'error' })
        }
    }

    const handleTerima = async (e) => {
        e.preventDefault()
        if (!selectedOrder) return
        try {
            await apiClient.put(`/orders/${selectedOrder.IdOrder}/terima`, terimaForm)
            showToast({ title: 'Berhasil', description: 'Order dari peternakan diterima & genesis block dibuat.', status: 'success' })
            setTerimaForm(defaultTerimaForm)
            setIsTerimaModalOpen(false)
            setSelectedOrder(null)
            loadOrders()
            loadStock() // Refresh stock!
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal menerima order.', status: 'error' })
        }
    }

    const openTerimaModal = (order) => {
        setSelectedOrder(order)
        setTerimaForm({
            penerimaOrder: '', jumlahDiterima: String(order.JumlahPesanan), kondisiTerima: 'Baik',
            tanggalDiterima: new Date().toISOString().split('T')[0],
        })
        setIsTerimaModalOpen(true)
    }

    const handleDelete = async (id) => {
        if (!confirm('Hapus order ini?')) return
        try {
            await apiClient.delete(`/orders/${id}`)
            showToast({ title: 'Dihapus', description: 'Order berhasil dihapus.', status: 'success' })
            loadOrders()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal menghapus.', status: 'error' })
        }
    }

    // --- Actions for Retailer Orders ---
    const handleKirim = (order) => {
        navigate('/app/pengiriman')
        showToast({ title: 'Info', description: `Silakan buat pengiriman baru untuk pesanan ${order.KodeOrder}.`, status: 'info' })
    }

    const handleConfirm = async (order) => {
        try {
            await apiClient.put(`/orders/retailer-orders/${order.IdOrder}/confirm`)
            showToast({ title: 'Berhasil', description: `Pesanan Retailer ${order.KodeOrder} dikonfirmasi (Diproses).`, status: 'success' })
            loadRetailerOrders()
        } catch (err) {
            showToast({ title: 'Gagal', description: 'Gagal mengkonfirmasi pesanan retailer.', status: 'error' })
        }
    }

    const openOrderToFarm = (retailerOrder = null) => {
        if (retailerOrder) {
            setPrefillSource(retailerOrder)
            setForm({
                ...defaultForm,
                jenisAyam: retailerOrder.JenisProduk || retailerOrder.NamaProduk || '',
                jumlahPesanan: String(retailerOrder.JumlahPesanan || ''),
                tanggalDibutuhkan: retailerOrder.TanggalDibutuhkan || '',
                catatan: `Order dari Retailer: ${retailerOrder.KodeOrder} — ${retailerOrder.NamaRetailer || 'Unknown'}`,
            })
            // Switch tab gracefully if not already there, though the modal overlays it anyway
            setActiveTab('PETERNAKAN') 
        } else {
            setPrefillSource(null)
            setForm(defaultForm)
        }
        setIsModalOpen(true)
    }

    return (
        <div>
            <PageHeader
                title="Manajemen Pesanan"
                subtitle="Kelola pesanan masuk dari Retailer dan buat order ke Peternakan"
                actions={
                    <button className="sp-btn" type="button" onClick={() => { setActiveTab('PETERNAKAN'); openOrderToFarm(null); }}>
                        + Tambah Order ke Peternakan
                    </button>
                }
            />

            {/* TABS */}
            <div style={{ display: 'flex', gap: 16, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
                <button
                    onClick={() => setActiveTab('RETAILER')}
                    style={{
                        background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
                        fontSize: '15px', fontWeight: activeTab === 'RETAILER' ? 600 : 400,
                        color: activeTab === 'RETAILER' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'RETAILER' ? '2px solid #2563eb' : '2px solid transparent'
                    }}
                >
                    📥 Pesanan Masuk (Retailer)
                </button>
                <button
                    onClick={() => setActiveTab('PETERNAKAN')}
                    style={{
                        background: 'none', border: 'none', padding: '10px 16px', cursor: 'pointer',
                        fontSize: '15px', fontWeight: activeTab === 'PETERNAKAN' ? 600 : 400,
                        color: activeTab === 'PETERNAKAN' ? '#2563eb' : '#64748b',
                        borderBottom: activeTab === 'PETERNAKAN' ? '2px solid #2563eb' : '2px solid transparent'
                    }}
                >
                    🏗️ Order Keluar (Peternakan)
                </button>
            </div>

            {/* TAB CONTENT: RETAILER */}
            {activeTab === 'RETAILER' && (
                <div>
                     {/* Stock Summary Cards */}
                    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                        <div className="sp-card" style={{ flex: '1 1 200px', padding: '16px 20px', background: stock.hasStock ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.04))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.04))', border: stock.hasStock ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: stock.hasStock ? '#059669' : '#dc2626', marginBottom: 4 }}>
                                Status Stok
                            </div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stock.hasStock ? '#047857' : '#b91c1c' }}>
                                {stock.hasStock ? '✅ Tersedia' : '⚠️ Habis'}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
                                Total Akhir: {stock.totalAvailable.toLocaleString()} ekor ready
                            </div>
                        </div>

                        {stock.stockByType.map((s, idx) => (
                            <div key={idx} className="sp-card" style={{ flex: '1 1 200px', padding: '16px 20px' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: 4 }}>
                                    {s.JenisAyam}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: parseInt(s.StokTersedia) > 0 ? '#047857' : '#b91c1c' }}>
                                    {parseInt(s.StokTersedia).toLocaleString()}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
                                    {s.JumlahBatch} batch • {parseFloat(s.TotalBerat || 0).toFixed(1)} kg
                                </div>
                            </div>
                        ))}

                        {stock.stockByType.length === 0 && (
                            <div className="sp-card" style={{ flex: '1 1 200px', padding: '16px 20px' }}>
                                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center' }}>
                                    Belum ada data produksi. Silakan order ayam dari peternakan terlebih dahulu.
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="sp-card">
                        <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                            <span>Daftar Pesanan Masuk (Retailer)</span>
                            <input className="sp-searchInput" placeholder="Cari pesanan retailer..." value={searchRetailer} onChange={(e) => setSearchRetailer(e.target.value)} style={{ maxWidth: 240 }} />
                        </div>
                        <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                            <table className="sp-table">
                                <thead>
                                    <tr>
                                        <th>Kode Order</th>
                                        <th>Retailer Pemesan</th>
                                        <th>Produk</th>
                                        <th>Jumlah</th>
                                        <th>Target Tanggal</th>
                                        <th>Cek Stok</th>
                                        <th>Status</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRetailerOrders.length > 0 ? filteredRetailerOrders.map((o) => {
                                        const availableStock = getStockForType(o.JenisProduk || o.NamaProduk)
                                        const isStockReady = availableStock >= (o.JumlahPesanan || 0)
                                        return (
                                            <tr key={o.IdOrder}>
                                                <td><strong>{o.KodeOrder}</strong></td>
                                                <td>
                                                    <div><strong>{o.NamaRetailer || 'Unknown Retailer'}</strong></div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{o.AlamatRetailer}</div>
                                                </td>
                                                <td>
                                                    <div>{o.NamaProduk}</div>
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Jenis: {o.JenisProduk}</div>
                                                </td>
                                                <td>{o.JumlahPesanan} {o.Satuan}</td>
                                                <td>{o.TanggalDibutuhkan}</td>
                                                <td>
                                                    <span className={`sp-badge ${isStockReady ? 'success' : 'danger'}`}>
                                                        {isStockReady ? `✅ ${availableStock}` : `❌ ${availableStock}`}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`sp-badge ${o.StatusOrder === 'SELESAI' ? 'success' : o.StatusOrder === 'DITERIMA' ? 'success' : o.StatusOrder === 'DIKIRIM' ? 'info' : o.StatusOrder === 'PENDING' ? 'muted' : 'danger'}`}>
                                                        {o.StatusOrder}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                        {o.StatusOrder === 'PENDING' && (
                                                            <button className="sp-btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#2563eb', borderColor: '#2563eb' }} onClick={() => handleConfirm(o)}>✅ Terima</button>
                                                        )}
                                                        {o.StatusOrder === 'DIPROSES' && isStockReady && (
                                                            <button className="sp-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => handleKirim(o)}>🚚 Kirim Produk</button>
                                                        )}
                                                        {o.StatusOrder === 'DIPROSES' && !isStockReady && (
                                                            <button className="sp-btn" style={{ padding: '6px 12px', fontSize: '12px', background: '#b45309', borderColor: '#b45309' }} onClick={() => openOrderToFarm(o)}>🏗️ Order ke Peternakan</button>
                                                        )}
                                                        {o.StatusOrder !== 'PENDING' && o.StatusOrder !== 'DIPROSES' && (
                                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Sudah diproses</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    }) : (
                                        <tr><td colSpan={8} className="sp-empty">Belum ada pesanan masuk dari Retailer.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: PETERNAKAN */}
            {activeTab === 'PETERNAKAN' && (
                <div className="sp-card">
                    <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                        <span>Daftar Order Keluar (ke Peternakan)</span>
                        <input className="sp-searchInput" placeholder="Cari order farm..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                    </div>
                    <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                        <table className="sp-table">
                            <thead>
                                <tr>
                                    <th>Kode Order</th>
                                    <th>Tujuan Peternakan</th>
                                    <th>Jenis Ayam</th>
                                    <th>Jumlah</th>
                                    <th>Target Tanggal</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredOrders.length > 0 ? filteredOrders.map((o) => (
                                    <tr key={o.IdOrder}>
                                        <td><strong>{o.KodeOrder}</strong></td>
                                        <td>{o.NamaPeternakan}</td>
                                        <td>{o.JenisAyam}</td>
                                        <td>{o.JumlahPesanan} {o.Satuan}</td>
                                        <td>{o.TanggalDibutuhkan}</td>
                                        <td><span className={`sp-badge ${o.StatusOrder === 'SELESAI' ? 'success' : o.StatusOrder === 'DITERIMA' ? 'info' : o.StatusOrder === 'DIKIRIM' ? 'warn' : o.StatusOrder === 'DITOLAK' ? 'danger' : 'muted'}`}>{o.StatusOrder}</span></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {(o.StatusOrder === 'CONFIRMED' || o.StatusOrder === 'DIKIRIM') && (
                                                    <button className="sp-btn" style={{ height: 32, fontSize: 12, padding: '0 10px', background: o.StatusOrder === 'DIKIRIM' ? '#059669' : '' }} onClick={() => openTerimaModal(o)}>Terima dari Peternakan</button>
                                                )}
                                                {o.StatusOrder === 'PENDING' && (
                                                    <button className="sp-btn danger" style={{ height: 32, fontSize: 12, padding: '0 10px' }} onClick={() => handleDelete(o.IdOrder)}>Batalkan</button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={7} className="sp-empty">Belum ada order ke peternakan.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Order to Peternakan Modal */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Order ke Peternakan" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" type="button" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="order-form" disabled={!isFormValid}>Kirim Order</button>
                </div>
            }>
                {prefillSource && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem' }}>
                        <strong>⚠️ Alokasi Stok</strong> untuk pesanan Retailer <strong>{prefillSource.KodeOrder}</strong> ({prefillSource.NamaRetailer}).
                    </div>
                )}
                <form id="order-form" className="sp-formGrid" onSubmit={handleSubmit}>
                    <label className="sp-field"><span className="sp-label">Pilih Peternakan *</span>
                        <select className="sp-input" value={form.kodePeternakan} onChange={handleChange('kodePeternakan')} required>
                            <option value="">-- Pilih Peternakan --</option>
                            {peternakanList.map(p => (
                                <option key={p.KodePeternakan} value={p.KodePeternakan}>{p.NamaPeternakan}</option>
                            ))}
                        </select>
                    </label>
                    <label className="sp-field"><span className="sp-label">Alamat Peternakan</span><input className="sp-input" value={form.alamatPeternakan} onChange={handleChange('alamatPeternakan')} readOnly style={{backgroundColor: '#f1f5f9'}} /></label>
                    <label className="sp-field"><span className="sp-label">Kontak Peternakan</span><input className="sp-input" value={form.kontakPeternakan} onChange={handleChange('kontakPeternakan')} readOnly style={{backgroundColor: '#f1f5f9'}}/></label>
                    <label className="sp-field"><span className="sp-label">Jenis Ayam *</span><input className="sp-input" value={form.jenisAyam} onChange={handleChange('jenisAyam')} placeholder="Broiler, Layer, dll" required /></label>
                    <div className="sp-fieldGroup">
                        <label className="sp-field"><span className="sp-label">Jumlah *</span><input className="sp-input" type="number" min="1" value={form.jumlahPesanan} onChange={handleChange('jumlahPesanan')} required /></label>
                        <label className="sp-field"><span className="sp-label">Satuan</span>
                            <select className="sp-input" value={form.satuan} onChange={handleChange('satuan')}><option value="EKOR">Ekor</option><option value="KG">Kg</option></select>
                        </label>
                    </div>
                    <label className="sp-field"><span className="sp-label">Tanggal Order *</span><input className="sp-input" type="date" value={form.tanggalOrder} onChange={handleChange('tanggalOrder')} required /></label>
                    <label className="sp-field"><span className="sp-label">Tanggal Dibutuhkan *</span><input className="sp-input" type="date" value={form.tanggalDibutuhkan} onChange={handleChange('tanggalDibutuhkan')} required /></label>
                    <label className="sp-field"><span className="sp-label">Harga Satuan (Rp)</span><input className="sp-input" type="number" min="0" value={form.hargaSatuan} onChange={handleChange('hargaSatuan')} /></label>
                    <label className="sp-field sp-fieldFull"><span className="sp-label">Catatan</span><textarea className="sp-textarea" rows={3} value={form.catatan} onChange={handleChange('catatan')} /></label>
                </form>
            </Modal>

            {/* Terima Order Peternakan Modal */}
            <Modal open={isTerimaModalOpen} onClose={() => setIsTerimaModalOpen(false)} title={`Terima Batch ${selectedOrder?.KodeOrder || ''}`} footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" type="button" onClick={() => setIsTerimaModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="terima-form">Validasi Penerimaan</button>
                </div>
            }>
                <form id="terima-form" className="sp-formGrid" onSubmit={handleTerima}>
                    <label className="sp-field"><span className="sp-label">Petugas Penerima</span><input className="sp-input" value={terimaForm.penerimaOrder} onChange={handleTerimaChange('penerimaOrder')} /></label>
                    <label className="sp-field"><span className="sp-label">Jumlah Ayam Diterima</span><input className="sp-input" type="number" value={terimaForm.jumlahDiterima} onChange={handleTerimaChange('jumlahDiterima')} /></label>
                    <label className="sp-field"><span className="sp-label">Tanggal Masuk Fasilitas</span><input className="sp-input" type="date" value={terimaForm.tanggalDiterima} onChange={handleTerimaChange('tanggalDiterima')} /></label>
                    <label className="sp-field"><span className="sp-label">Kondisi (QC)</span><input className="sp-input" value={terimaForm.kondisiTerima} onChange={handleTerimaChange('kondisiTerima')} placeholder="Sehat / Baik" /></label>
                </form>
            </Modal>
        </div>
    )
}
