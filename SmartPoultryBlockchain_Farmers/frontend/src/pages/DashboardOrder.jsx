import { useState, useEffect } from 'react'
import { orderService, supplierService, warehouseService } from '../services'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import './DashboardPage.css'

function DashboardOrder() {
  const [orders, setOrders] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [perlengkapanList, setPerlengkapanList] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [formData, setFormData] = useState({
    kodeSupplier: '',
    tanggalOrder: '',
    statusOrder: 'PROSES',
    kodeWarehouse: '',
    namaPenerima: '',
    details: [],
    docDetails: [],
    obatDetails: []
  })
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [ordersData, suppliersData, perlengkapanData, warehouseData] = await Promise.all([
        orderService.getOrders(),
        supplierService.getSuppliers(),
        warehouseService.getAllPerlengkapan(),
        warehouseService.getWarehouses()
      ])
      setOrders(ordersData || [])
      setSuppliers(suppliersData || [])
      setPerlengkapanList(perlengkapanData.data || [])
      setWarehouses(warehouseData.data || warehouseData || [])
    } catch (error) {
      console.error('Failed to fetch data:', error)
      toast.error('Gagal memuat data order')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCreateModal = () => {
    setEditingOrder(null)
    setFormData({
      kodeSupplier: '',
      tanggalOrder: new Date().toISOString().split('T')[0],
      statusOrder: 'PROSES',
      kodeWarehouse: '',
      namaPenerima: '',
      details: [{ jenisBarang: 'DOC', namaBarang: '', jumlahBarang: '', hargaSatuan: '' }],
      docDetails: [],
      obatDetails: []
    })
    setModalOpen(true)
  }

  const openEditModal = (order) => {
    setEditingOrder(order)
    const details = order.DetailOrders?.map(d => ({
      kodeDetailOrder: d.KodeDetailOrder,
      jenisBarang: d.JenisBarang,
      namaBarang: d.NamaBarang,
      jumlahBarang: d.JumlahBarang,
      hargaSatuan: d.HargaSatuan
    })) || []

    // Initialize docDetails for DOC items
    const docDetails = details
      .filter(d => d.jenisBarang === 'DOC')
      .map(d => ({
        kodeDetailOrder: d.kodeDetailOrder,
        brandDOC: d.namaBarang || '',
        tipeAyam: '',
        kondisiAwal: 'BAIK',
        jumlahDiterima: d.jumlahBarang,
        jumlahMatiPraKandang: 0
      }))

    // Initialize obatDetails for PERLENGKAPAN items that are OBAT
    const obatDetails = details
      .filter(d => d.jenisBarang === 'PERLENGKAPAN' && isObatItem(d.namaBarang))
      .map(d => ({
        kodeDetailOrder: d.kodeDetailOrder,
        namaBarang: d.namaBarang || '',
        jenisObat: '',
        dosis: '',
        tanggalKadaluarsa: ''
      }))

    setFormData({
      kodeSupplier: order.KodeSupplier || '',
      tanggalOrder: order.TanggalOrder?.split('T')[0] || '',
      statusOrder: order.StatusOrder || 'PROSES',
      kodeWarehouse: '',
      namaPenerima: '',
      details,
      docDetails,
      obatDetails
    })
    setModalOpen(true)
  }

  // Helper to detect if a PERLENGKAPAN item is medicine/obat
  const isObatItem = (namaBarang) => {
    if (!namaBarang) return false
    const lower = namaBarang.toLowerCase()
    return lower.includes('obat') || lower.includes('vitamin') || lower.includes('vaksin') || lower.includes('antibiotik') || lower.includes('suplemen')
  }

  const addDetailRow = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { jenisBarang: 'DOC', namaBarang: '', jumlahBarang: '', hargaSatuan: '' }]
    })
  }

  const removeDetailRow = (index) => {
    const removedDetail = formData.details[index]
    const newDetails = formData.details.filter((_, i) => i !== index)

    // Also remove corresponding docDetail if it was a DOC item
    let newDocDetails = [...formData.docDetails]
    if (removedDetail.jenisBarang === 'DOC' && removedDetail.kodeDetailOrder) {
      newDocDetails = newDocDetails.filter(dd => dd.kodeDetailOrder !== removedDetail.kodeDetailOrder)
    }

    // Also remove corresponding obatDetail if it was an OBAT perlengkapan item
    let newObatDetails = [...formData.obatDetails]
    if (removedDetail.jenisBarang === 'PERLENGKAPAN' && removedDetail.kodeDetailOrder) {
      newObatDetails = newObatDetails.filter(od => od.kodeDetailOrder !== removedDetail.kodeDetailOrder)
    }

    setFormData({
      ...formData,
      details: newDetails,
      docDetails: newDocDetails,
      obatDetails: newObatDetails
    })
  }

  const updateDetail = (index, field, value) => {
    const newDetails = [...formData.details]
    newDetails[index][field] = value

    // If changing jenisBarang to DOC, add a docDetail entry; if changing away, remove it
    let newDocDetails = [...formData.docDetails]
    let newObatDetails = [...formData.obatDetails]
    if (field === 'jenisBarang') {
      const detail = newDetails[index]
      if (value === 'DOC' && detail.kodeDetailOrder) {
        // Add docDetail if not exists
        if (!newDocDetails.find(dd => dd.kodeDetailOrder === detail.kodeDetailOrder)) {
          newDocDetails.push({
            kodeDetailOrder: detail.kodeDetailOrder,
            brandDOC: detail.namaBarang || '',
            tipeAyam: '',
            kondisiAwal: 'BAIK',
            jumlahDiterima: detail.jumlahBarang || 0,
            jumlahMatiPraKandang: 0
          })
        }
        // Remove obatDetail if switching away from PERLENGKAPAN
        if (detail.kodeDetailOrder) {
          newObatDetails = newObatDetails.filter(od => od.kodeDetailOrder !== detail.kodeDetailOrder)
        }
      } else if (value === 'PERLENGKAPAN' && detail.kodeDetailOrder) {
        newDocDetails = newDocDetails.filter(dd => dd.kodeDetailOrder !== detail.kodeDetailOrder)
        // Add obatDetail if the name suggests it's medicine
        if (isObatItem(detail.namaBarang) && formData.statusOrder === 'SUDAH DITERIMA') {
          if (!newObatDetails.find(od => od.kodeDetailOrder === detail.kodeDetailOrder)) {
            newObatDetails.push({
              kodeDetailOrder: detail.kodeDetailOrder,
              namaBarang: detail.namaBarang || '',
              jenisObat: '',
              dosis: '',
              tanggalKadaluarsa: ''
            })
          }
        }
      }
    }

    // If changing namaBarang on a PERLENGKAPAN item while status is SUDAH DITERIMA
    if (field === 'namaBarang' && newDetails[index].jenisBarang === 'PERLENGKAPAN' && formData.statusOrder === 'SUDAH DITERIMA') {
      const detail = newDetails[index]
      const key = detail.kodeDetailOrder || `new-obat-${index}`
      if (isObatItem(value)) {
        // Add obatDetail if not exists
        if (!newObatDetails.find(od => od.kodeDetailOrder === key)) {
          newObatDetails.push({
            kodeDetailOrder: key,
            namaBarang: value,
            jenisObat: '',
            dosis: '',
            tanggalKadaluarsa: ''
          })
        } else {
          // Update namaBarang in existing obatDetail
          newObatDetails = newObatDetails.map(od =>
            od.kodeDetailOrder === key ? { ...od, namaBarang: value } : od
          )
        }
      } else {
        // Remove obatDetail if name no longer suggests obat
        newObatDetails = newObatDetails.filter(od => od.kodeDetailOrder !== key)
      }
    }

    setFormData({ ...formData, details: newDetails, docDetails: newDocDetails, obatDetails: newObatDetails })
  }

  const updateDocDetail = (kodeDetailOrder, field, value) => {
    const newDocDetails = formData.docDetails.map(dd => {
      if (dd.kodeDetailOrder === kodeDetailOrder) {
        return { ...dd, [field]: value }
      }
      return dd
    })
    setFormData({ ...formData, docDetails: newDocDetails })
  }

  // Update obat detail for a specific item
  const updateObatDetail = (kodeDetailOrder, field, value) => {
    const newObatDetails = formData.obatDetails.map(od => {
      if (od.kodeDetailOrder === kodeDetailOrder) {
        return { ...od, [field]: value }
      }
      return od
    })
    setFormData({ ...formData, obatDetails: newObatDetails })
  }

  // When status changes to SUDAH DITERIMA, auto-populate docDetails and obatDetails
  const handleStatusChange = (newStatus) => {
    let docDetails = [...formData.docDetails]
    let obatDetails = [...formData.obatDetails]

    if (newStatus === 'SUDAH DITERIMA') {
      // Create docDetails for all DOC items that don't have one yet
      const docItems = formData.details.filter(d => d.jenisBarang === 'DOC')
      docItems.forEach((item, idx) => {
        const key = item.kodeDetailOrder || `new-${idx}`
        if (!docDetails.find(dd => dd.kodeDetailOrder === key)) {
          docDetails.push({
            kodeDetailOrder: key,
            brandDOC: item.namaBarang || '',
            tipeAyam: '',
            kondisiAwal: 'BAIK',
            jumlahDiterima: item.jumlahBarang || 0,
            jumlahMatiPraKandang: 0
          })
        }
      })

      // Create obatDetails for PERLENGKAPAN items that are OBAT
      const obatItems = formData.details.filter(d => d.jenisBarang === 'PERLENGKAPAN' && isObatItem(d.namaBarang))
      obatItems.forEach((item, idx) => {
        const key = item.kodeDetailOrder || `new-obat-${idx}`
        if (!obatDetails.find(od => od.kodeDetailOrder === key)) {
          obatDetails.push({
            kodeDetailOrder: key,
            namaBarang: item.namaBarang || '',
            jenisObat: '',
            dosis: '',
            tanggalKadaluarsa: ''
          })
        }
      })
    }

    setFormData({ ...formData, statusOrder: newStatus, docDetails, obatDetails })
  }

  // Check if order has PERLENGKAPAN items
  const hasPerlengkapanItems = formData.details.some(d => d.jenisBarang === 'PERLENGKAPAN')
  const hasDocItems = formData.details.some(d => d.jenisBarang === 'DOC')
  const hasObatItems = formData.obatDetails.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.kodeSupplier || !formData.tanggalOrder) {
      toast.error('Supplier dan tanggal order wajib diisi')
      return
    }

    // Validate receiver name when marking as received
    if (formData.statusOrder === 'SUDAH DITERIMA' && !formData.namaPenerima) {
      toast.error('Nama penerima wajib diisi')
      return
    }

    // Validate DOC details when marking as received
    if (formData.statusOrder === 'SUDAH DITERIMA' && hasDocItems) {
      for (const dd of formData.docDetails) {
        if (!dd.brandDOC) {
          toast.error('Brand DOC wajib diisi untuk semua item DOC')
          return
        }
        if (!dd.tipeAyam) {
          toast.error('Tipe ayam wajib diisi untuk semua item DOC')
          return
        }
        if (dd.jumlahDiterima <= 0) {
          toast.error('Jumlah diterima harus lebih dari 0')
          return
        }
        if (dd.jumlahMatiPraKandang < 0) {
          toast.error('Jumlah mati tidak boleh kurang dari 0')
          return
        }
        if (dd.jumlahMatiPraKandang > dd.jumlahDiterima) {
          toast.error('Jumlah mati tidak boleh melebihi jumlah diterima')
          return
        }
      }
    }

    // Validate warehouse selection when marking as received with perlengkapan items
    if (formData.statusOrder === 'SUDAH DITERIMA' && hasPerlengkapanItems && warehouses.length > 1 && !formData.kodeWarehouse) {
      toast.error('Pilih warehouse tujuan untuk perlengkapan')
      return
    }

    // Validate obat details when marking as received
    if (formData.statusOrder === 'SUDAH DITERIMA' && hasObatItems) {
      for (const od of formData.obatDetails) {
        if (!od.jenisObat) {
          toast.error(`Jenis obat wajib diisi untuk "${od.namaBarang}"`)
          return
        }
        if (!od.dosis) {
          toast.error(`Dosis wajib diisi untuk "${od.namaBarang}"`)
          return
        }
        if (!od.tanggalKadaluarsa) {
          toast.error(`Tanggal kadaluarsa wajib diisi untuk "${od.namaBarang}"`)
          return
        }
      }
    }

    setSaving(true)
    try {
      // Convert string values to numbers for API
      const submitData = {
        ...formData,
        details: formData.details.map(d => ({
          ...d,
          jumlahBarang: parseInt(d.jumlahBarang) || 0,
          hargaSatuan: parseFloat(d.hargaSatuan) || 0
        })),
        docDetails: formData.docDetails.map(dd => ({
          ...dd,
          jumlahDiterima: parseInt(dd.jumlahDiterima) || 0,
          jumlahMatiPraKandang: parseInt(dd.jumlahMatiPraKandang) || 0
        })),
        obatDetails: formData.obatDetails
      }

      if (editingOrder) {
        await orderService.updateOrder(editingOrder.KodeOrder, submitData)
        toast.success('Order berhasil diupdate')
      } else {
        await orderService.createOrder(submitData)
        toast.success('Order berhasil dibuat')
      }
      setModalOpen(false)
      fetchData()
    } catch (error) {
      console.error('Save order error:', error)
      toast.error('Gagal menyimpan order')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (order) => {
    if (!confirm(`Hapus order "${order.KodeOrder}"?`)) return

    try {
      await orderService.deleteOrder(order.KodeOrder)
      toast.success('Order berhasil dihapus')
      fetchData()
    } catch (error) {
      console.error('Delete order error:', error)
      toast.error('Gagal menghapus order')
    }
  }

  const getStatusBadge = (status) => {
    const classes = status === 'SUDAH DITERIMA' ? 'success' : 'warning'
    return <span className={`status-badge ${classes}`}>{status}</span>
  }

  const columns = [
    { key: 'KodeOrder', label: 'Kode Order', sortable: true },
    {
      key: 'TanggalOrder',
      label: 'Tanggal',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString('id-ID')
    },
    {
      key: 'Supplier',
      label: 'Supplier',
      sortable: true,
      render: (_, row) => row.Supplier?.NamaSupplier || '-'
    },
    {
      key: 'DetailOrders',
      label: 'Items',
      render: (val) => {
        const docCount = val?.filter(d => d.JenisBarang === 'DOC').length || 0
        const perlengkapanCount = val?.filter(d => d.JenisBarang === 'PERLENGKAPAN').length || 0
        const parts = []
        if (docCount > 0) parts.push(`${docCount} DOC`)
        if (perlengkapanCount > 0) parts.push(`${perlengkapanCount} Perlengkapan`)
        return parts.join(', ') || '0 item'
      }
    },
    {
      key: 'StatusOrder',
      label: 'Status',
      sortable: true,
      render: (val) => getStatusBadge(val)
    },
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
        <LoadingState variant="spinner" text="Memuat data order..." />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Manajemen Order</h1>
          <p>Kelola pesanan ke supplier</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          Buat Order
        </button>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          title="Belum Ada Order"
          message="Buat order pertama untuk memesan barang dari supplier"
          actionLabel="Buat Order"
          onAction={openCreateModal}
        />
      ) : (
        <div className="page-content">
          <DataTable columns={columns} data={orders} pageSize={10} />
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOrder ? 'Edit Order' : 'Buat Order Baru'}
        size="large"
      >
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="kodeSupplier">Supplier *</label>
              <select
                id="kodeSupplier"
                value={formData.kodeSupplier}
                onChange={(e) => setFormData({ ...formData, kodeSupplier: e.target.value })}
                required
              >
                <option value="">Pilih Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.KodeSupplier} value={s.KodeSupplier}>
                    {s.NamaSupplier}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="tanggalOrder">Tanggal Order *</label>
              <input
                type="date"
                id="tanggalOrder"
                value={formData.tanggalOrder}
                onChange={(e) => setFormData({ ...formData, tanggalOrder: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="statusOrder">Status</label>
            <select
              id="statusOrder"
              value={formData.statusOrder}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="PROSES">Proses</option>
              <option value="SUDAH DITERIMA">Sudah Diterima</option>
            </select>
          </div>

          {/* ===== PENERIMAAN SECTION — shown when SUDAH DITERIMA ===== */}
          {formData.statusOrder === 'SUDAH DITERIMA' && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.04))',
              border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: '0.75rem',
              padding: '1.25rem',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1rem',
                fontWeight: 600,
                color: 'var(--text-primary, #1a2e1a)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📋 Data Penerimaan
              </h3>

              {/* Nama Penerima */}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label htmlFor="namaPenerima" style={{ fontWeight: 600 }}>
                  👤 Nama Penerima *
                </label>
                <input
                  type="text"
                  id="namaPenerima"
                  value={formData.namaPenerima}
                  onChange={(e) => setFormData({ ...formData, namaPenerima: e.target.value })}
                  placeholder="Masukkan nama petugas yang menerima"
                  maxLength={30}
                  required
                />
              </div>

              {/* Warehouse selector for PERLENGKAPAN */}
              {hasPerlengkapanItems && warehouses.length > 0 && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="kodeWarehouse" style={{ fontWeight: 600 }}>
                    📦 Warehouse Tujuan Perlengkapan {warehouses.length > 1 ? '*' : ''}
                  </label>
                  <select
                    id="kodeWarehouse"
                    value={formData.kodeWarehouse}
                    onChange={(e) => setFormData({ ...formData, kodeWarehouse: e.target.value })}
                    required={warehouses.length > 1}
                  >
                    {warehouses.length === 1 ? (
                      <option value="">Default: {warehouses[0].LokasiWarehouse}</option>
                    ) : (
                      <option value="">Pilih Warehouse Tujuan</option>
                    )}
                    {warehouses.map((w) => (
                      <option key={w.KodeWarehouse} value={w.KodeWarehouse}>
                        {w.LokasiWarehouse} ({w.KodeWarehouse})
                      </option>
                    ))}
                  </select>
                  <small style={{ color: 'var(--text-secondary, #64748b)', marginTop: '0.25rem', display: 'block' }}>
                    Perlengkapan yang diterima akan otomatis masuk ke warehouse ini
                  </small>
                </div>
              )}

              {/* DOC Reception Details */}
              {hasDocItems && (
                <div style={{ marginTop: '0.5rem' }}>
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary, #1a2e1a)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    🐥 Detail Penerimaan DOC
                  </h4>
                  <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                    Isi informasi lengkap untuk setiap batch DOC yang diterima
                  </p>

                  {formData.docDetails.map((dd, idx) => {
                    const matchingDetail = formData.details.find(
                      d => d.kodeDetailOrder === dd.kodeDetailOrder || (!d.kodeDetailOrder && d.jenisBarang === 'DOC')
                    )
                    const jumlahDipesan = parseInt(matchingDetail?.jumlahBarang) || 0
                    const jumlahSehat = (parseInt(dd.jumlahDiterima) || 0) - (parseInt(dd.jumlahMatiPraKandang) || 0)
                    const pctSehat = dd.jumlahDiterima > 0 ? ((jumlahSehat / dd.jumlahDiterima) * 100).toFixed(1) : 0

                    return (
                      <div key={dd.kodeDetailOrder || idx} style={{
                        background: 'white',
                        borderRadius: '0.625rem',
                        padding: '1rem',
                        marginBottom: '0.75rem',
                        border: '1px solid rgba(31,59,40,0.08)',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '0.75rem'
                        }}>
                          <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: '#1a5e1a',
                            background: 'rgba(34,197,94,0.1)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '99px'
                          }}>
                            DOC Batch #{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            Dipesan: {jumlahDipesan.toLocaleString()} ekor
                          </span>
                        </div>

                        <div className="form-row" style={{ gap: '0.75rem' }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.825rem' }}>Brand DOC *</label>
                            <input
                              type="text"
                              value={dd.brandDOC}
                              onChange={(e) => updateDocDetail(dd.kodeDetailOrder, 'brandDOC', e.target.value)}
                              placeholder="Contoh: Cobb 500, Ross 308"
                              required
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.825rem' }}>Tipe Ayam *</label>
                            <select
                              value={dd.tipeAyam}
                              onChange={(e) => updateDocDetail(dd.kodeDetailOrder, 'tipeAyam', e.target.value)}
                              required
                            >
                              <option value="">Pilih Tipe</option>
                              <option value="Broiler">Broiler</option>
                              <option value="Layer">Layer</option>
                              <option value="Kampung">Ayam Kampung</option>
                              <option value="Pejantan">Pejantan</option>
                            </select>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginTop: '0.5rem' }}>
                          <label style={{ fontSize: '0.825rem' }}>Kondisi Awal *</label>
                          <select
                            value={dd.kondisiAwal}
                            onChange={(e) => updateDocDetail(dd.kodeDetailOrder, 'kondisiAwal', e.target.value)}
                          >
                            <option value="BAIK">🟢 Baik — DOC aktif, sehat, tidak ada cacat</option>
                            <option value="CUKUP BAIK">🟡 Cukup Baik — Sebagian kecil lemas/tidak aktif</option>
                            <option value="KURANG BAIK">🟠 Kurang Baik — Banyak yang lemas, perlu perhatian</option>
                            <option value="BURUK">🔴 Buruk — Banyak mati/cacat, perlu klaim ke supplier</option>
                          </select>
                        </div>

                        <div className="form-row" style={{ gap: '0.75rem', marginTop: '0.5rem' }}>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.825rem' }}>Jumlah Diterima (ekor) *</label>
                            <input
                              type="number"
                              value={dd.jumlahDiterima}
                              onChange={(e) => updateDocDetail(dd.kodeDetailOrder, 'jumlahDiterima', e.target.value)}
                              placeholder="0"
                              min="0"
                              required
                            />
                          </div>
                          <div className="form-group" style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.825rem' }}>Jumlah Mati / DOA (ekor)</label>
                            <input
                              type="number"
                              value={dd.jumlahMatiPraKandang}
                              onChange={(e) => updateDocDetail(dd.kodeDetailOrder, 'jumlahMatiPraKandang', e.target.value)}
                              placeholder="0"
                              min="0"
                            />
                          </div>
                        </div>

                        {/* Health Summary Bar */}
                        {dd.jumlahDiterima > 0 && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgba(241,245,249,0.8)',
                            borderRadius: '0.5rem',
                            border: '1px solid rgba(31,59,40,0.06)'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span style={{ fontSize: '0.8rem', color: '#475569' }}>Ringkasan Penerimaan</span>
                              <span style={{
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                color: pctSehat >= 98 ? '#16a34a' : pctSehat >= 95 ? '#ca8a04' : '#dc2626'
                              }}>
                                {pctSehat}% Sehat
                              </span>
                            </div>
                            <div style={{
                              height: '8px',
                              background: '#e2e8f0',
                              borderRadius: '99px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                height: '100%',
                                width: `${pctSehat}%`,
                                background: pctSehat >= 98
                                  ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                                  : pctSehat >= 95
                                    ? 'linear-gradient(90deg, #eab308, #ca8a04)'
                                    : 'linear-gradient(90deg, #ef4444, #dc2626)',
                                borderRadius: '99px',
                                transition: 'width 0.3s ease'
                              }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: '#16a34a' }}>
                                ✅ Sehat: {jumlahSehat.toLocaleString()} ekor
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                                ❌ Mati/DOA: {(parseInt(dd.jumlahMatiPraKandang) || 0).toLocaleString()} ekor
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* OBAT/Medicine Reception Details */}
              {hasObatItems && (
                <div style={{ marginTop: '0.5rem' }}>
                  <h4 style={{
                    margin: '0 0 0.75rem 0',
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: 'var(--text-primary, #1a2e1a)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    💊 Detail Obat / Vaksin
                  </h4>
                  <p style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem', margin: '0 0 1rem 0' }}>
                    Isi jenis obat dan dosis untuk setiap item obat yang diterima. Data akan disimpan ke Master Obat.
                  </p>

                  {formData.obatDetails.map((od, idx) => (
                    <div key={od.kodeDetailOrder || idx} style={{
                      background: 'white',
                      borderRadius: '0.625rem',
                      padding: '1rem',
                      marginBottom: '0.75rem',
                      border: '1px solid rgba(147,51,234,0.15)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.75rem'
                      }}>
                        <span style={{
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#7c3aed',
                          background: 'rgba(147,51,234,0.1)',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '99px'
                        }}>
                          💊 {od.namaBarang || `Obat #${idx + 1}`}
                        </span>
                      </div>

                      <div className="form-row" style={{ gap: '0.75rem' }}>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.825rem' }}>Jenis Obat *</label>
                          <select
                            value={od.jenisObat}
                            onChange={(e) => updateObatDetail(od.kodeDetailOrder, 'jenisObat', e.target.value)}
                            required
                          >
                            <option value="">Pilih Jenis Obat</option>
                            <option value="Antibiotik">Antibiotik</option>
                            <option value="Vaksin">Vaksin</option>
                            <option value="Vitamin">Vitamin</option>
                            <option value="Antiparasit">Antiparasit</option>
                            <option value="Probiotik">Probiotik</option>
                            <option value="Desinfektan">Desinfektan</option>
                            <option value="Suplemen">Suplemen</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.825rem' }}>Dosis *</label>
                          <input
                            type="text"
                            value={od.dosis}
                            onChange={(e) => updateObatDetail(od.kodeDetailOrder, 'dosis', e.target.value)}
                            placeholder="Contoh: 1ml/liter air, 2g/kg pakan"
                            required
                          />
                        </div>
                      </div>

                      <div className="form-group" style={{ marginTop: '0.5rem' }}>
                        <label style={{ fontSize: '0.825rem' }}>Tanggal Kadaluarsa *</label>
                        <input
                          type="date"
                          value={od.tanggalKadaluarsa}
                          onChange={(e) => updateObatDetail(od.kodeDetailOrder, 'tanggalKadaluarsa', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Detail Order</label>
            <div className="order-detail-table">
              <div className="order-detail-header">
                <div className="col-jenis">Jenis Barang</div>
                <div className="col-nama">Nama Barang</div>
                <div className="col-jumlah">Jumlah</div>
                <div className="col-harga">Harga Satuan (Rp)</div>
                <div className="col-aksi">Aksi</div>
              </div>
              {formData.details.map((detail, index) => (
                <div key={index} className="order-detail-row">
                  <div className="col-jenis">
                    <select
                      value={detail.jenisBarang}
                      onChange={(e) => updateDetail(index, 'jenisBarang', e.target.value)}
                    >
                      <option value="DOC">DOC</option>
                      <option value="PERLENGKAPAN">Perlengkapan</option>
                    </select>
                  </div>
                  <div className="col-nama">
                    <input
                      type="text"
                      placeholder={detail.jenisBarang === 'DOC' ? 'Contoh: Broiler Cobb 500' : 'Contoh: Pakan Starter'}
                      value={detail.namaBarang}
                      onChange={(e) => updateDetail(index, 'namaBarang', e.target.value)}
                    />
                  </div>
                  <div className="col-jumlah">
                    <input
                      type="number"
                      placeholder="0"
                      value={detail.jumlahBarang}
                      onChange={(e) => updateDetail(index, 'jumlahBarang', e.target.value)}
                    />
                  </div>
                  <div className="col-harga">
                    <input
                      type="number"
                      placeholder="0"
                      value={detail.hargaSatuan}
                      onChange={(e) => updateDetail(index, 'hargaSatuan', e.target.value)}
                    />
                  </div>
                  <div className="col-aksi">
                    {formData.details.length > 1 && (
                      <button type="button" className="btn-action btn-delete" onClick={() => removeDetailRow(index)}>
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn-secondary" onClick={addDetailRow} style={{ marginTop: '0.75rem' }}>
              Tambah Item
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editingOrder ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default DashboardOrder
