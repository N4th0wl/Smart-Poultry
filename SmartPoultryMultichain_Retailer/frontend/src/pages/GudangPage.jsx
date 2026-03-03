import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

export default function GudangPage() {
    const { showToast } = useToast()
    const [items, setItems] = useState([])
    const [orders, setOrders] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ idOrder: '', namaProduk: '', jenisProduk: '', jumlahMasuk: '', satuan: 'KG', hargaJual: '', lokasiGudang: '', tanggalKadaluarsa: '' })

    useEffect(() => { loadData() }, [])
    async function loadData() {
        try {
            const [g, o] = await Promise.all([apiClient.get('/gudang'), apiClient.get('/orders')])
            setItems(g.data.data); setOrders(o.data.data.filter(x => x.StatusOrder === 'DITERIMA' || x.StatusOrder === 'SELESAI'))
        } catch { }
    }
    const hc = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))
    async function onSubmit(e) {
        e.preventDefault(); setLoading(true)
        try {
            await apiClient.post('/gudang', { ...form, idOrder: form.idOrder ? Number(form.idOrder) : null, jumlahMasuk: Number(form.jumlahMasuk), hargaJual: Number(form.hargaJual) || 0 })
            showToast({ title: 'Berhasil', description: 'Stok ditambahkan.', status: 'success' })
            setShowModal(false); loadData()
        } catch (err) { showToast({ title: 'Gagal', description: err.response?.data?.message || 'Error', status: 'error' }) }
        finally { setLoading(false) }
    }
    const sc = (s) => s === 'TERSEDIA' ? 'success' : s === 'HAMPIR_HABIS' ? 'warning' : 'danger'
    return (
        <div>
            <PageHeader title="Gudang / Stok" subtitle="Kelola stok barang" actions={<button className="sp-btn" onClick={() => setShowModal(true)}>+ Tambah Stok</button>} />
            <div className="sp-card"><div className="sp-cardBody">
                <table className="sp-table"><thead><tr><th>Kode</th><th>Produk</th><th>Jenis</th><th>Masuk</th><th>Keluar</th><th>Sisa</th><th>Harga</th><th>Status</th></tr></thead>
                    <tbody>{items.length > 0 ? items.map(g => (
                        <tr key={g.IdGudang}><td><strong>{g.KodeGudang}</strong></td><td>{g.NamaProduk}</td><td>{g.JenisProduk}</td>
                            <td>{g.StokMasuk} {g.Satuan}</td><td>{g.StokKeluar} {g.Satuan}</td><td><strong>{g.StokSaatIni}</strong></td>
                            <td>Rp {Number(g.HargaJual).toLocaleString('id-ID')}</td><td><span className={`sp-badge ${sc(g.StatusStok)}`}>{g.StatusStok}</span></td></tr>
                    )) : <tr><td colSpan={8} className="sp-empty">Belum ada stok.</td></tr>}</tbody></table>
            </div></div>
            <Modal open={showModal} onClose={() => setShowModal(false)} title="Tambah Stok">
                <form className="sp-form" onSubmit={onSubmit}><div className="sp-formGrid">
                    <label className="sp-field sp-fieldFull"><span className="sp-label">Order Terkait</span><select className="sp-input" value={form.idOrder} onChange={hc('idOrder')}><option value="">Tanpa order</option>{orders.map(o => <option key={o.IdOrder} value={o.IdOrder}>{o.KodeOrder} — {o.NamaProduk}</option>)}</select></label>
                    <label className="sp-field"><span className="sp-label">Nama Produk</span><input className="sp-input" value={form.namaProduk} onChange={hc('namaProduk')} required /></label>
                    <label className="sp-field"><span className="sp-label">Jenis</span><input className="sp-input" value={form.jenisProduk} onChange={hc('jenisProduk')} required /></label>
                    <label className="sp-field"><span className="sp-label">Jumlah</span><input className="sp-input" type="number" value={form.jumlahMasuk} onChange={hc('jumlahMasuk')} required min="1" /></label>
                    <label className="sp-field"><span className="sp-label">Satuan</span><select className="sp-input" value={form.satuan} onChange={hc('satuan')}><option>KG</option><option>PCS</option><option>PACK</option><option>BOX</option></select></label>
                    <label className="sp-field"><span className="sp-label">Harga Jual</span><input className="sp-input" type="number" value={form.hargaJual} onChange={hc('hargaJual')} /></label>
                    <label className="sp-field"><span className="sp-label">Lokasi</span><input className="sp-input" value={form.lokasiGudang} onChange={hc('lokasiGudang')} /></label>
                    <label className="sp-field"><span className="sp-label">Kadaluarsa</span><input className="sp-input" type="date" value={form.tanggalKadaluarsa} onChange={hc('tanggalKadaluarsa')} /></label>
                </div><button className="sp-btn" type="submit" disabled={loading} style={{ marginTop: 12 }}>{loading ? 'Menyimpan...' : 'Simpan'}</button></form>
            </Modal>
        </div>
    )
}
