import { useState, useEffect } from 'react'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import { kandangService } from '../services/farmService'
import { staffService } from '../services/staffService'
import './DashboardPage.css'

function DashboardKandang() {
    const [kandangs, setKandangs] = useState([])
    const [availableDocs, setAvailableDocs] = useState([])
    const [teams, setTeams] = useState([])
    const [loading, setLoading] = useState(true)
    const [modalOpen, setModalOpen] = useState(false)
    const [detailModalOpen, setDetailModalOpen] = useState(false)
    const [selectedKandang, setSelectedKandang] = useState(null)
    const [detailTab, setDetailTab] = useState('status')
    const [detailData, setDetailData] = useState({})
    const [detailLoading, setDetailLoading] = useState(false)

    // CRUD modal states
    const [crudModalOpen, setCrudModalOpen] = useState(false)
    const [crudModalType, setCrudModalType] = useState('') // 'status','performance','feed','obat','perlengkapan','kematian'
    const [crudSaving, setCrudSaving] = useState(false)
    const [perlengkapanOptions, setPerlengkapanOptions] = useState([])

    // CRUD form data
    const [statusForm, setStatusForm] = useState({ tanggalPemeriksaan: new Date().toISOString().split('T')[0], populasi: '', beratRataRata: '' })
    const [performanceForm, setPerformanceForm] = useState({ tanggalPerformance: new Date().toISOString().split('T')[0], actualAverageDailyGain: '', actualFeedIntake: '', actualWaterIntake: '', keteranganPerformance: '' })
    const [feedForm, setFeedForm] = useState({ tanggalPemakaian: new Date().toISOString().split('T')[0], items: [{ kodePerlengkapan: '', jumlahPakan: '' }] })
    const [obatForm, setObatForm] = useState({ tanggalPenggunaan: new Date().toISOString().split('T')[0], kodePerlengkapan: '', jumlahObat: '' })
    const [perlengkapanForm, setPerlengkapanForm] = useState({ tanggalPemakaian: new Date().toISOString().split('T')[0], kodePerlengkapan: '', jumlahPemakaian: '' })
    const [kematianForm, setKematianForm] = useState({ tanggalKejadian: new Date().toISOString().split('T')[0], jumlahMati: '', jumlahReject: '', keterangan: '' })

    const [formData, setFormData] = useState({
        kodeDoc: '',
        kodeTim: '',
        jumlahDoc: '',
        panjangKandang: '',
        lebarKandang: '',
        lantaiKandang: 'Sekam',
        suhuKandang: 30,
        durasiCycle: 35
    })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [kandangRes, docRes, teamRes] = await Promise.all([
                kandangService.getKandang(),
                kandangService.getAvailableDocs(),
                staffService.getTim()
            ])

            setKandangs(kandangRes || [])
            setAvailableDocs(docRes || [])
            setTeams(teamRes.data || teamRes || [])
        } catch (error) {
            console.error('Fetch error:', error)
            toast.error('Gagal memuat data kandang')
        } finally {
            setLoading(false)
        }
    }

    const openCreateModal = () => {
        setFormData({
            kodeDoc: '',
            kodeTim: '',
            jumlahDoc: '',
            panjangKandang: '',
            lebarKandang: '',
            lantaiKandang: 'Sekam',
            suhuKandang: 30,
            durasiCycle: 35
        })
        setModalOpen(true)
    }

    const getSelectedDoc = () => {
        return availableDocs.find(d => d.KodeDOC === formData.kodeDoc)
    }

    const getMaxDoc = () => {
        const doc = getSelectedDoc()
        return doc ? doc.JumlahTersedia || (doc.JumlahDiterima - (doc.JumlahMatiPraKandang || 0)) : 0
    }

    const calculateDensity = () => {
        if (!formData.panjangKandang || !formData.lebarKandang) return 0
        const jumlah = formData.jumlahDoc ? parseInt(formData.jumlahDoc) : getMaxDoc()
        const luas = parseFloat(formData.panjangKandang) * parseFloat(formData.lebarKandang)
        if (luas <= 0) return 0
        return (jumlah / luas).toFixed(2)
    }

    const handleDocChange = (kodeDoc) => {
        const doc = availableDocs.find(d => d.KodeDOC === kodeDoc)
        const maxAmount = doc ? doc.JumlahTersedia || (doc.JumlahDiterima - (doc.JumlahMatiPraKandang || 0)) : 0
        setFormData({
            ...formData,
            kodeDoc,
            jumlahDoc: maxAmount.toString()
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.kodeDoc || !formData.kodeTim || !formData.panjangKandang || !formData.lebarKandang) {
            toast.error('Semua field wajib diisi')
            return
        }
        if (!formData.jumlahDoc || parseInt(formData.jumlahDoc) <= 0) {
            toast.error('Jumlah DOC harus lebih dari 0')
            return
        }

        setSaving(true)
        try {
            await kandangService.createKandang({
                ...formData,
                jumlahDoc: parseInt(formData.jumlahDoc),
                panjangKandang: parseFloat(formData.panjangKandang),
                lebarKandang: parseFloat(formData.lebarKandang),
                suhuKandang: parseFloat(formData.suhuKandang),
                durasiCycle: parseInt(formData.durasiCycle)
            })
            toast.success('Kandang berhasil dibuat & Chick-In sukses')
            setModalOpen(false)
            fetchData()
        } catch (error) {
            console.error('Save error:', error)
            toast.error(error.response?.data?.error || 'Gagal menyimpan kandang')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (kandang) => {
        if (!confirm(`Hapus kandang ${kandang.KodeKandang}? Data terkait akan ikut terhapus.`)) return

        try {
            await kandangService.deleteKandang(kandang.KodeKandang)
            toast.success('Kandang berhasil dihapus')
            fetchData()
        } catch (error) {
            toast.error('Gagal menghapus kandang')
        }
    }

    const openDetailModal = async (kandang) => {
        setSelectedKandang(kandang)
        setDetailTab('status')
        setDetailModalOpen(true)
        await loadDetailData(kandang.KodeKandang, 'status')
    }

    const loadDetailData = async (id, tab) => {
        setDetailLoading(true)
        try {
            let data = {}
            switch (tab) {
                case 'status':
                    data = await kandangService.getKandangStatus(id)
                    break
                case 'performance':
                    data = await kandangService.getKandangPerformance(id)
                    break
                case 'feed':
                    data = await kandangService.getKandangPemakaianFeed(id)
                    break
                case 'obat':
                    data = await kandangService.getKandangPemakaianObat(id)
                    break
                case 'perlengkapan':
                    data = await kandangService.getKandangPemakaianPerlengkapan(id)
                    break
                case 'kematian':
                    data = await kandangService.getKandangKematian(id)
                    break
                default:
                    break
            }
            setDetailData(data)
        } catch (error) {
            console.error('Load detail error:', error)
            toast.error('Gagal memuat data detail')
        } finally {
            setDetailLoading(false)
        }
    }

    const handleTabChange = (tab) => {
        setDetailTab(tab)
        if (selectedKandang) {
            loadDetailData(selectedKandang.KodeKandang, tab)
        }
    }

    // ========== CRUD HANDLERS ==========

    const openCrudModal = async (type) => {
        setCrudModalType(type)
        const today = new Date().toISOString().split('T')[0]

        // Reset forms
        setStatusForm({ tanggalPemeriksaan: today, populasi: '', beratRataRata: '' })
        setPerformanceForm({ tanggalPerformance: today, actualAverageDailyGain: '', actualFeedIntake: '', actualWaterIntake: '', keteranganPerformance: '' })
        setFeedForm({ tanggalPemakaian: today, items: [{ kodePerlengkapan: '', jumlahPakan: '' }] })
        setObatForm({ tanggalPenggunaan: today, kodePerlengkapan: '', jumlahObat: '' })
        setPerlengkapanForm({ tanggalPemakaian: today, kodePerlengkapan: '', jumlahPemakaian: '' })
        setKematianForm({ tanggalKejadian: today, jumlahMati: '', jumlahReject: '', keterangan: '' })

        // Load perlengkapan options for relevant tabs
        try {
            if (type === 'feed') {
                const res = await kandangService.getPerlengkapanByKategori('PAKAN')
                setPerlengkapanOptions(res.data || [])
            } else if (type === 'obat') {
                const res = await kandangService.getPerlengkapanByKategori('OBAT')
                setPerlengkapanOptions(res.data || [])
            } else if (type === 'perlengkapan') {
                const res = await kandangService.getPerlengkapanByKategori('PERALATAN')
                setPerlengkapanOptions(res.data || [])
            }
        } catch (error) {
            console.error('Load perlengkapan options error:', error)
        }

        setCrudModalOpen(true)
    }

    const handleCrudSubmit = async (e) => {
        e.preventDefault()
        if (!selectedKandang) return

        setCrudSaving(true)
        const id = selectedKandang.KodeKandang

        try {
            switch (crudModalType) {
                case 'status':
                    if (!statusForm.populasi || !statusForm.beratRataRata) {
                        toast.error('Populasi dan Berat Rata-rata wajib diisi')
                        setCrudSaving(false)
                        return
                    }
                    await kandangService.createKandangStatus(id, statusForm)
                    toast.success('Status kandang berhasil ditambahkan')
                    break

                case 'performance':
                    await kandangService.createKandangPerformance(id, performanceForm)
                    toast.success('Data performance berhasil ditambahkan')
                    break

                case 'feed':
                    if (feedForm.items.some(item => !item.kodePerlengkapan || !item.jumlahPakan)) {
                        toast.error('Semua item pakan harus diisi')
                        setCrudSaving(false)
                        return
                    }
                    await kandangService.createKandangPemakaianFeed(id, feedForm)
                    toast.success('Pemakaian pakan berhasil ditambahkan')
                    break

                case 'obat':
                    if (!obatForm.kodePerlengkapan || !obatForm.jumlahObat) {
                        toast.error('Obat dan jumlah wajib diisi')
                        setCrudSaving(false)
                        return
                    }
                    await kandangService.createKandangPemakaianObat(id, obatForm)
                    toast.success('Pemakaian obat berhasil ditambahkan')
                    break

                case 'perlengkapan':
                    if (!perlengkapanForm.kodePerlengkapan || !perlengkapanForm.jumlahPemakaian) {
                        toast.error('Perlengkapan dan jumlah wajib diisi')
                        setCrudSaving(false)
                        return
                    }
                    await kandangService.createKandangPemakaianPerlengkapan(id, perlengkapanForm)
                    toast.success('Pemakaian perlengkapan berhasil ditambahkan')
                    break

                case 'kematian':
                    if (!kematianForm.jumlahMati && !kematianForm.jumlahReject) {
                        toast.error('Jumlah mati atau reject wajib diisi')
                        setCrudSaving(false)
                        return
                    }
                    await kandangService.createKandangKematian(id, kematianForm)
                    toast.success('Data kematian berhasil ditambahkan')
                    break
            }

            setCrudModalOpen(false)
            loadDetailData(id, detailTab)
            // Also refresh main table so PopulasiTerkini updates after kematian/status changes
            fetchData()
        } catch (error) {
            console.error('CRUD save error:', error)
            toast.error(error.response?.data?.error || 'Gagal menyimpan data')
        } finally {
            setCrudSaving(false)
        }
    }

    const handleDeleteItem = async (tab, item) => {
        if (!selectedKandang) return
        const id = selectedKandang.KodeKandang

        const confirmMsg = 'Yakin ingin menghapus data ini?'
        if (!confirm(confirmMsg)) return

        try {
            switch (tab) {
                case 'status':
                    await kandangService.deleteKandangStatus(id, item.KodeStatus)
                    break
                case 'performance':
                    await kandangService.deleteKandangPerformance(id, item.KodePerformance)
                    break
                case 'feed':
                    await kandangService.deleteKandangPemakaianFeed(id, item.KodePemakaianFeed)
                    break
                case 'obat':
                    await kandangService.deleteKandangPemakaianObat(id, item.KodePemakaianObat)
                    break
                case 'perlengkapan':
                    await kandangService.deleteKandangPemakaianPerlengkapan(id, item.KodePemakaian)
                    break
                case 'kematian':
                    await kandangService.deleteKandangKematian(id, item.KodeStatusKematian)
                    break
            }
            toast.success('Data berhasil dihapus')
            loadDetailData(id, tab)
        } catch (error) {
            console.error('Delete item error:', error)
            toast.error(error.response?.data?.error || 'Gagal menghapus data')
        }
    }

    // Feed form item handlers
    const addFeedItem = () => {
        setFeedForm({
            ...feedForm,
            items: [...feedForm.items, { kodePerlengkapan: '', jumlahPakan: '' }]
        })
    }

    const removeFeedItem = (index) => {
        if (feedForm.items.length <= 1) return
        setFeedForm({
            ...feedForm,
            items: feedForm.items.filter((_, i) => i !== index)
        })
    }

    const updateFeedItem = (index, field, value) => {
        const newItems = [...feedForm.items]
        newItems[index] = { ...newItems[index], [field]: value }
        setFeedForm({ ...feedForm, items: newItems })
    }

    const formatDate = (dateStr) => {
        return dateStr ? new Date(dateStr).toLocaleDateString('id-ID') : '-'
    }

    const getCycleProgress = (kandang) => {
        if (!kandang.DurasiCycle || !kandang.TanggalMulai) return 0
        const start = new Date(kandang.TanggalMulai)
        const now = new Date()
        const elapsed = Math.floor((now - start) / (1000 * 60 * 60 * 24))
        return Math.min(100, Math.round((elapsed / kandang.DurasiCycle) * 100))
    }

    const columns = [
        { key: 'KodeKandang', label: 'Kode', sortable: true },
        {
            key: 'DOC',
            label: 'DOC Batch',
            render: (_, row) => row.KodeDOC ? `${row.KodeDOC} (${row.BrandDOC || '-'})` : '-'
        },
        {
            key: 'PopulasiTerkini',
            label: 'Populasi',
            render: (val, row) => val !== null ? `${parseInt(val).toLocaleString()} ekor` : (row.JumlahDiterima ? `${row.JumlahDiterima} ekor` : '-')
        },
        {
            key: 'UmurTerkini',
            label: 'Umur (hari)',
            render: (val) => val !== null ? `${val} hari` : '-'
        },
        {
            key: 'Size',
            label: 'Ukuran',
            render: (_, row) => `${row.PanjangKandang} x ${row.LebarKandang} m`
        },
        {
            key: 'Kepadatan',
            label: 'Kepadatan',
            render: (val) => val ? `${val} /m²` : '-'
        },
        {
            key: 'NamaTim',
            label: 'Tim Kerja',
            render: (val) => val || '-'
        },
        {
            key: 'Cycle',
            label: 'Progress Cycle',
            render: (_, row) => {
                const progress = getCycleProgress(row)
                const remaining = row.SisaHariPanen ?? '-'
                return (
                    <div style={{ minWidth: '100px' }}>
                        <div style={{
                            background: '#e8f5e9',
                            borderRadius: '8px',
                            height: '8px',
                            overflow: 'hidden',
                            marginBottom: '4px'
                        }}>
                            <div style={{
                                background: progress >= 90 ? '#f44336' : progress >= 70 ? '#ff9800' : '#4caf50',
                                width: `${progress}%`,
                                height: '100%',
                                borderRadius: '8px',
                                transition: 'width 0.3s ease'
                            }} />
                        </div>
                        <small style={{ color: '#5d7463', fontSize: '0.75rem' }}>Sisa: {remaining} hari</small>
                    </div>
                )
            }
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (_, row) => (
                <div className="table-actions">
                    <button className="btn-action btn-view" onClick={(e) => { e.stopPropagation(); openDetailModal(row) }}>
                        Monitor
                    </button>
                    <button className="btn-action btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(row) }}>
                        Hapus
                    </button>
                </div>
            )
        }
    ]

    // Detail tabs config
    const detailTabs = [
        { id: 'status', label: '📊 Status' },
        { id: 'performance', label: '📈 Performance' },
        { id: 'feed', label: '🌾 Pakan' },
        { id: 'obat', label: '💊 Obat' },
        { id: 'perlengkapan', label: '🔧 Perlengkapan' },
        { id: 'kematian', label: '💀 Kematian' }
    ]

    const renderDetailContent = () => {
        if (detailLoading) return <LoadingState text="Memuat data..." />

        const items = detailData?.data || detailData || []

        const renderAddButton = () => (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button
                    className="btn-primary"
                    onClick={() => openCrudModal(detailTab)}
                    style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                    + Tambah Data
                </button>
            </div>
        )

        if (!items.length) return (
            <div>
                {renderAddButton()}
                <EmptyState title="Belum Ada Data" message="Belum ada data untuk kategori ini. Klik 'Tambah Data' untuk menambahkan." />
            </div>
        )

        const deleteBtn = (item) => (
            <button
                className="btn-action btn-delete"
                onClick={() => handleDeleteItem(detailTab, item)}
                title="Hapus"
            >
                🗑️
            </button>
        )

        switch (detailTab) {
            case 'status':
                return (
                    <div>
                        {renderAddButton()}
                        <div className="detail-table-wrapper">
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Umur (Hari)</th>
                                        <th>Populasi</th>
                                        <th>Berat Rata-rata (g)</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((s, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(s.TanggalPemeriksaan)}</td>
                                            <td>{s.UmurAyam}</td>
                                            <td>{s.Populasi?.toLocaleString()}</td>
                                            <td>{s.BeratRataRata} g</td>
                                            <td>{deleteBtn(s)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            case 'performance':
                return (
                    <div>
                        {renderAddButton()}
                        <div className="detail-table-wrapper">
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>ADG</th>
                                        <th>Feed Intake</th>
                                        <th>Water Intake</th>
                                        <th>Keterangan</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((p, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(p.TanggalPerformance)}</td>
                                            <td>{p.ActualAverageDailyGain}</td>
                                            <td>{p.ActualFeedIntake}</td>
                                            <td>{p.ActualWaterIntake}</td>
                                            <td>{p.KeteranganPerformance || '-'}</td>
                                            <td>{deleteBtn(p)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            case 'feed':
                return (
                    <div>
                        {renderAddButton()}
                        <div className="detail-table-wrapper">
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Nama Pakan</th>
                                        <th>Jumlah</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((f, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(f.TanggalPemakaian)}</td>
                                            <td>{f.namaPakan || '-'}</td>
                                            <td>{f.JumlahPakan}</td>
                                            <td>{deleteBtn(f)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            case 'obat':
                return (
                    <div>
                        {renderAddButton()}
                        <div className="detail-table-wrapper">
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Obat</th>
                                        <th>Jenis Obat</th>
                                        <th>Dosis</th>
                                        <th>Jumlah</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((o, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(o.TanggalPenggunaan)}</td>
                                            <td>{o.NamaPerlengkapan || '-'}</td>
                                            <td>{o.JenisObat || '-'}</td>
                                            <td>{o.Dosis || '-'}</td>
                                            <td>{o.JumlahObat}</td>
                                            <td>{deleteBtn(o)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            case 'perlengkapan':
                return (
                    <div>
                        {renderAddButton()}
                        <div className="detail-table-wrapper">
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Perlengkapan</th>
                                        <th>Kategori</th>
                                        <th>Jumlah</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((p, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(p.TanggalPemakaian)}</td>
                                            <td>{p.NamaPerlengkapan}</td>
                                            <td><span className={`status-badge ${p.KategoriPerlengkapan === 'PAKAN' ? 'success' : 'info'}`}>{p.KategoriPerlengkapan}</span></td>
                                            <td>{p.JumlahPemakaian} {p.Satuan || ''}</td>
                                            <td>{deleteBtn(p)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            case 'kematian':
                return (
                    <div>
                        {renderAddButton()}
                        <div className="detail-table-wrapper">
                            <table className="detail-table">
                                <thead>
                                    <tr>
                                        <th>Tanggal</th>
                                        <th>Mati</th>
                                        <th>Reject</th>
                                        <th>Keterangan</th>
                                        <th>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((k, i) => (
                                        <tr key={i}>
                                            <td>{formatDate(k.TanggalKejadian)}</td>
                                            <td style={{ color: '#c23b32', fontWeight: 600 }}>{k.JumlahMati}</td>
                                            <td style={{ color: '#e57300', fontWeight: 600 }}>{k.JumlahReject || 0}</td>
                                            <td>{k.Keterangan || '-'}</td>
                                            <td>{deleteBtn(k)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    // ========== CRUD MODAL FORM RENDER ==========
    const getCrudModalTitle = () => {
        const titles = {
            status: 'Tambah Status Kandang',
            performance: 'Tambah Data Performance',
            feed: 'Tambah Pemakaian Pakan',
            obat: 'Tambah Pemakaian Obat',
            perlengkapan: 'Tambah Pemakaian Perlengkapan',
            kematian: 'Tambah Data Kematian'
        }
        return titles[crudModalType] || 'Tambah Data'
    }

    const renderCrudForm = () => {
        switch (crudModalType) {
            case 'status':
                return (
                    <>
                        <div className="form-group">
                            <label>Tanggal Pemeriksaan *</label>
                            <input type="date" value={statusForm.tanggalPemeriksaan} onChange={(e) => setStatusForm({ ...statusForm, tanggalPemeriksaan: e.target.value })} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Populasi *</label>
                                <input type="number" value={statusForm.populasi} onChange={(e) => setStatusForm({ ...statusForm, populasi: e.target.value })} required min="0" placeholder="Jumlah populasi ayam" />
                            </div>
                            <div className="form-group">
                                <label>Berat Rata-rata (g) *</label>
                                <input type="number" value={statusForm.beratRataRata} onChange={(e) => setStatusForm({ ...statusForm, beratRataRata: e.target.value })} required min="0" step="0.1" placeholder="Berat rata-rata dalam gram" />
                            </div>
                        </div>
                    </>
                )

            case 'performance':
                return (
                    <>
                        <div className="form-group">
                            <label>Tanggal Performance *</label>
                            <input type="date" value={performanceForm.tanggalPerformance} onChange={(e) => setPerformanceForm({ ...performanceForm, tanggalPerformance: e.target.value })} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Average Daily Gain</label>
                                <input type="number" step="0.01" value={performanceForm.actualAverageDailyGain} onChange={(e) => setPerformanceForm({ ...performanceForm, actualAverageDailyGain: e.target.value })} placeholder="ADG" />
                            </div>
                            <div className="form-group">
                                <label>Feed Intake</label>
                                <input type="number" step="0.01" value={performanceForm.actualFeedIntake} onChange={(e) => setPerformanceForm({ ...performanceForm, actualFeedIntake: e.target.value })} placeholder="Feed Intake" />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Water Intake</label>
                                <input type="number" step="0.01" value={performanceForm.actualWaterIntake} onChange={(e) => setPerformanceForm({ ...performanceForm, actualWaterIntake: e.target.value })} placeholder="Water Intake" />
                            </div>
                            <div className="form-group">
                                <label>Keterangan</label>
                                <input type="text" value={performanceForm.keteranganPerformance} onChange={(e) => setPerformanceForm({ ...performanceForm, keteranganPerformance: e.target.value })} placeholder="Catatan performance" />
                            </div>
                        </div>
                    </>
                )

            case 'feed':
                return (
                    <>
                        <div className="form-group">
                            <label>Tanggal Pemakaian *</label>
                            <input type="date" value={feedForm.tanggalPemakaian} onChange={(e) => setFeedForm({ ...feedForm, tanggalPemakaian: e.target.value })} required />
                        </div>

                        <div style={{ marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontWeight: 600, fontSize: '0.9rem', color: '#2f5a3c' }}>Item Pakan</label>
                                <button type="button" onClick={addFeedItem} style={{
                                    background: 'rgba(47, 90, 60, 0.1)', color: '#2f5a3c', border: '1px dashed rgba(47, 90, 60, 0.3)',
                                    padding: '0.3rem 0.75rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                                }}>
                                    + Tambah Item
                                </button>
                            </div>

                            {feedForm.items.map((item, index) => (
                                <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-end' }}>
                                    <div className="form-group" style={{ flex: 2, marginBottom: 0 }}>
                                        {index === 0 && <label>Nama Pakan *</label>}
                                        <select value={item.kodePerlengkapan} onChange={(e) => updateFeedItem(index, 'kodePerlengkapan', e.target.value)} required>
                                            <option value="">-- Pilih Pakan --</option>
                                            {perlengkapanOptions.map(p => (
                                                <option key={p.KodePerlengkapan} value={p.KodePerlengkapan}>
                                                    {p.NamaPerlengkapan} (Stok: {p.totalStok} {p.Satuan || ''})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        {index === 0 && <label>Jumlah *</label>}
                                        <input type="number" value={item.jumlahPakan} onChange={(e) => updateFeedItem(index, 'jumlahPakan', parseInt(e.target.value))} required min="1" placeholder="Jumlah" />
                                    </div>
                                    {feedForm.items.length > 1 && (
                                        <button type="button" onClick={() => removeFeedItem(index)} style={{
                                            background: 'rgba(194, 59, 50, 0.1)', color: '#c23b32', border: 'none',
                                            padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', height: '40px', width: '40px',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                        }}>
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {perlengkapanOptions.length === 0 && (
                            <div style={{ background: 'rgba(229, 115, 0, 0.1)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', color: '#e57300' }}>
                                ⚠️ Tidak ada pakan tersedia di warehouse. Silakan tambahkan stok pakan terlebih dahulu.
                            </div>
                        )}
                    </>
                )

            case 'obat':
                return (
                    <>
                        <div className="form-group">
                            <label>Tanggal Penggunaan *</label>
                            <input type="date" value={obatForm.tanggalPenggunaan} onChange={(e) => setObatForm({ ...obatForm, tanggalPenggunaan: e.target.value })} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Pilih Obat *</label>
                                <select value={obatForm.kodePerlengkapan} onChange={(e) => setObatForm({ ...obatForm, kodePerlengkapan: e.target.value })} required>
                                    <option value="">-- Pilih Obat --</option>
                                    {perlengkapanOptions.map(p => (
                                        <option key={p.KodePerlengkapan} value={p.KodePerlengkapan}>
                                            {p.NamaPerlengkapan} (Stok: {p.totalStok} {p.Satuan || ''})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Jumlah Obat *</label>
                                <input type="number" value={obatForm.jumlahObat} onChange={(e) => setObatForm({ ...obatForm, jumlahObat: parseInt(e.target.value) })} required min="1" placeholder="Jumlah obat" />
                            </div>
                        </div>

                        {perlengkapanOptions.length === 0 && (
                            <div style={{ background: 'rgba(229, 115, 0, 0.1)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', color: '#e57300' }}>
                                ⚠️ Tidak ada obat tersedia di warehouse. Silakan tambahkan stok obat terlebih dahulu.
                            </div>
                        )}
                    </>
                )

            case 'perlengkapan':
                return (
                    <>
                        <div className="form-group">
                            <label>Tanggal Pemakaian *</label>
                            <input type="date" value={perlengkapanForm.tanggalPemakaian} onChange={(e) => setPerlengkapanForm({ ...perlengkapanForm, tanggalPemakaian: e.target.value })} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Pilih Perlengkapan *</label>
                                <select value={perlengkapanForm.kodePerlengkapan} onChange={(e) => setPerlengkapanForm({ ...perlengkapanForm, kodePerlengkapan: e.target.value })} required>
                                    <option value="">-- Pilih Perlengkapan --</option>
                                    {perlengkapanOptions.map(p => (
                                        <option key={p.KodePerlengkapan} value={p.KodePerlengkapan}>
                                            {p.NamaPerlengkapan} (Stok: {p.totalStok} {p.Satuan || ''})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Jumlah Pemakaian *</label>
                                <input type="number" value={perlengkapanForm.jumlahPemakaian} onChange={(e) => setPerlengkapanForm({ ...perlengkapanForm, jumlahPemakaian: parseInt(e.target.value) })} required min="1" placeholder="Jumlah pemakaian" />
                            </div>
                        </div>

                        {perlengkapanOptions.length === 0 && (
                            <div style={{ background: 'rgba(229, 115, 0, 0.1)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.85rem', color: '#e57300' }}>
                                ⚠️ Tidak ada peralatan tersedia di warehouse. Silakan tambahkan stok peralatan terlebih dahulu.
                            </div>
                        )}
                    </>
                )

            case 'kematian':
                return (
                    <>
                        <div className="form-group">
                            <label>Tanggal Kejadian *</label>
                            <input type="date" value={kematianForm.tanggalKejadian} onChange={(e) => setKematianForm({ ...kematianForm, tanggalKejadian: e.target.value })} required />
                        </div>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Jumlah Mati</label>
                                <input type="number" value={kematianForm.jumlahMati} onChange={(e) => setKematianForm({ ...kematianForm, jumlahMati: e.target.value })} min="0" placeholder="Jumlah ayam mati" />
                            </div>
                            <div className="form-group">
                                <label>Jumlah Reject</label>
                                <input type="number" value={kematianForm.jumlahReject} onChange={(e) => setKematianForm({ ...kematianForm, jumlahReject: e.target.value })} min="0" placeholder="Jumlah ayam reject" />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Keterangan</label>
                            <textarea value={kematianForm.keterangan} onChange={(e) => setKematianForm({ ...kematianForm, keterangan: e.target.value })} placeholder="Catatan tentang penyebab kematian..." rows="3" />
                        </div>
                    </>
                )

            default:
                return null
        }
    }

    if (loading) return (
        <div className="dashboard-page">
            <LoadingState text="Memuat data kandang..." />
        </div>
    )

    return (
        <div className="dashboard-page">
            <div className="page-header">
                <div className="page-title">
                    <h1>Manajemen Kandang</h1>
                    <p>Setup kandang, chick-in DOC, dan monitoring</p>
                </div>
                <button className="btn-primary" onClick={openCreateModal}>
                    + Tambah Kandang & Chick-In
                </button>
            </div>

            {kandangs.length === 0 ? (
                <EmptyState
                    title="Belum Ada Kandang"
                    message="Tambahkan kandang baru dan masukkan DOC yang tersedia"
                    actionLabel="Tambah Kandang"
                    onAction={openCreateModal}
                />
            ) : (
                <div className="page-content">
                    <DataTable columns={columns} data={kandangs} />
                </div>
            )}

            {/* === CREATE MODAL === */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Tambah Kandang & Chick-In"
                size="large"
            >
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-row">
                        <div className="form-group">
                            <label>Pilih Batch DOC *</label>
                            <select
                                value={formData.kodeDoc}
                                onChange={(e) => handleDocChange(e.target.value)}
                                required
                            >
                                <option value="">-- Pilih DOC Tersedia --</option>
                                {availableDocs.map(doc => (
                                    <option key={doc.KodeDOC} value={doc.KodeDOC}>
                                        {doc.KodeDOC} - {doc.BrandDOC} ({doc.JumlahTersedia || (doc.JumlahDiterima - (doc.JumlahMatiPraKandang || 0))} ekor tersedia)
                                    </option>
                                ))}
                            </select>
                            {availableDocs.length === 0 && (
                                <small style={{ color: '#c23b32', marginTop: '0.25rem' }}>
                                    Tidak ada DOC tersedia. Silakan terima Order DOC terlebih dahulu.
                                </small>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Jumlah DOC untuk Kandang ini *</label>
                            <input
                                type="number"
                                value={formData.jumlahDoc}
                                onChange={(e) => setFormData({ ...formData, jumlahDoc: e.target.value })}
                                required
                                min="1"
                                max={getMaxDoc()}
                                placeholder={`Max: ${getMaxDoc()} ekor`}
                            />
                            {formData.kodeDoc && (
                                <small style={{ color: '#5d7463' }}>
                                    Maks: {getMaxDoc()} ekor tersedia
                                </small>
                            )}
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Pilih Tim Kerja *</label>
                            <select
                                value={formData.kodeTim}
                                onChange={(e) => setFormData({ ...formData, kodeTim: e.target.value })}
                                required
                            >
                                <option value="">-- Pilih Tim --</option>
                                {teams.map(tim => (
                                    <option key={tim.KodeTim} value={tim.KodeTim}>
                                        {tim.NamaTim} ({tim.jumlahStaf || tim.JumlahAnggota} Anggota)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Durasi Cycle (hari)</label>
                            <input
                                type="number"
                                value={formData.durasiCycle}
                                onChange={(e) => setFormData({ ...formData, durasiCycle: e.target.value })}
                                min="1"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Panjang Kandang (m) *</label>
                            <input
                                type="number"
                                value={formData.panjangKandang}
                                onChange={(e) => setFormData({ ...formData, panjangKandang: e.target.value })}
                                required
                                min="1"
                                step="0.1"
                            />
                        </div>
                        <div className="form-group">
                            <label>Lebar Kandang (m) *</label>
                            <input
                                type="number"
                                value={formData.lebarKandang}
                                onChange={(e) => setFormData({ ...formData, lebarKandang: e.target.value })}
                                required
                                min="1"
                                step="0.1"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Jenis Lantai</label>
                            <select
                                value={formData.lantaiKandang}
                                onChange={(e) => setFormData({ ...formData, lantaiKandang: e.target.value })}
                            >
                                <option value="Sekam">Sekam</option>
                                <option value="Slat">Slat</option>
                                <option value="Panggung">Panggung</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Suhu Awal (°C)</label>
                            <input
                                type="number"
                                value={formData.suhuKandang}
                                onChange={(e) => setFormData({ ...formData, suhuKandang: e.target.value })}
                                step="0.1"
                            />
                        </div>
                    </div>

                    {/* Preview Calculation */}
                    {formData.kodeDoc && formData.panjangKandang && formData.lebarKandang && formData.jumlahDoc && (
                        <div style={{
                            background: 'linear-gradient(135deg, #f0f9ff, #e8f5e9)',
                            padding: '1.25rem',
                            borderRadius: '12px',
                            marginTop: '0.5rem',
                            border: '1px solid rgba(47, 90, 60, 0.15)'
                        }}>
                            <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#2f5a3c' }}>📋 Preview Chick-In</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                <div>
                                    <span style={{ color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Jumlah Ayam</span>
                                    <strong style={{ fontSize: '1.1rem', color: '#152416' }}>{parseInt(formData.jumlahDoc).toLocaleString()} Ekor</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Luas Kandang</span>
                                    <strong style={{ fontSize: '1.1rem', color: '#152416' }}>{(parseFloat(formData.panjangKandang) * parseFloat(formData.lebarKandang)).toFixed(1)} m²</strong>
                                </div>
                                <div>
                                    <span style={{ color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Kepadatan</span>
                                    <strong style={{
                                        fontSize: '1.1rem',
                                        color: parseFloat(calculateDensity()) > 15 ? '#c23b32' : '#152416'
                                    }}>
                                        {calculateDensity()} Ekor/m²
                                    </strong>
                                    {parseFloat(calculateDensity()) > 15 && (
                                        <small style={{ color: '#c23b32', display: 'block' }}>⚠️ Terlalu padat!</small>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Batal</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Menyimpan...' : 'Simpan Kandang & Chick-In'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* === DETAIL/MONITORING MODAL === */}
            <Modal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                title={`Monitor Kandang ${selectedKandang?.KodeKandang || ''}`}
                size="large"
            >
                {selectedKandang && (
                    <div>
                        {/* Summary Cards */}
                        <div className="detail-stats" style={{ marginBottom: '1.5rem' }}>
                            <div className="detail-stat">
                                <div className="value">{selectedKandang.PopulasiTerkini !== null ? parseInt(selectedKandang.PopulasiTerkini).toLocaleString() : (selectedKandang.JumlahDiterima || '-')}</div>
                                <div className="label">Populasi</div>
                            </div>
                            <div className="detail-stat">
                                <div className="value">{selectedKandang.UmurTerkini ?? '-'}</div>
                                <div className="label">Umur (hari)</div>
                            </div>
                            <div className="detail-stat">
                                <div className="value">{selectedKandang.BeratTerkini ?? '-'}</div>
                                <div className="label">Berat Rata-rata (g)</div>
                            </div>
                            <div className="detail-stat">
                                <div className="value" style={{ color: '#c23b32' }}>{selectedKandang.TotalKematian || 0}</div>
                                <div className="label">Total Kematian</div>
                            </div>
                            <div className="detail-stat">
                                <div className="value">{selectedKandang.SisaHariPanen ?? '-'}</div>
                                <div className="label">Sisa Hari Panen</div>
                            </div>
                        </div>

                        {/* Info */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '0.75rem',
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            background: 'rgba(47, 90, 60, 0.04)',
                            borderRadius: '12px'
                        }}>
                            <div><small style={{ color: '#5d7463' }}>DOC</small><div style={{ fontWeight: 600 }}>{selectedKandang.KodeDOC || '-'} ({selectedKandang.BrandDOC || '-'})</div></div>
                            <div><small style={{ color: '#5d7463' }}>Tim</small><div style={{ fontWeight: 600 }}>{selectedKandang.NamaTim || '-'}</div></div>
                            <div><small style={{ color: '#5d7463' }}>Ukuran</small><div style={{ fontWeight: 600 }}>{selectedKandang.PanjangKandang} x {selectedKandang.LebarKandang} m</div></div>
                            <div><small style={{ color: '#5d7463' }}>Lantai</small><div style={{ fontWeight: 600 }}>{selectedKandang.LantaiKandang || '-'}</div></div>
                            <div><small style={{ color: '#5d7463' }}>Suhu</small><div style={{ fontWeight: 600 }}>{selectedKandang.SuhuKandang}°C</div></div>
                            <div><small style={{ color: '#5d7463' }}>Tanggal Mulai</small><div style={{ fontWeight: 600 }}>{formatDate(selectedKandang.TanggalMulai)}</div></div>
                        </div>

                        {/* Tabs */}
                        <div className="tabs">
                            {detailTabs.map(tab => (
                                <button
                                    key={tab.id}
                                    className={`tab-btn ${detailTab === tab.id ? 'active' : ''}`}
                                    onClick={() => handleTabChange(tab.id)}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div style={{ minHeight: '200px' }}>
                            {renderDetailContent()}
                        </div>
                    </div>
                )}
            </Modal>

            {/* === CRUD ADD MODAL === */}
            <Modal
                isOpen={crudModalOpen}
                onClose={() => setCrudModalOpen(false)}
                title={getCrudModalTitle()}
                size="medium"
            >
                <form onSubmit={handleCrudSubmit} className="modal-form">
                    {renderCrudForm()}
                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={() => setCrudModalOpen(false)}>Batal</button>
                        <button type="submit" className="btn-primary" disabled={crudSaving}>
                            {crudSaving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}

export default DashboardKandang
