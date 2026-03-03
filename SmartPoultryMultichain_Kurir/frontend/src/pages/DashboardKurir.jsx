import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { LoadingState, EmptyState, Modal, DataTable } from '../components'
import { kurirService } from '../services'

function DashboardKurir() {
    const [kurirs, setKurirs] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editKurir, setEditKurir] = useState(null)
    const [form, setForm] = useState({ namaKurir: '', noTelp: '' })

    useEffect(() => {
        loadKurirs()
    }, [])

    const loadKurirs = async () => {
        try {
            const data = await kurirService.getAll()
            setKurirs(data)
        } catch (error) {
            toast.error('Gagal memuat data kurir')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editKurir) {
                await kurirService.update(editKurir.KodeKurir, form)
                toast.success('Kurir berhasil diperbarui')
            } else {
                await kurirService.create(form)
                toast.success('Kurir berhasil ditambahkan')
            }
            setShowModal(false)
            setEditKurir(null)
            setForm({ namaKurir: '', noTelp: '' })
            loadKurirs()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal menyimpan kurir')
        }
    }

    const handleEdit = (kurir) => {
        setEditKurir(kurir)
        setForm({ namaKurir: kurir.NamaKurir, noTelp: kurir.NoTelp || '' })
        setShowModal(true)
    }

    const handleDelete = async (kurir) => {
        if (!confirm(`Nonaktifkan kurir ${kurir.NamaKurir}?`)) return
        try {
            await kurirService.remove(kurir.KodeKurir)
            toast.success('Kurir berhasil dinonaktifkan')
            loadKurirs()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal menonaktifkan kurir')
        }
    }

    const columns = [
        { key: 'KodeKurir', label: 'Kode', render: (v) => <span style={{ fontFamily: 'monospace', fontSize: '.82rem' }}>{v}</span> },
        { key: 'NamaKurir', label: 'Nama Kurir' },
        { key: 'NoTelp', label: 'No. Telp' },
        {
            key: 'StatusKurir', label: 'Status',
            render: (v) => <span className={`badge ${v === 'AKTIF' ? 'badge-active' : 'badge-failed'}`}>{v}</span>
        },
        {
            key: 'actions', label: 'Aksi',
            render: (_, row) => (
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="ghost-button" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>Edit</button>
                    {row.StatusKurir === 'AKTIF' && (
                        <button className="ghost-button" style={{ color: '#f87171' }} onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>Nonaktifkan</button>
                    )}
                </div>
            )
        }
    ]

    if (loading) return <LoadingState />

    return (
        <div>
            <div className="page-header">
                <h2>Kurir</h2>
                <div className="page-header-actions">
                    <button className="solid-button" onClick={() => { setEditKurir(null); setForm({ namaKurir: '', noTelp: '' }); setShowModal(true); }}>
                        + Tambah Kurir
                    </button>
                </div>
            </div>

            {kurirs.length === 0 ? (
                <EmptyState message="Belum ada kurir terdaftar" icon="🚛" />
            ) : (
                <DataTable columns={columns} data={kurirs} />
            )}

            <Modal title={editKurir ? 'Edit Kurir' : 'Tambah Kurir'} isOpen={showModal} onClose={() => setShowModal(false)}>
                <form onSubmit={handleSubmit}>
                    <label>
                        Nama Kurir
                        <input
                            type="text"
                            value={form.namaKurir}
                            onChange={(e) => setForm({ ...form, namaKurir: e.target.value })}
                            placeholder="Nama lengkap kurir"
                            required
                        />
                    </label>
                    <label>
                        No. Telepon
                        <input
                            type="text"
                            value={form.noTelp}
                            onChange={(e) => setForm({ ...form, noTelp: e.target.value })}
                            placeholder="08xxxxxxxxxx"
                        />
                    </label>
                    <div className="form-actions">
                        <button type="button" className="ghost-button" onClick={() => setShowModal(false)}>Batal</button>
                        <button type="submit" className="solid-button">{editKurir ? 'Simpan' : 'Tambah'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default DashboardKurir
