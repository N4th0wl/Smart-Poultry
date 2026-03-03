import { useState, useEffect } from 'react'
import { supplierService } from '../services'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import './DashboardPage.css'

function DashboardSupplier() {
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [formData, setFormData] = useState({ namaSupplier: '', kontakSupplier: '' })
    const [saving, setSaving] = useState(false)

    const fetchSuppliers = async () => {
        try {
            setLoading(true)
            const data = await supplierService.getSuppliers()
            setSuppliers(data || [])
        } catch (error) {
            console.error('Failed to fetch suppliers:', error)
            toast.error('Gagal memuat data supplier')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSuppliers()
    }, [])

    const openCreateModal = () => {
        setEditingSupplier(null)
        setFormData({ namaSupplier: '', kontakSupplier: '' })
        setModalOpen(true)
    }

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier)
        setFormData({
            namaSupplier: supplier.NamaSupplier || '',
            kontakSupplier: supplier.KontakSupplier || ''
        })
        setModalOpen(true)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.namaSupplier || !formData.kontakSupplier) {
            toast.error('Nama dan kontak supplier wajib diisi')
            return
        }

        setSaving(true)
        try {
            if (editingSupplier) {
                await supplierService.updateSupplier(editingSupplier.KodeSupplier, formData)
                toast.success('Supplier berhasil diupdate')
            } else {
                await supplierService.createSupplier(formData)
                toast.success('Supplier berhasil ditambahkan')
            }
            setModalOpen(false)
            fetchSuppliers()
        } catch (error) {
            console.error('Save supplier error:', error)
            toast.error('Gagal menyimpan supplier')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (supplier) => {
        if (!confirm(`Hapus supplier "${supplier.NamaSupplier}"?`)) return

        try {
            await supplierService.deleteSupplier(supplier.KodeSupplier)
            toast.success('Supplier berhasil dihapus')
            fetchSuppliers()
        } catch (error) {
            console.error('Delete supplier error:', error)
            toast.error('Gagal menghapus supplier')
        }
    }

    const columns = [
        { key: 'KodeSupplier', label: 'Kode', sortable: true },
        { key: 'NamaSupplier', label: 'Nama Supplier', sortable: true },
        { key: 'KontakSupplier', label: 'Kontak', sortable: true },
        {
            key: 'actions',
            label: 'Aksi',
            render: (_, row) => (
                <div className="table-actions">
                    <button
                        className="btn-action btn-edit"
                        onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
                    >
                        Edit
                    </button>
                    <button
                        className="btn-action btn-delete"
                        onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                    >
                        Hapus
                    </button>
                </div>
            )
        }
    ]

    if (loading) {
        return (
            <div className="dashboard-page">
                <LoadingState variant="spinner" text="Memuat data supplier..." />
            </div>
        )
    }

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Manajemen Supplier</h1>
                    <p>Kelola data supplier peternakan Anda</p>
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    Tambah Supplier
                </button>
            </div>

            {suppliers.length === 0 ? (
                <EmptyState
                    title="Belum Ada Supplier"
                    message="Tambahkan supplier pertama Anda untuk memulai"
                    actionLabel="Tambah Supplier"
                    onAction={openCreateModal}
                />
            ) : (
                <div className="page-content">
                    <DataTable
                        columns={columns}
                        data={suppliers}
                        pageSize={10}
                    />
                </div>
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingSupplier ? 'Edit Supplier' : 'Tambah Supplier'}
                size="medium"
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label htmlFor="namaSupplier">Nama Supplier *</label>
                        <input
                            type="text"
                            id="namaSupplier"
                            value={formData.namaSupplier}
                            onChange={(e) => setFormData({ ...formData, namaSupplier: e.target.value })}
                            placeholder="Masukkan nama supplier"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="kontakSupplier">Kontak Supplier *</label>
                        <input
                            type="text"
                            id="kontakSupplier"
                            value={formData.kontakSupplier}
                            onChange={(e) => setFormData({ ...formData, kontakSupplier: e.target.value })}
                            placeholder="No. HP atau email"
                            required
                        />
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                            Batal
                        </button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Menyimpan...' : (editingSupplier ? 'Update' : 'Simpan')}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default DashboardSupplier
