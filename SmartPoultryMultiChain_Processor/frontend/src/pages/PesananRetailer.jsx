import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'
import { useNavigate } from 'react-router-dom'

const defaultOrderForm = {
    namaPeternakan: '', alamatPeternakan: '', kontakPeternakan: '',
    jenisAyam: '', jumlahPesanan: '', satuan: 'EKOR',
    tanggalOrder: new Date().toISOString().split('T')[0],
    tanggalDibutuhkan: '', hargaSatuan: '', catatan: '',
}

export default function PesananRetailer() {
    const [orders, setOrders] = useState([])
    const [stock, setStock] = useState({ stockByType: [], totalAvailable: 0, hasStock: false })
    const [search, setSearch] = useState('')
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false)
    const [orderForm, setOrderForm] = useState(defaultOrderForm)
    const [prefillSource, setPrefillSource] = useState(null)
    const { showToast } = useToast()
    const navigate = useNavigate()

    const loadOrders = async () => {
        try {
            const res = await apiClient.get('/orders/retailer-orders')
            setOrders(res.data.data)
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memuat data pesanan dari Retailer.', status: 'error' })
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
        loadStock()
    }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return orders
        const q = search.toLowerCase()
        return orders.filter((o) =>
            o.KodeOrder?.toLowerCase().includes(q) ||
            o.NamaRetailer?.toLowerCase().includes(q) ||
            o.NamaProduk?.toLowerCase().includes(q) ||
            o.StatusOrder?.toLowerCase().includes(q)
        )
    }, [orders, search])

    const getStockForType = (jenisAyam) => {
        if (!jenisAyam) return 0
        const match = stock.stockByType.find(s =>
            s.JenisAyam?.toLowerCase().includes(jenisAyam.toLowerCase()) ||
            jenisAyam.toLowerCase().includes(s.JenisAyam?.toLowerCase())
        )
        return match ? parseInt(match.StokTersedia) || 0 : 0
    }

    const handleKirim = (order) => {
        navigate('/app/pengiriman')
        showToast({ title: 'Info', description: `Silakan buat pengiriman baru untuk pesanan ${order.KodeOrder}.`, status: 'info' })
    }

    const handleConfirm = async (order) => {
        try {
            await apiClient.put(`/orders/retailer-orders/${order.IdOrder}/confirm`)
            showToast({ title: 'Berhasil', description: `Pesanan ${order.KodeOrder} dikonfirmasi (Diproses).`, status: 'success' })
            loadOrders()
        } catch (err) {
            showToast({ title: 'Gagal', description: 'Gagal mengkonfirmasi pesanan.', status: 'error' })
        }
    }

    const handleOrderChange = (field) => (e) => setOrderForm((p) => ({ ...p, [field]: e.target.value }))

    const isOrderFormValid = useMemo(() => {
        return orderForm.namaPeternakan.trim() && orderForm.jenisAyam.trim() &&
            orderForm.jumlahPesanan && orderForm.tanggalOrder && orderForm.tanggalDibutuhkan
    }, [orderForm])

    const openOrderToFarm = (retailerOrder = null) => {
        if (retailerOrder) {
            setPrefillSource(retailerOrder)
            setOrderForm({
                ...defaultOrderForm,
                jenisAyam: retailerOrder.JenisProduk || retailerOrder.NamaProduk || '',
                jumlahPesanan: String(retailerOrder.JumlahPesanan || ''),
                tanggalDibutuhkan: retailerOrder.TanggalDibutuhkan || '',
                catatan: `Order dari Retailer: ${retailerOrder.KodeOrder} — ${retailerOrder.NamaRetailer || 'Unknown'}`,
            })
        } else {
            setPrefillSource(null)
            setOrderForm(defaultOrderForm)
        }
        setIsOrderModalOpen(true)
    }

    const handleSubmitOrderToFarm = async (e) => {
        e.preventDefault()
        if (!isOrderFormValid) return
        try {
            await apiClient.post('/orders', orderForm)
            showToast({ title: 'Berhasil', description: 'Order ke peternakan berhasil dibuat.', status: 'success' })
            setOrderForm(defaultOrderForm)
            setIsOrderModalOpen(false)
            setPrefillSource(null)
            loadStock()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal membuat order.', status: 'error' })
        }
    }

    return (
        <div>
            <PageHeader
                title="Pesanan Masuk dari Retailer"
                subtitle="Daftar permintaan barang dari sistem Retailer — cek stok & order ke peternakan"
                actions={
                    <button className="sp-btn" type="button" onClick={() => openOrderToFarm(null)}>
                        🏗️ Order ke Peternakan
                    </button>
                }
            />

            {/* Stock Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div className="sp-card" style={{ padding: '16px 20px', background: stock.hasStock ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.04))' : 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(220,38,38,0.04))', border: stock.hasStock ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: stock.hasStock ? '#059669' : '#dc2626', marginBottom: 4 }}>
                        Status Stok
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: stock.hasStock ? '#047857' : '#b91c1c' }}>
                        {stock.hasStock ? '✅ Tersedia' : '⚠️ Habis'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: 4 }}>
                        Total: {stock.totalAvailable.toLocaleString()} ekor ready
                    </div>
                </div>

                {stock.stockByType.map((s, idx) => (
                    <div key={idx} className="sp-card" style={{ padding: '16px 20px' }}>
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
                    <div className="sp-card" style={{ padding: '16px 20px', gridColumn: 'span 2' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--muted)', textAlign: 'center' }}>
                            Belum ada data produksi. Silakan order ayam dari peternakan terlebih dahulu.
                        </div>
                    </div>
                )}
            </div>

            {/* Pesanan Table */}
            <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Pesanan dari Retailer</span>
                    <input className="sp-searchInput" placeholder="Cari pesanan..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
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
                                <th>Stok</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((o) => {
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
                                            <span className={`sp-badge ${o.StatusOrder === 'SELESAI' ? 'success' :
                                                    o.StatusOrder === 'DITERIMA' ? 'success' :
                                                        o.StatusOrder === 'DIKIRIM' ? 'info' :
                                                            o.StatusOrder === 'PENDING' ? 'muted' : 'danger'
                                                }`}>
                                                {o.StatusOrder}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {o.StatusOrder === 'PENDING' && (
                                                    <button className="sp-btn" style={{ padding: '6px 12px', fontSize: '13px', background: '#2563eb', borderColor: '#2563eb' }} onClick={() => handleConfirm(o)}>
                                                        ✅ Terima
                                                    </button>
                                                )}
                                                {o.StatusOrder === 'DIPROSES' && isStockReady && (
                                                    <button className="sp-btn" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleKirim(o)}>
                                                        🚚 Kirim
                                                    </button>
                                                )}
                                                {o.StatusOrder === 'DIPROSES' && !isStockReady && (
                                                    <button className="sp-btn" style={{ padding: '6px 12px', fontSize: '13px', background: '#b45309', borderColor: '#b45309' }} onClick={() => openOrderToFarm(o)}>
                                                        🏗️ Order ke Peternakan
                                                    </button>
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

            {/* Order to Farm Modal */}
            <Modal open={isOrderModalOpen} onClose={() => setIsOrderModalOpen(false)} title="Order Ayam ke Peternakan" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" type="button" onClick={() => setIsOrderModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="order-farm-form" disabled={!isOrderFormValid}>Kirim Order</button>
                </div>
            }>
                {prefillSource && (
                    <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(217,119,6,0.04))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem' }}>
                        <strong>⚠️ Stok tidak cukup</strong> untuk pesanan <strong>{prefillSource.KodeOrder}</strong> dari <strong>{prefillSource.NamaRetailer}</strong>.
                        <br />Order ini akan dikirim ke peternakan untuk memenuhi kebutuhan.
                    </div>
                )}
                <form id="order-farm-form" className="sp-formGrid" onSubmit={handleSubmitOrderToFarm}>
                    <label className="sp-field"><span className="sp-label">Nama Peternakan *</span><input className="sp-input" value={orderForm.namaPeternakan} onChange={handleOrderChange('namaPeternakan')} required /></label>
                    <label className="sp-field"><span className="sp-label">Alamat Peternakan</span><input className="sp-input" value={orderForm.alamatPeternakan} onChange={handleOrderChange('alamatPeternakan')} /></label>
                    <label className="sp-field"><span className="sp-label">Kontak Peternakan</span><input className="sp-input" value={orderForm.kontakPeternakan} onChange={handleOrderChange('kontakPeternakan')} /></label>
                    <label className="sp-field"><span className="sp-label">Jenis Ayam *</span><input className="sp-input" value={orderForm.jenisAyam} onChange={handleOrderChange('jenisAyam')} placeholder="Broiler, Layer, dll" required /></label>
                    <div className="sp-fieldGroup">
                        <label className="sp-field"><span className="sp-label">Jumlah *</span><input className="sp-input" type="number" min="1" value={orderForm.jumlahPesanan} onChange={handleOrderChange('jumlahPesanan')} required /></label>
                        <label className="sp-field"><span className="sp-label">Satuan</span>
                            <select className="sp-input" value={orderForm.satuan} onChange={handleOrderChange('satuan')}><option value="EKOR">Ekor</option><option value="KG">Kg</option></select>
                        </label>
                    </div>
                    <label className="sp-field"><span className="sp-label">Tanggal Order *</span><input className="sp-input" type="date" value={orderForm.tanggalOrder} onChange={handleOrderChange('tanggalOrder')} required /></label>
                    <label className="sp-field"><span className="sp-label">Tanggal Dibutuhkan *</span><input className="sp-input" type="date" value={orderForm.tanggalDibutuhkan} onChange={handleOrderChange('tanggalDibutuhkan')} required /></label>
                    <label className="sp-field"><span className="sp-label">Harga Satuan (Rp)</span><input className="sp-input" type="number" min="0" value={orderForm.hargaSatuan} onChange={handleOrderChange('hargaSatuan')} /></label>
                    <label className="sp-field sp-fieldFull"><span className="sp-label">Catatan</span><textarea className="sp-textarea" rows={3} value={orderForm.catatan} onChange={handleOrderChange('catatan')} /></label>
                </form>
            </Modal>
        </div>
    )
}
