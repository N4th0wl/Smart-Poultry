import { useEffect, useState, useMemo } from 'react'
import PageHeader from '../components/PageHeader'
import Modal from '../components/Modal'
import { useToast } from '../components/ToastProvider'
import apiClient from '../services/apiClient'

const defaultForm = {
    namaPeternakan: '', alamatPeternakan: '', kontakPeternakan: '',
    jenisAyam: '', jumlahPesanan: '', satuan: 'EKOR',
    tanggalOrder: '', tanggalDibutuhkan: '', hargaSatuan: '', catatan: '',
}

const defaultTerimaForm = {
    penerimaOrder: '', jumlahDiterima: '', kondisiTerima: '', tanggalDiterima: '',
}

export default function Orders() {
    const [orders, setOrders] = useState([])
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isTerimaModalOpen, setIsTerimaModalOpen] = useState(false)
    const [form, setForm] = useState(defaultForm)
    const [terimaForm, setTerimaForm] = useState(defaultTerimaForm)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [search, setSearch] = useState('')
    const { showToast } = useToast()

    const loadOrders = async () => {
        try {
            const res = await apiClient.get('/orders')
            setOrders(res.data.data)
        } catch (err) {
            showToast({ title: 'Error', description: 'Gagal memuat data order.', status: 'error' })
        }
    }

    useEffect(() => { loadOrders() }, [])

    const filtered = useMemo(() => {
        if (!search.trim()) return orders
        const q = search.toLowerCase()
        return orders.filter((o) =>
            o.KodeOrder?.toLowerCase().includes(q) ||
            o.NamaPeternakan?.toLowerCase().includes(q) ||
            o.JenisAyam?.toLowerCase().includes(q) ||
            o.StatusOrder?.toLowerCase().includes(q)
        )
    }, [orders, search])

    const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))
    const handleTerimaChange = (field) => (e) => setTerimaForm((p) => ({ ...p, [field]: e.target.value }))

    const isFormValid = useMemo(() => {
        return form.namaPeternakan.trim() && form.jenisAyam.trim() && form.jumlahPesanan && form.tanggalOrder && form.tanggalDibutuhkan
    }, [form])

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!isFormValid) return
        try {
            await apiClient.post('/orders', form)
            showToast({ title: 'Berhasil', description: 'Order berhasil dibuat.', status: 'success' })
            setForm(defaultForm)
            setIsModalOpen(false)
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
            showToast({ title: 'Berhasil', description: 'Order berhasil diterima & genesis block dibuat.', status: 'success' })
            setTerimaForm(defaultTerimaForm)
            setIsTerimaModalOpen(false)
            setSelectedOrder(null)
            loadOrders()
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

    return (
        <div>
            <PageHeader
                title="Order ke Peternakan"
                subtitle="Kelola pesanan ayam dari peternakan"
                actions={<button className="sp-btn" type="button" onClick={() => setIsModalOpen(true)}>+ Tambah Order</button>}
            />

            <div className="sp-card">
                <div className="sp-cardHeader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                    <span>Daftar Order</span>
                    <input className="sp-searchInput" placeholder="Cari order..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ maxWidth: 240 }} />
                </div>
                <div className="sp-cardBody" style={{ overflowX: 'auto' }}>
                    <table className="sp-table">
                        <thead>
                            <tr>
                                <th>Kode</th>
                                <th>Peternakan</th>
                                <th>Jenis Ayam</th>
                                <th>Jumlah</th>
                                <th>Tgl Order</th>
                                <th>Status</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map((o) => (
                                <tr key={o.IdOrder}>
                                    <td><strong>{o.KodeOrder}</strong></td>
                                    <td>{o.NamaPeternakan}</td>
                                    <td>{o.JenisAyam}</td>
                                    <td>{o.JumlahPesanan} {o.Satuan}</td>
                                    <td>{o.TanggalOrder}</td>
                                    <td><span className={`sp-badge ${o.StatusOrder === 'SELESAI' ? 'success' : o.StatusOrder === 'DITERIMA' ? 'info' : o.StatusOrder === 'DITOLAK' ? 'danger' : 'muted'}`}>{o.StatusOrder}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {(o.StatusOrder === 'CONFIRMED' || o.StatusOrder === 'DIKIRIM') && (
                                                <button className="sp-btn" style={{ height: 32, fontSize: 12, padding: '0 10px' }} onClick={() => openTerimaModal(o)}>Terima</button>
                                            )}
                                            {o.StatusOrder === 'PENDING' && (
                                                <button className="sp-btn danger" style={{ height: 32, fontSize: 12, padding: '0 10px' }} onClick={() => handleDelete(o.IdOrder)}>Hapus</button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={7} className="sp-empty">Belum ada order.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Order Modal */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Buat Order Baru" footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" type="button" onClick={() => setIsModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="order-form" disabled={!isFormValid}>Simpan</button>
                </div>
            }>
                <form id="order-form" className="sp-formGrid" onSubmit={handleSubmit}>
                    <label className="sp-field"><span className="sp-label">Nama Peternakan *</span><input className="sp-input" value={form.namaPeternakan} onChange={handleChange('namaPeternakan')} required /></label>
                    <label className="sp-field"><span className="sp-label">Alamat Peternakan</span><input className="sp-input" value={form.alamatPeternakan} onChange={handleChange('alamatPeternakan')} /></label>
                    <label className="sp-field"><span className="sp-label">Kontak Peternakan</span><input className="sp-input" value={form.kontakPeternakan} onChange={handleChange('kontakPeternakan')} /></label>
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

            {/* Terima Order Modal */}
            <Modal open={isTerimaModalOpen} onClose={() => setIsTerimaModalOpen(false)} title={`Terima Order ${selectedOrder?.KodeOrder || ''}`} footer={
                <div className="sp-modalActions">
                    <button className="sp-btn secondary" type="button" onClick={() => setIsTerimaModalOpen(false)}>Batal</button>
                    <button className="sp-btn" type="submit" form="terima-form">Terima Order</button>
                </div>
            }>
                <form id="terima-form" className="sp-formGrid" onSubmit={handleTerima}>
                    <label className="sp-field"><span className="sp-label">Penerima</span><input className="sp-input" value={terimaForm.penerimaOrder} onChange={handleTerimaChange('penerimaOrder')} /></label>
                    <label className="sp-field"><span className="sp-label">Jumlah Diterima</span><input className="sp-input" type="number" value={terimaForm.jumlahDiterima} onChange={handleTerimaChange('jumlahDiterima')} /></label>
                    <label className="sp-field"><span className="sp-label">Tanggal Diterima</span><input className="sp-input" type="date" value={terimaForm.tanggalDiterima} onChange={handleTerimaChange('tanggalDiterima')} /></label>
                    <label className="sp-field"><span className="sp-label">Kondisi</span><input className="sp-input" value={terimaForm.kondisiTerima} onChange={handleTerimaChange('kondisiTerima')} /></label>
                </form>
            </Modal>
        </div>
    )
}
