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
    const [form, setForm] = useState({
        namaProcessor: '', alamatProcessor: '', kontakProcessor: '',
        namaProduk: '', jenisProduk: '', jumlahPesanan: '', satuan: 'KG',
        tanggalDibutuhkan: '', hargaSatuan: '', catatan: ''
    })
    const [terimaForm, setTerimaForm] = useState({ penerimaOrder: '', jumlahDiterima: '', kondisiTerima: '', kodeOrderProcessor: '', processorLastBlockHash: '' })

    useEffect(() => { loadOrders() }, [])

    async function loadOrders() {
        try {
            const res = await apiClient.get('/orders')
            setOrders(res.data.data)
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
            setForm({ namaProcessor: '', alamatProcessor: '', kontakProcessor: '', namaProduk: '', jenisProduk: '', jumlahPesanan: '', satuan: 'KG', tanggalDibutuhkan: '', hargaSatuan: '', catatan: '' })
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
                                    <td><span className={`sp-badge ${o.StatusOrder === 'SELESAI' ? 'success' : o.StatusOrder === 'DITERIMA' ? 'info' : o.StatusOrder === 'DITOLAK' ? 'danger' : 'muted'}`}>{o.StatusOrder}</span></td>
                                    <td>{o.TanggalOrder}</td>
                                    <td>
                                        {(o.StatusOrder === 'PENDING' || o.StatusOrder === 'CONFIRMED' || o.StatusOrder === 'DIKIRIM') && (
                                            <button className="sp-btn secondary" style={{ padding: '6px 14px', fontSize: '0.78rem' }}
                                                onClick={() => { setSelectedOrder(o); setTerimaForm({ penerimaOrder: '', jumlahDiterima: String(o.JumlahPesanan), kondisiTerima: '', kodeOrderProcessor: '', processorLastBlockHash: '' }); setShowTerimaModal(true) }}>
                                                Terima
                                            </button>
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
                    <div className="sp-formGrid">
                        <label className="sp-field"><span className="sp-label">Nama Processor</span><input className="sp-input" value={form.namaProcessor} onChange={handleChange('namaProcessor')} required /></label>
                        <label className="sp-field"><span className="sp-label">Kontak</span><input className="sp-input" value={form.kontakProcessor} onChange={handleChange('kontakProcessor')} /></label>
                        <label className="sp-field sp-fieldFull"><span className="sp-label">Alamat Processor</span><input className="sp-input" value={form.alamatProcessor} onChange={handleChange('alamatProcessor')} /></label>
                        <label className="sp-field"><span className="sp-label">Nama Produk</span><input className="sp-input" value={form.namaProduk} onChange={handleChange('namaProduk')} required /></label>
                        <label className="sp-field"><span className="sp-label">Jenis Produk</span><input className="sp-input" value={form.jenisProduk} onChange={handleChange('jenisProduk')} required placeholder="Ayam Potong, Fillet, dll" /></label>
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
