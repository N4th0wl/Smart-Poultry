import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

export default function PenjualanPage() {
    const { showToast } = useToast()
    const [sales, setSales] = useState([])
    const [gudang, setGudang] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState({ namaPembeli: '', metodePembayaran: 'TUNAI', catatan: '' })
    const [cartItems, setCartItems] = useState([{ idGudang: '', jumlahJual: '', hargaSatuan: '' }])

    useEffect(() => { loadData() }, [])
    async function loadData() {
        try {
            const [s, g] = await Promise.all([apiClient.get('/penjualan'), apiClient.get('/gudang')])
            setSales(s.data.data); setGudang(g.data.data.filter(x => x.StokSaatIni > 0))
        } catch { }
    }

    function addItem() { setCartItems(p => [...p, { idGudang: '', jumlahJual: '', hargaSatuan: '' }]) }
    function removeItem(i) { setCartItems(p => p.filter((_, idx) => idx !== i)) }
    function updateItem(i, f, v) { setCartItems(p => { const n = [...p]; n[i] = { ...n[i], [f]: v }; return n }) }

    async function onSubmit(e) {
        e.preventDefault(); setLoading(true)
        const items = cartItems.filter(x => x.idGudang && x.jumlahJual).map(x => ({
            idGudang: Number(x.idGudang), jumlahJual: Number(x.jumlahJual), hargaSatuan: Number(x.hargaSatuan) || undefined
        }))
        if (!items.length) { showToast({ title: 'Error', description: 'Tambahkan item.', status: 'warning' }); setLoading(false); return }
        try {
            await apiClient.post('/penjualan', { ...form, items })
            showToast({ title: 'Berhasil', description: 'Penjualan dicatat.', status: 'success' })
            setShowModal(false); setCartItems([{ idGudang: '', jumlahJual: '', hargaSatuan: '' }]); loadData()
        } catch (err) { showToast({ title: 'Gagal', description: err.response?.data?.message || 'Error', status: 'error' }) }
        finally { setLoading(false) }
    }

    return (
        <div>
            <PageHeader title="Penjualan" subtitle="Catat penjualan barang" actions={<button className="sp-btn" onClick={() => setShowModal(true)}>+ Catat Penjualan</button>} />
            <div className="sp-card"><div className="sp-cardBody">
                <table className="sp-table"><thead><tr><th>Kode</th><th>Pembeli</th><th>Item</th><th>Total</th><th>Metode</th><th>Status</th><th>Tanggal</th></tr></thead>
                    <tbody>{sales.length > 0 ? sales.map(s => (
                        <tr key={s.IdPenjualan}><td><strong>{s.KodePenjualan}</strong></td><td>{s.NamaPembeli || 'Umum'}</td>
                            <td>{s.TotalItem}</td><td>Rp {Number(s.TotalHarga).toLocaleString('id-ID')}</td>
                            <td><span className="sp-chip">{s.MetodePembayaran}</span></td>
                            <td><span className={`sp-badge ${s.StatusPenjualan === 'SELESAI' ? 'success' : 'danger'}`}>{s.StatusPenjualan}</span></td>
                            <td>{s.TanggalPenjualan}</td></tr>
                    )) : <tr><td colSpan={7} className="sp-empty">Belum ada penjualan.</td></tr>}</tbody></table>
            </div></div>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="Catat Penjualan">
                <form className="sp-form" onSubmit={onSubmit}>
                    <div className="sp-formGrid">
                        <label className="sp-field"><span className="sp-label">Pembeli</span><input className="sp-input" value={form.namaPembeli} onChange={e => setForm(p => ({ ...p, namaPembeli: e.target.value }))} placeholder="Umum" /></label>
                        <label className="sp-field"><span className="sp-label">Metode</span><select className="sp-input" value={form.metodePembayaran} onChange={e => setForm(p => ({ ...p, metodePembayaran: e.target.value }))}><option>TUNAI</option><option>TRANSFER</option><option>QRIS</option><option>LAINNYA</option></select></label>
                    </div>
                    <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 700, fontSize: '0.9rem' }}>Item Penjualan</div>
                    {cartItems.map((item, i) => (
                        <div key={i} className="sp-formGrid" style={{ marginBottom: 8, padding: 12, background: 'var(--bg-soft)', borderRadius: 12 }}>
                            <label className="sp-field sp-fieldFull"><span className="sp-label">Produk</span>
                                <select className="sp-input" value={item.idGudang} onChange={e => { updateItem(i, 'idGudang', e.target.value); const g = gudang.find(x => x.IdGudang === Number(e.target.value)); if (g) updateItem(i, 'hargaSatuan', String(g.HargaJual)) }}>
                                    <option value="">Pilih produk...</option>
                                    {gudang.map(g => <option key={g.IdGudang} value={g.IdGudang}>{g.NamaProduk} (Stok: {g.StokSaatIni})</option>)}
                                </select>
                            </label>
                            <label className="sp-field"><span className="sp-label">Jumlah</span><input className="sp-input" type="number" value={item.jumlahJual} onChange={e => updateItem(i, 'jumlahJual', e.target.value)} min="1" required /></label>
                            <label className="sp-field"><span className="sp-label">Harga</span><input className="sp-input" type="number" value={item.hargaSatuan} onChange={e => updateItem(i, 'hargaSatuan', e.target.value)} /></label>
                            {cartItems.length > 1 && <button type="button" className="sp-btn danger" style={{ padding: '6px 12px', fontSize: '0.78rem', alignSelf: 'end' }} onClick={() => removeItem(i)}>Hapus</button>}
                        </div>
                    ))}
                    <button type="button" className="sp-btn secondary" style={{ padding: '8px 16px', fontSize: '0.82rem' }} onClick={addItem}>+ Tambah Item</button>
                    <label className="sp-field" style={{ marginTop: 12 }}><span className="sp-label">Catatan</span><textarea className="sp-textarea" value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} /></label>
                    <button className="sp-btn" type="submit" disabled={loading} style={{ marginTop: 12 }}>{loading ? 'Menyimpan...' : 'Simpan Penjualan'}</button>
                </form>
            </Modal>
        </div>
    )
}
