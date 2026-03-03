import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

export default function NotaPenerimaanPage() {
    const { showToast } = useToast()
    const [notes, setNotes] = useState([])
    const [orders, setOrders] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({
        idOrder: '', kodeNotaPengirimanProcessor: '', namaPengirim: '', namaPenerima: '',
        jumlahDikirim: '', jumlahDiterima: '', jumlahRusak: '0',
        kondisiBarang: 'BAIK', suhuSaatTerima: '', catatanPenerimaan: ''
    })

    useEffect(() => { loadData() }, [])

    async function loadData() {
        try {
            const [notesRes, ordersRes] = await Promise.all([
                apiClient.get('/nota-penerimaan'),
                apiClient.get('/orders')
            ])
            setNotes(notesRes.data.data)
            setOrders(ordersRes.data.data.filter(o => o.StatusOrder === 'DITERIMA'))
        } catch { /* noop */ }
    }

    const handleChange = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

    async function onSubmit(e) {
        e.preventDefault()
        setLoading(true)
        try {
            await apiClient.post('/nota-penerimaan', {
                ...form,
                idOrder: Number(form.idOrder),
                jumlahDikirim: Number(form.jumlahDikirim) || null,
                jumlahDiterima: Number(form.jumlahDiterima),
                jumlahRusak: Number(form.jumlahRusak) || 0,
                suhuSaatTerima: form.suhuSaatTerima ? Number(form.suhuSaatTerima) : null,
            })
            showToast({ title: 'Berhasil', description: 'Nota penerimaan berhasil dibuat.', status: 'success' })
            setShowModal(false)
            setForm({ idOrder: '', kodeNotaPengirimanProcessor: '', namaPengirim: '', namaPenerima: '', jumlahDikirim: '', jumlahDiterima: '', jumlahRusak: '0', kondisiBarang: 'BAIK', suhuSaatTerima: '', catatanPenerimaan: '' })
            loadData()
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal membuat nota.', status: 'error' })
        } finally { setLoading(false) }
    }

    return (
        <div>
            <PageHeader title="Nota Penerimaan" subtitle="Bukti penerimaan barang dari processor" actions={
                <button className="sp-btn" onClick={() => setShowModal(true)}>+ Buat Nota</button>
            } />

            <div className="sp-card">
                <div className="sp-cardBody">
                    <table className="sp-table">
                        <thead>
                            <tr><th>Kode Nota</th><th>Order</th><th>Pengirim</th><th>Penerima</th><th>Diterima</th><th>Rusak</th><th>Kondisi</th><th>Tanggal</th></tr>
                        </thead>
                        <tbody>
                            {notes.length > 0 ? notes.map(n => (
                                <tr key={n.IdNotaPenerimaan}>
                                    <td><strong>{n.KodeNotaPenerimaan}</strong></td>
                                    <td>{n.order?.KodeOrder || '-'}</td>
                                    <td>{n.NamaPengirim}</td>
                                    <td>{n.NamaPenerima}</td>
                                    <td>{n.JumlahDiterima}</td>
                                    <td>{n.JumlahRusak}</td>
                                    <td><span className={`sp-badge ${n.KondisiBarang === 'BAIK' ? 'success' : n.KondisiBarang === 'CUKUP' ? 'warning' : 'danger'}`}>{n.KondisiBarang}</span></td>
                                    <td>{n.TanggalPenerimaan}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="sp-empty">Belum ada nota penerimaan.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="Buat Nota Penerimaan">
                <form className="sp-form" onSubmit={onSubmit}>
                    <div className="sp-formGrid">
                        <label className="sp-field sp-fieldFull"><span className="sp-label">Order</span>
                            <select className="sp-input" value={form.idOrder} onChange={handleChange('idOrder')} required>
                                <option value="">Pilih order...</option>
                                {orders.map(o => <option key={o.IdOrder} value={o.IdOrder}>{o.KodeOrder} — {o.NamaProcessor} ({o.NamaProduk})</option>)}
                            </select>
                        </label>
                        <label className="sp-field"><span className="sp-label">Nota Pengiriman Proc. (opsional)</span><input className="sp-input" value={form.kodeNotaPengirimanProcessor} onChange={handleChange('kodeNotaPengirimanProcessor')} /></label>
                        <label className="sp-field"><span className="sp-label">Nama Pengirim</span><input className="sp-input" value={form.namaPengirim} onChange={handleChange('namaPengirim')} /></label>
                        <label className="sp-field"><span className="sp-label">Nama Penerima</span><input className="sp-input" value={form.namaPenerima} onChange={handleChange('namaPenerima')} required /></label>
                        <label className="sp-field"><span className="sp-label">Jumlah Dikirim</span><input className="sp-input" type="number" value={form.jumlahDikirim} onChange={handleChange('jumlahDikirim')} /></label>
                        <label className="sp-field"><span className="sp-label">Jumlah Diterima</span><input className="sp-input" type="number" value={form.jumlahDiterima} onChange={handleChange('jumlahDiterima')} required /></label>
                        <label className="sp-field"><span className="sp-label">Jumlah Rusak</span><input className="sp-input" type="number" value={form.jumlahRusak} onChange={handleChange('jumlahRusak')} /></label>
                        <label className="sp-field"><span className="sp-label">Kondisi Barang</span><select className="sp-input" value={form.kondisiBarang} onChange={handleChange('kondisiBarang')}><option>BAIK</option><option>CUKUP</option><option>BURUK</option></select></label>
                        <label className="sp-field"><span className="sp-label">Suhu Saat Terima (°C)</span><input className="sp-input" type="number" step="0.1" value={form.suhuSaatTerima} onChange={handleChange('suhuSaatTerima')} /></label>
                        <label className="sp-field sp-fieldFull"><span className="sp-label">Catatan</span><textarea className="sp-textarea" value={form.catatanPenerimaan} onChange={handleChange('catatanPenerimaan')} /></label>
                    </div>
                    <button className="sp-btn" type="submit" disabled={loading} style={{ marginTop: 12 }}>{loading ? 'Menyimpan...' : 'Simpan Nota'}</button>
                </form>
            </Modal>
        </div>
    )
}
