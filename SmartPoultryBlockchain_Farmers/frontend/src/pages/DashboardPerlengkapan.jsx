import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { warehouseService } from '../services'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import './DashboardPage.css'

function DashboardPerlengkapan() {
    const { warehouseId } = useParams()
    const navigate = useNavigate()
    const [warehouse, setWarehouse] = useState(null)
    const [perlengkapan, setPerlengkapan] = useState([])
    const [allPerlengkapan, setAllPerlengkapan] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [addStockModalOpen, setAddStockModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState(null)
    const [formData, setFormData] = useState({
        namaPerlengkapan: '',
        kategoriPerlengkapan: 'PAKAN',
        satuan: 'unit'
    })
    const [stockFormData, setStockFormData] = useState({
        kodePerlengkapan: '',
        jumlahStok: 0
    })
    const [saving, setSaving] = useState(false)

    const fetchData = async () => {
        try {
            setLoading(true)

            if (warehouseId) {
                const warehouseData = await warehouseService.getWarehouseById(warehouseId)
                setWarehouse(warehouseData.data)
                setPerlengkapan(warehouseData.data?.stok || [])
            }

            const allPerlengkapanData = await warehouseService.getAllPerlengkapan()
            setAllPerlengkapan(allPerlengkapanData.data || [])
        } catch (error) {
            console.error('Failed to fetch data:', error)
            toast.error('Gagal memuat data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [warehouseId])

    const openCreateModal = () => {
        setEditingItem(null)
        setFormData({ namaPerlengkapan: '', kategoriPerlengkapan: 'PAKAN', satuan: 'unit' })
        setModalOpen(true)
    }

    const openEditModal = (item) => {
        setEditingItem(item)
        setFormData({
            namaPerlengkapan: item.NamaPerlengkapan || '',
            kategoriPerlengkapan: item.KategoriPerlengkapan || 'PAKAN',
            satuan: item.Satuan || 'unit'
        })
        setModalOpen(true)
    }

    const openAddStockModal = () => {
        setStockFormData({ kodePerlengkapan: '', jumlahStok: 0 })
        setAddStockModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.namaPerlengkapan) {
            toast.error('Nama perlengkapan wajib diisi')
            return
        }

        setSaving(true)
        try {
            if (editingItem) {
                await warehouseService.updatePerlengkapan(editingItem.KodePerlengkapan, formData)
                toast.success('Perlengkapan berhasil diupdate')
            } else {
                await warehouseService.createPerlengkapan(formData)
                toast.success('Perlengkapan berhasil ditambahkan')
            }
            setModalOpen(false)
            fetchData()
        } catch (error) {
            console.error('Save perlengkapan error:', error)
            toast.error('Gagal menyimpan perlengkapan')
        } finally {
            setSaving(false)
        }
    }

    const handleAddStock = async (e) => {
        e.preventDefault()
        if (!stockFormData.kodePerlengkapan || stockFormData.jumlahStok <= 0) {
            toast.error('Pilih perlengkapan dan masukkan jumlah yang valid')
            return
        }

        setSaving(true)
        try {
            await warehouseService.addStock(warehouseId, stockFormData)
            toast.success('Stok berhasil ditambahkan')
            setAddStockModalOpen(false)
            fetchData()
        } catch (error) {
            console.error('Add stock error:', error)
            toast.error('Gagal menambahkan stok')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (item) => {
        if (!confirm(`Hapus "${item.NamaPerlengkapan}"?`)) return

        try {
            await warehouseService.deletePerlengkapan(item.KodePerlengkapan)
            toast.success('Perlengkapan berhasil dihapus')
            fetchData()
        } catch (error) {
            console.error('Delete perlengkapan error:', error)
            toast.error('Gagal menghapus perlengkapan')
        }
    }

    const getCategoryBadge = (category) => {
        const classes = {
            'PAKAN': 'success',
            'OBAT': 'warning',
            'PERALATAN': 'info'
        }
        return <span className={`status-badge ${classes[category] || 'info'}`}>{category}</span>
    }

    const stockColumns = [
        { key: 'NamaPerlengkapan', label: 'Nama Perlengkapan', sortable: true },
        {
            key: 'KategoriPerlengkapan',
            label: 'Kategori',
            sortable: true,
            render: (val) => getCategoryBadge(val)
        },
        { key: 'JumlahStok', label: 'Stok', sortable: true },
        { key: 'Satuan', label: 'Satuan', sortable: true },
        {
            key: 'TanggalMasukPerlengkapan',
            label: 'Tanggal Masuk',
            sortable: true,
            render: (val) => val ? new Date(val).toLocaleDateString('id-ID') : '-'
        }
    ]

    const allPerlengkapanColumns = [
        { key: 'KodePerlengkapan', label: 'Kode', sortable: true },
        { key: 'NamaPerlengkapan', label: 'Nama', sortable: true },
        {
            key: 'KategoriPerlengkapan',
            label: 'Kategori',
            sortable: true,
            render: (val) => getCategoryBadge(val)
        },
        { key: 'Satuan', label: 'Satuan', sortable: true },
        { key: 'totalStok', label: 'Total Stok', sortable: true },
        {
            key: 'actions',
            label: 'Aksi',
            render: (_, row) => (
                <div className="table-actions">
                    <button className="btn-action btn-edit" onClick={(e) => { e.stopPropagation(); openEditModal(row); }}>
                        Edit
                    </button>
                    <button className="btn-action btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(row); }}>
                        Hapus
                    </button>
                </div>
            )
        }
    ]

    if (loading) {
        return (
            <div className="dashboard-page">
                <LoadingState variant="spinner" text="Memuat data..." />
            </div>
        )
    }

    // If viewing specific warehouse stock
    if (warehouseId && warehouse) {
        return (
            <div className="dashboard-page">
                <div className="page-header">
                    <div className="page-title">
                        <button className="btn-secondary" onClick={() => navigate('/dashboard/warehouse')} style={{ marginBottom: '0.5rem' }}>
                            ← Kembali
                        </button>
                        <h1>Stok {warehouse.LokasiWarehouse}</h1>
                        <p>Daftar perlengkapan di warehouse ini</p>
                    </div>
                    <button className="btn-primary" onClick={openAddStockModal}>
                        Tambah Stok
                    </button>
                </div>

                {perlengkapan.length === 0 ? (
                    <EmptyState
                        title="Warehouse Kosong"
                        message="Belum ada stok perlengkapan di warehouse ini"
                        actionLabel="Tambah Stok"
                        onAction={openAddStockModal}
                    />
                ) : (
                    <div className="page-content">
                        <DataTable columns={stockColumns} data={perlengkapan} pageSize={10} />
                    </div>
                )}

                <Modal
                    isOpen={addStockModalOpen}
                    onClose={() => setAddStockModalOpen(false)}
                    title="Tambah Stok ke Warehouse"
                    size="medium"
                >
                    <form onSubmit={handleAddStock} className="modal-form">
                        <div className="form-group">
                            <label htmlFor="kodePerlengkapan">Perlengkapan *</label>
                            <select
                                id="kodePerlengkapan"
                                value={stockFormData.kodePerlengkapan}
                                onChange={(e) => setStockFormData({ ...stockFormData, kodePerlengkapan: e.target.value })}
                                required
                            >
                                <option value="">Pilih Perlengkapan</option>
                                {allPerlengkapan.map((p) => (
                                    <option key={p.KodePerlengkapan} value={p.KodePerlengkapan}>
                                        {p.NamaPerlengkapan} ({p.KategoriPerlengkapan})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="jumlahStok">Jumlah Stok *</label>
                            <input
                                type="number"
                                id="jumlahStok"
                                value={stockFormData.jumlahStok}
                                onChange={(e) => setStockFormData({ ...stockFormData, jumlahStok: parseInt(e.target.value) || 0 })}
                                min="1"
                                required
                            />
                        </div>
                        <div className="modal-actions">
                            <button type="button" className="btn-secondary" onClick={() => setAddStockModalOpen(false)}>
                                Batal
                            </button>
                            <button type="submit" className="btn-primary" disabled={saving}>
                                {saving ? 'Menyimpan...' : 'Tambah Stok'}
                            </button>
                        </div>
                    </form>
                </Modal>
            </div>
        )
    }

    // Default: Show all perlengkapan
    return (
        <div className="dashboard-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Master Perlengkapan</h1>
                    <p>Kelola daftar perlengkapan peternakan</p>
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    Tambah Perlengkapan
                </button>
            </div>

            {allPerlengkapan.length === 0 ? (
                <EmptyState
                    title="Belum Ada Perlengkapan"
                    message="Tambahkan perlengkapan untuk dikelola di warehouse"
                    actionLabel="Tambah Perlengkapan"
                    onAction={openCreateModal}
                />
            ) : (
                <div className="page-content">
                    <DataTable columns={allPerlengkapanColumns} data={allPerlengkapan} pageSize={10} />
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingItem ? 'Edit Perlengkapan' : 'Tambah Perlengkapan'}
                size="medium"
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="namaPerlengkapan">Nama Perlengkapan *</label>
                        <input
                            type="text"
                            id="namaPerlengkapan"
                            value={formData.namaPerlengkapan}
                            onChange={(e) => setFormData({ ...formData, namaPerlengkapan: e.target.value })}
                            placeholder="Contoh: Pakan BR1, Vitamin B Complex"
                            required
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="kategoriPerlengkapan">Kategori *</label>
                            <select
                                id="kategoriPerlengkapan"
                                value={formData.kategoriPerlengkapan}
                                onChange={(e) => setFormData({ ...formData, kategoriPerlengkapan: e.target.value })}
                            >
                                <option value="PAKAN">Pakan</option>
                                <option value="OBAT">Obat</option>
                                <option value="PERALATAN">Peralatan</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="satuan">Satuan</label>
                            <input
                                type="text"
                                id="satuan"
                                value={formData.satuan}
                                onChange={(e) => setFormData({ ...formData, satuan: e.target.value })}
                                placeholder="kg, liter, unit"
                            />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                            Batal
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Menyimpan...' : (editingItem ? 'Update' : 'Simpan')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default DashboardPerlengkapan
