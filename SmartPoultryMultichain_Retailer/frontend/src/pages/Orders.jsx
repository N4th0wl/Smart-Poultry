import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

export default function Orders() {
    const { showToast } = useToast()
    const [orders, setOrders] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [showTerimaModal, setShowTerimaModal] = useState(false)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [loading, setLoading] = useState(false)
    const [processorInfo, setProcessorInfo] = useState({ namaProcessor: '', alamatProcessor: '', kontakProcessor: '' })
    const [form, setForm] = useState({
        namaProduk: '', jenisProduk: '', jumlahPesanan: '', satuan: 'KG',
        tanggalDibutuhkan: '', hargaSatuan: '', catatan: ''
    })
    const [terimaForm, setTerimaForm] = useState({ penerimaOrder: '', jumlahDiterima: '', kondisiTerima: '', kodeOrderProcessor: '', processorLastBlockHash: '' })

    useEffect(() => {
        loadOrders()
        loadProcessorInfo()
    }, [])

    async function loadOrders() {
        try {
            const res = await apiClient.get('/orders')
            setOrders(res.data.data)
        } catch { /* noop */ }
    }

    async function loadProcessorInfo() {
        try {
            const res = await apiClient.get('/orders/processor-info')
            setProcessorInfo(res.data.data)
        } catch { /* noop */ }
    }

    const handleChange = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))
    const handleTerimaChange = (f) => (e) => setTerimaForm(p => ({ ...p, [f]: e.target.value }))

    async function onSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            await apiClient.post('/orders', { ...form, jumlahPesanan: Number(form.jumlahPesanan), hargaSatuan: Number(form.hargaSatuan) })
            showToast({ title: 'Berhasil', description: 'Order berhasil dibuat.', status: 'success' })
            setShowModal(false)
            setForm({ namaProduk: '', jenisProduk: '', jumlahPesanan: '', satuan: 'KG', tanggalDibutuhkan: '', hargaSatuan: '', catatan: '' })
            loadOrders()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal membuat order.', status: 'error' })
        } finally { setLoading(false) }
    }

    async function onTerima(e) {
        e.preventDefault()
        setLoading(true)
        try {
            await apiClient.put(`/orders/${selectedOrder.IdOrder}/terima`, {
                ...terimaForm,
                jumlahDiterima: Number(terimaForm.jumlahDiterima) || selectedOrder.JumlahPesanan,
            })
            showToast({ title: 'Berhasil', description: 'Order berhasil diterima & blockchain dibuat.', status: 'success' })
            setShowTerimaModal(false)
            loadOrders()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal menerima order.', status: 'error' })
        } finally { setLoading(false) }
    }

    return (
        <div>
            <PageHeader title="Order Pembelian" subtitle="Order produk dari processor" actions={
                <button className="sp-btn" onClick={() => setShowModal(true)}>+ Buat Order</button>
            } />

            <div className="sp-card">
                <div className="sp-cardBody">
                    <table className="sp-table">
                        <thead>
                            <tr><th>Kode</th><th>Processor</th><th>Produk</th><th>Jumlah</th><th>Total</th><th>Status</th><th>Tanggal</th><th>Aksi</th></tr>
                        </thead>
                        <tbody>
                            {orders.length > 0 ? orders.map(o => (
                                <tr key={o.IdOrder}>
                                    <td><strong>{o.KodeOrder}</strong></td>
                                    <td>{o.NamaProcessor}</td>
                                    <td>{o.NamaProduk}</td>
                                    <td>{o.JumlahPesanan} {o.Satuan}</td>
                                    <td>Rp {Number(o.TotalHarga).toLocaleString('id-ID')}</td>
                                    <td><span className={`sp-badge ${
                                        o.StatusOrder === 'SELESAI' ? 'success' :
                                        o.StatusOrder === 'DITERIMA' ? 'success' :
                                        o.StatusOrder === 'DIKIRIM' ? 'info' :
                                        o.StatusOrder === 'DIPROSES' ? 'info' :
                                        o.StatusOrder === 'DITOLAK' || o.StatusOrder === 'GAGAL' ? 'danger' : 'muted'
                                    }`}>{
                                        o.StatusOrder === 'PENDING' ? '⏳ Menunggu' :
                                        o.StatusOrder === 'DIPROSES' ? '🔄 Diproses' :
                                        o.StatusOrder === 'DIKIRIM' ? '🚚 Dikirim' :
                                        o.StatusOrder === 'DITERIMA' ? '📦 Diterima' :
                                        o.StatusOrder === 'SELESAI' ? '✅ Selesai' :
                                        o.StatusOrder === 'GAGAL' ? '❌ Gagal' :
                                        o.StatusOrder === 'DITOLAK' ? '❌ Ditolak' :
                                        o.StatusOrder
                                    }</span></td>
                                    <td>{o.TanggalOrder}</td>
                                    <td>
                                        {(o.StatusOrder === 'DIKIRIM') && (
                                            <button className="sp-btn secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                                onClick={() => { setSelectedOrder(o); setTerimaForm({ penerimaOrder: '', jumlahDiterima: String(o.JumlahPesanan), kondisiTerima: '', kodeOrderProcessor: '', processorLastBlockHash: '' }); setShowTerimaModal(true) }}>
                                                Terima
                                            </button>
                                        )}
                                        {(o.StatusOrder === 'PENDING' || o.StatusOrder === 'DIPROSES') && (
                                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Menunggu proses...</span>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="sp-empty">Belum ada order.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            <Modal open={showModal} onClose={() => setShowModal(false)} title="Buat Order Baru">
                <form className="sp-form" onSubmit={onSubmit}>
                    {/* Single Processor Info Banner */}
                    <div style={{
                        background: 'linear-gradient(135deg, #E8F5E9, #F1F8E9)',
                        borderRadius: 12,
                        padding: '14px 18px',
                        marginBottom: 18,
                        border: '1px solid rgba(13,92,62,0.12)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12
                    }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: 'linear-gradient(135deg, #0D5C3E, #1A8A5C)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.1rem', flexShrink: 0, color: '#fff'
                        }}>🏭</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0D5C3E', marginBottom: 2 }}>Processor Pemasok</div>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1B4332' }}>{processorInfo.namaProcessor || 'Memuat...'}</div>
                            {processorInfo.alamatProcessor && (
                                <div style={{ fontSize: '0.82rem', color: '#6B7B74', marginTop: 2 }}>📍 {processorInfo.alamatProcessor}</div>
                            )}
                            {processorInfo.kontakProcessor && (
                                <div style={{ fontSize: '0.82rem', color: '#6B7B74', marginTop: 1 }}>📞 {processorInfo.kontakProcessor}</div>
                            )}
                        </div>
                    </div>

                    <div className="sp-formGrid">
                        <label className="sp-field"><span className="sp-label">Nama Produk</span><input className="sp-input" value={form.namaProduk} onChange={handleChange('namaProduk')} required placeholder="Ayam Potong, Fillet, dll" /></label>
                        <label className="sp-field"><span className="sp-label">Jenis Produk</span><input className="sp-input" value={form.jenisProduk} onChange={handleChange('jenisProduk')} required placeholder="Ayam Utuh, Paha, Dada, dll" /></label>
                        <label className="sp-field"><span className="sp-label">Jumlah</span><input className="sp-input" type="number" value={form.jumlahPesanan} onChange={handleChange('jumlahPesanan')} required min="1" /></label>
                        <label className="sp-field"><span className="sp-label">Satuan</span><select className="sp-input" value={form.satuan} onChange={handleChange('satuan')}><option>KG</option><option>PCS</option><option>PACK</option><option>BOX</option></select></label>
                        <label className="sp-field"><span className="sp-label">Harga Satuan</span><input className="sp-input" type="number" value={form.hargaSatuan} onChange={handleChange('hargaSatuan')} /></label>
                        <label className="sp-field"><span className="sp-label">Tgl Dibutuhkan</span><input className="sp-input" type="date" value={form.tanggalDibutuhkan} onChange={handleChange('tanggalDibutuhkan')} required /></label>
                        <label className="sp-field sp-fieldFull"><span className="sp-label">Catatan</span><textarea className="sp-textarea" value={form.catatan} onChange={handleChange('catatan')} /></label>
                    </div>
                    <button className="sp-btn" type="submit" disabled={loading} style={{ marginTop: 12 }}>{loading ? 'Menyimpan...' : 'Simpan Order'}</button>
                </form>
            </Modal>

            {/* Terima Modal */}
            <Modal open={showTerimaModal} onClose={() => setShowTerimaModal(false)} title="Terima Order">
                <form className="sp-form" onSubmit={onTerima}>
                    <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 8 }}>
                        Terima order <strong>{selectedOrder?.KodeOrder}</strong> dari <strong>{selectedOrder?.NamaProcessor}</strong>
                    </p>
                    <div className="sp-formGrid">
                        <label className="sp-field"><span className="sp-label">Penerima</span><input className="sp-input" value={terimaForm.penerimaOrder} onChange={handleTerimaChange('penerimaOrder')} placeholder="Nama penerima" /></label>
                        <label className="sp-field"><span className="sp-label">Jumlah Diterima</span><input className="sp-input" type="number" value={terimaForm.jumlahDiterima} onChange={handleTerimaChange('jumlahDiterima')} /></label>
                        <label className="sp-field sp-fieldFull"><span className="sp-label">Kondisi</span><textarea className="sp-textarea" value={terimaForm.kondisiTerima} onChange={handleTerimaChange('kondisiTerima')} placeholder="Kondisi barang saat diterima" /></label>
                        <label className="sp-field"><span className="sp-label">Kode Order Processor (opsional)</span><input className="sp-input" value={terimaForm.kodeOrderProcessor} onChange={handleTerimaChange('kodeOrderProcessor')} placeholder="Untuk link blockchain" /></label>
                        <label className="sp-field"><span className="sp-label">Hash Chain Processor (opsional)</span><input className="sp-input" value={terimaForm.processorLastBlockHash} onChange={handleTerimaChange('processorLastBlockHash')} placeholder="Untuk link blockchain" /></label>
                    </div>
                    <button className="sp-btn" type="submit" disabled={loading} style={{ marginTop: 12 }}>{loading ? 'Memproses...' : 'Konfirmasi Terima'}</button>
                </form>
            </Modal>
        </div>
    )
}
