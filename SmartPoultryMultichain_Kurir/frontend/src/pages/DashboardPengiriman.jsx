import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { LoadingState, EmptyState, Modal } from '../components'
import { pengirimanService, kurirService } from '../services'

function DashboardPengiriman() {
    const [shipments, setShipments] = useState([])
    const [kurirs, setKurirs] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showBuktiModal, setShowBuktiModal] = useState(false)
    const [showNotaModal, setShowNotaModal] = useState(false)
    const [selectedShipment, setSelectedShipment] = useState(null)

    const [createForm, setCreateForm] = useState({
        kodeKurir: '', tipePengiriman: 'FARM_TO_PROCESSOR', asalPengirim: '', tujuanPenerima: '',
        alamatAsal: '', alamatTujuan: '', tanggalPickup: '', tanggalEstimasiTiba: '', keterangan: '', referensiEksternal: ''
    })
    const [buktiForm, setBuktiForm] = useState({
        tanggalTerima: '', namaPengirim: '', namaPenerima: '', jumlahBarang: '', beratTotal: '', keterangan: ''
    })
    const [notaForm, setNotaForm] = useState({
        tanggalSampai: '', namaPenerima: '', kondisiBarang: 'BAIK', keterangan: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [shipData, kurirData] = await Promise.all([
                pengirimanService.getAll(),
                kurirService.getAll()
            ])
            setShipments(shipData)
            setKurirs(kurirData.filter(k => k.StatusKurir === 'AKTIF'))
        } catch (error) {
            toast.error('Gagal memuat data')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        try {
            await pengirimanService.create(createForm)
            toast.success('Pengiriman berhasil dibuat + Genesis Block')
            setShowCreateModal(false)
            setCreateForm({
                kodeKurir: '', tipePengiriman: 'FARM_TO_PROCESSOR', asalPengirim: '', tujuanPenerima: '',
                alamatAsal: '', alamatTujuan: '', tanggalPickup: '', tanggalEstimasiTiba: '', keterangan: '', referensiEksternal: ''
            })
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal membuat pengiriman')
        }
    }

    const handleBukti = async (e) => {
        e.preventDefault()
        try {
            await pengirimanService.createBukti(selectedShipment.KodePengiriman, buktiForm)
            toast.success('Bukti tanda terima berhasil dibuat + Pickup Block')
            setShowBuktiModal(false)
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal membuat bukti')
        }
    }

    const handleNota = async (e) => {
        e.preventDefault()
        try {
            await pengirimanService.createNota(selectedShipment.KodePengiriman, notaForm)
            toast.success('Nota pengiriman berhasil dibuat + Delivery Block')
            setShowNotaModal(false)
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal membuat nota')
        }
    }

    const getStatusBadge = (s) => ({
        'PICKUP': 'badge-pickup', 'DALAM_PERJALANAN': 'badge-transit', 'TERKIRIM': 'badge-delivered', 'GAGAL': 'badge-failed'
    }[s] || '')
    const getStatusLabel = (s) => ({
        'PICKUP': 'Pickup', 'DALAM_PERJALANAN': 'Dalam Perjalanan', 'TERKIRIM': 'Terkirim', 'GAGAL': 'Gagal'
    }[s] || s)

    if (loading) return <LoadingState />

    return (
        <div>
            <div className="page-header">
                <h2>Pengiriman</h2>
                <div className="page-header-actions">
                    <button className="solid-button" onClick={() => setShowCreateModal(true)}>
                        + Buat Pengiriman
                    </button>
                </div>
            </div>

            {shipments.length === 0 ? (
                <EmptyState message="Belum ada pengiriman" icon="📦" />
            ) : (
                <div className="table-wrapper">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Kode</th>
                                <th>Tipe</th>
                                <th>Asal</th>
                                <th>Tujuan</th>
                                <th>Kurir</th>
                                <th>Tgl Pickup</th>
                                <th>Status</th>
                                <th>Bukti</th>
                                <th>Nota</th>
                                <th>Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {shipments.map(s => (
                                <tr key={s.KodePengiriman}>
                                    <td style={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{s.KodePengiriman}</td>
                                    <td>
                                        <span className={`badge ${s.TipePengiriman === 'FARM_TO_PROCESSOR' ? 'badge-farm' : 'badge-retailer'}`}>
                                            {s.TipePengiriman === 'FARM_TO_PROCESSOR' ? 'Farm→Proc' : 'Proc→Retail'}
                                        </span>
                                    </td>
                                    <td>{s.AsalPengirim}</td>
                                    <td>{s.TujuanPenerima}</td>
                                    <td>{s.Kurir?.NamaKurir || '—'}</td>
                                    <td>{s.TanggalPickup}</td>
                                    <td><span className={`badge ${getStatusBadge(s.StatusPengiriman)}`}>{getStatusLabel(s.StatusPengiriman)}</span></td>
                                    <td>
                                        {s.BuktiTandaTerima ? (
                                            <span className="badge badge-completed">✓ Ada</span>
                                        ) : (
                                            <span style={{ color: 'rgba(200,215,240,0.35)', fontSize: '.82rem' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        {s.NotaPengirimanKurir ? (
                                            <span className="badge badge-completed">✓ Ada</span>
                                        ) : (
                                            <span style={{ color: 'rgba(200,215,240,0.35)', fontSize: '.82rem' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {!s.BuktiTandaTerima && (
                                                <button className="ghost-button" style={{ fontSize: '.75rem', padding: '4px 8px' }} onClick={() => {
                                                    setSelectedShipment(s)
                                                    setBuktiForm({ tanggalTerima: '', namaPengirim: s.AsalPengirim, namaPenerima: s.Kurir?.NamaKurir || '', jumlahBarang: '', beratTotal: '', keterangan: '' })
                                                    setShowBuktiModal(true)
                                                }}>
                                                    Buat Bukti
                                                </button>
                                            )}
                                            {s.BuktiTandaTerima && !s.NotaPengirimanKurir && (
                                                <button className="solid-button" style={{ fontSize: '.75rem', padding: '4px 8px' }} onClick={() => {
                                                    setSelectedShipment(s)
                                                    setNotaForm({ tanggalSampai: '', namaPenerima: '', kondisiBarang: 'BAIK', keterangan: '' })
                                                    setShowNotaModal(true)
                                                }}>
                                                    Buat Nota
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Shipment Modal */}
            <Modal title="Buat Pengiriman Baru" isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} size="lg">
                <form onSubmit={handleCreate}>
                    <label>
                        Kurir
                        <select value={createForm.kodeKurir} onChange={(e) => setCreateForm({ ...createForm, kodeKurir: e.target.value })} required>
                            <option value="">-- Pilih Kurir --</option>
                            {kurirs.map(k => <option key={k.KodeKurir} value={k.KodeKurir}>{k.NamaKurir}</option>)}
                        </select>
                    </label>
                    <label>
                        Tipe Pengiriman
                        <select value={createForm.tipePengiriman} onChange={(e) => setCreateForm({ ...createForm, tipePengiriman: e.target.value })} required>
                            <option value="FARM_TO_PROCESSOR">Farm → Processor</option>
                            <option value="PROCESSOR_TO_RETAILER">Processor → Retailer</option>
                        </select>
                    </label>
                    <label>
                        Asal Pengirim
                        <input type="text" value={createForm.asalPengirim} onChange={(e) => setCreateForm({ ...createForm, asalPengirim: e.target.value })} placeholder="Nama peternakan / processor" required />
                    </label>
                    <label>
                        Tujuan Penerima
                        <input type="text" value={createForm.tujuanPenerima} onChange={(e) => setCreateForm({ ...createForm, tujuanPenerima: e.target.value })} placeholder="Nama processor / retailer" required />
                    </label>
                    <label>
                        Alamat Asal
                        <input type="text" value={createForm.alamatAsal} onChange={(e) => setCreateForm({ ...createForm, alamatAsal: e.target.value })} placeholder="Alamat asal pengiriman" />
                    </label>
                    <label>
                        Alamat Tujuan
                        <input type="text" value={createForm.alamatTujuan} onChange={(e) => setCreateForm({ ...createForm, alamatTujuan: e.target.value })} placeholder="Alamat tujuan pengiriman" />
                    </label>
                    <label>
                        Tanggal Pickup
                        <input type="date" value={createForm.tanggalPickup} onChange={(e) => setCreateForm({ ...createForm, tanggalPickup: e.target.value })} required />
                    </label>
                    <label>
                        Estimasi Tiba
                        <input type="date" value={createForm.tanggalEstimasiTiba} onChange={(e) => setCreateForm({ ...createForm, tanggalEstimasiTiba: e.target.value })} />
                    </label>
                    <label>
                        Referensi Eksternal
                        <input type="text" value={createForm.referensiEksternal} onChange={(e) => setCreateForm({ ...createForm, referensiEksternal: e.target.value })} placeholder="Kode dari farm/processor" />
                    </label>
                    <label>
                        Keterangan
                        <textarea value={createForm.keterangan} onChange={(e) => setCreateForm({ ...createForm, keterangan: e.target.value })} placeholder="Catatan tambahan" rows="2" />
                    </label>
                    <div className="form-actions">
                        <button type="button" className="ghost-button" onClick={() => setShowCreateModal(false)}>Batal</button>
                        <button type="submit" className="solid-button">Buat Pengiriman</button>
                    </div>
                </form>
            </Modal>

            {/* Bukti Tanda Terima Modal */}
            <Modal title="Bukti Tanda Terima" isOpen={showBuktiModal} onClose={() => setShowBuktiModal(false)}>
                <p style={{ fontSize: '.82rem', color: 'rgba(200,215,240,0.5)', marginBottom: '16px' }}>
                    Pengiriman: {selectedShipment?.KodePengiriman}
                </p>
                <form onSubmit={handleBukti}>
                    <label>
                        Tanggal Terima
                        <input type="date" value={buktiForm.tanggalTerima} onChange={(e) => setBuktiForm({ ...buktiForm, tanggalTerima: e.target.value })} required />
                    </label>
                    <label>
                        Nama Pengirim
                        <input type="text" value={buktiForm.namaPengirim} onChange={(e) => setBuktiForm({ ...buktiForm, namaPengirim: e.target.value })} required />
                    </label>
                    <label>
                        Nama Penerima (Kurir)
                        <input type="text" value={buktiForm.namaPenerima} onChange={(e) => setBuktiForm({ ...buktiForm, namaPenerima: e.target.value })} required />
                    </label>
                    <label>
                        Jumlah Barang
                        <input type="number" value={buktiForm.jumlahBarang} onChange={(e) => setBuktiForm({ ...buktiForm, jumlahBarang: e.target.value })} />
                    </label>
                    <label>
                        Berat Total (kg)
                        <input type="number" step="0.1" value={buktiForm.beratTotal} onChange={(e) => setBuktiForm({ ...buktiForm, beratTotal: e.target.value })} />
                    </label>
                    <label>
                        Keterangan
                        <textarea value={buktiForm.keterangan} onChange={(e) => setBuktiForm({ ...buktiForm, keterangan: e.target.value })} rows="2" />
                    </label>
                    <div className="form-actions">
                        <button type="button" className="ghost-button" onClick={() => setShowBuktiModal(false)}>Batal</button>
                        <button type="submit" className="solid-button">Simpan Bukti</button>
                    </div>
                </form>
            </Modal>

            {/* Nota Pengiriman Modal */}
            <Modal title="Nota Pengiriman" isOpen={showNotaModal} onClose={() => setShowNotaModal(false)}>
                <p style={{ fontSize: '.82rem', color: 'rgba(200,215,240,0.5)', marginBottom: '16px' }}>
                    Pengiriman: {selectedShipment?.KodePengiriman} → {selectedShipment?.TujuanPenerima}
                </p>
                <form onSubmit={handleNota}>
                    <label>
                        Tanggal Sampai
                        <input type="date" value={notaForm.tanggalSampai} onChange={(e) => setNotaForm({ ...notaForm, tanggalSampai: e.target.value })} required />
                    </label>
                    <label>
                        Nama Penerima
                        <input type="text" value={notaForm.namaPenerima} onChange={(e) => setNotaForm({ ...notaForm, namaPenerima: e.target.value })} placeholder="Nama penerima di tujuan" required />
                    </label>
                    <label>
                        Kondisi Barang
                        <select value={notaForm.kondisiBarang} onChange={(e) => setNotaForm({ ...notaForm, kondisiBarang: e.target.value })}>
                            <option value="BAIK">Baik</option>
                            <option value="RUSAK_SEBAGIAN">Rusak Sebagian</option>
                            <option value="RUSAK_TOTAL">Rusak Total</option>
                        </select>
                    </label>
                    <label>
                        Keterangan
                        <textarea value={notaForm.keterangan} onChange={(e) => setNotaForm({ ...notaForm, keterangan: e.target.value })} rows="2" />
                    </label>
                    <div className="form-actions">
                        <button type="button" className="ghost-button" onClick={() => setShowNotaModal(false)}>Batal</button>
                        <button type="submit" className="solid-button">Simpan Nota</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default DashboardPengiriman
