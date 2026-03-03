import { useState, useEffect } from 'react'
import { docService } from '../services'
import { DataTable, Modal, LoadingState, EmptyState } from '../components'
import toast from 'react-hot-toast'
import './DashboardPage.css'

function DashboardDoc() {
  const [docList, setDocList] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)

  const fetchData = async () => {
    try {
      setLoading(true)
      const data = await docService.getDoc()
      setDocList(data || [])
    } catch (error) {
      console.error('Failed to fetch DOC:', error)
      toast.error('Gagal memuat data DOC')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const viewDetail = (doc) => {
    setSelectedDoc(doc)
    setDetailModalOpen(true)
  }

  const formatDate = (dateStr) => {
    return dateStr ? new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }) : '-'
  }

  const getKondisiBadge = (kondisi) => {
    if (!kondisi) return <span className="status-badge" style={{ background: '#94a3b8', color: 'white' }}>Belum Dicatat</span>
    const map = {
      'BAIK': { color: '#16a34a', bg: 'rgba(34,197,94,0.1)', label: '🟢 Baik' },
      'CUKUP BAIK': { color: '#ca8a04', bg: 'rgba(234,179,8,0.1)', label: '🟡 Cukup Baik' },
      'KURANG BAIK': { color: '#ea580c', bg: 'rgba(249,115,22,0.1)', label: '🟠 Kurang Baik' },
      'BURUK': { color: '#dc2626', bg: 'rgba(239,68,68,0.1)', label: '🔴 Buruk' }
    }
    const style = map[kondisi] || map['BAIK']
    return (
      <span style={{
        color: style.color,
        background: style.bg,
        padding: '0.25rem 0.75rem',
        borderRadius: '99px',
        fontSize: '0.8rem',
        fontWeight: 600
      }}>
        {style.label}
      </span>
    )
  }

  const getHealthPercent = (doc) => {
    const diterima = doc.JumlahDiterima || 0
    const mati = doc.JumlahMatiPraKandang || 0
    if (diterima === 0) return 0
    return (((diterima - mati) / diterima) * 100).toFixed(1)
  }

  // Summary stats
  const totalDOC = docList.reduce((sum, d) => sum + (d.JumlahDiterima || 0), 0)
  const totalMati = docList.reduce((sum, d) => sum + (d.JumlahMatiPraKandang || 0), 0)
  const totalSehat = totalDOC - totalMati
  const totalDitempatkan = docList.filter(d => d.KodeKandang).length
  const totalBelumDitempatkan = docList.filter(d => !d.KodeKandang).length

  const columns = [
    { key: 'KodeDOC', label: 'Kode DOC', sortable: true },
    {
      key: 'BrandDOC',
      label: 'Brand',
      sortable: true,
      render: (val) => val || '-'
    },
    {
      key: 'TipeAyam',
      label: 'Tipe',
      sortable: true,
      render: (val) => val ? (
        <span style={{
          background: 'rgba(59,130,246,0.1)',
          color: '#2563eb',
          padding: '0.2rem 0.6rem',
          borderRadius: '99px',
          fontSize: '0.8rem',
          fontWeight: 600
        }}>{val}</span>
      ) : '-'
    },
    {
      key: 'JumlahDiterima',
      label: 'Diterima',
      sortable: true,
      render: (val) => `${(val || 0).toLocaleString()} ekor`
    },
    {
      key: 'JumlahMatiPraKandang',
      label: 'Mati/DOA',
      sortable: true,
      render: (val) => (
        <span style={{ color: val > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>
          {(val || 0).toLocaleString()}
        </span>
      )
    },
    {
      key: 'KondisiAwal',
      label: 'Kondisi',
      sortable: true,
      render: (val) => getKondisiBadge(val)
    },
    {
      key: 'KodeKandang',
      label: 'Kandang',
      sortable: true,
      render: (val) => val
        ? <span style={{ color: '#16a34a', fontWeight: 600 }}>{val}</span>
        : <span style={{ color: '#ca8a04', fontStyle: 'italic' }}>Belum ditempatkan</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_, row) => (
        <div className="table-actions">
          <button className="btn-action btn-view" onClick={(e) => { e.stopPropagation(); viewDetail(row); }}>
            Detail
          </button>
        </div>
      )
    }
  ]

  if (loading) {
    return (
      <div className="dashboard-page">
        <LoadingState variant="spinner" text="Memuat data DOC..." />
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div className="page-title">
          <h1>Penerimaan DOC</h1>
          <p>Day-Old Chick yang diterima dari supplier</p>
        </div>
      </div>

      {/* Summary Cards */}
      {docList.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#15803d', fontWeight: 500, marginBottom: '0.25rem' }}>Total DOC Sehat</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#166534' }}>{totalSehat.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#16a34a' }}>ekor aktif</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 500, marginBottom: '0.25rem' }}>Total DOA / Mati</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{totalMati.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444' }}>
              {totalDOC > 0 ? `${((totalMati / totalDOC) * 100).toFixed(2)}% mortalitas` : '-'}
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 500, marginBottom: '0.25rem' }}>Sudah Di Kandang</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb' }}>{totalDitempatkan}</div>
            <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>batch ditempatkan</div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
            border: '1px solid rgba(234,179,8,0.2)',
            borderRadius: '0.75rem',
            padding: '1rem 1.25rem'
          }}>
            <div style={{ fontSize: '0.8rem', color: '#92400e', fontWeight: 500, marginBottom: '0.25rem' }}>Belum Ditempatkan</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>{totalBelumDitempatkan}</div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b' }}>batch menunggu</div>
          </div>
        </div>
      )}

      {docList.length === 0 ? (
        <EmptyState
          title="Belum Ada DOC"
          message="DOC akan muncul setelah ada penerimaan order DOC dari supplier"
        />
      ) : (
        <div className="page-content">
          <DataTable columns={columns} data={docList} pageSize={10} />
        </div>
      )}

      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`Detail DOC ${selectedDoc?.KodeDOC || ''}`}
        size="medium"
      >
        {selectedDoc && (() => {
          const sehat = (selectedDoc.JumlahDiterima || 0) - (selectedDoc.JumlahMatiPraKandang || 0)
          const pctSehat = getHealthPercent(selectedDoc)

          return (
            <div className="detail-panel" style={{ margin: 0, boxShadow: 'none' }}>
              {/* Summary Stats */}
              <div className="detail-stats">
                <div className="detail-stat">
                  <div className="value" style={{ color: '#16a34a' }}>{sehat.toLocaleString()}</div>
                  <div className="label">DOC Sehat</div>
                </div>
                <div className="detail-stat">
                  <div className="value" style={{ color: '#dc2626' }}>{(selectedDoc.JumlahMatiPraKandang || 0).toLocaleString()}</div>
                  <div className="label">Mati / DOA</div>
                </div>
                <div className="detail-stat">
                  <div className="value">{selectedDoc.JumlahDiterima?.toLocaleString()}</div>
                  <div className="label">Total Diterima</div>
                </div>
              </div>

              {/* Health Progress Bar */}
              {selectedDoc.JumlahDiterima > 0 && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  background: 'rgba(241,245,249,0.8)',
                  borderRadius: '0.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#475569' }}>Kesehatan DOC</span>
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
                </div>
              )}

              {/* Detail Table */}
              <div style={{ marginTop: '1.5rem' }}>
                <table style={{ width: '100%' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', width: '40%', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Kode Penerimaan</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(31,59,40,0.06)' }}>{selectedDoc.KodePenerimaan || '-'}</td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Nama Penerima</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(31,59,40,0.06)' }}>
                        {selectedDoc.NamaPenerima || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Tanggal Penerimaan</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(31,59,40,0.06)' }}>
                        {formatDate(selectedDoc.TanggalPenerimaan)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Kode Order</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(31,59,40,0.06)' }}>
                        {selectedDoc.KodeOrder || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Brand DOC</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(31,59,40,0.06)' }}>
                        {selectedDoc.BrandDOC || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Tipe Ayam</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(31,59,40,0.06)' }}>
                        {selectedDoc.TipeAyam || '-'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Kondisi Awal</td>
                      <td style={{ padding: '0.6rem 0.5rem', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>
                        {getKondisiBadge(selectedDoc.KondisiAwal)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Jumlah Dipesan</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(31,59,40,0.06)' }}>
                        {(selectedDoc.JumlahDipesan || 0).toLocaleString()} ekor
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463', borderBottom: '1px solid rgba(31,59,40,0.06)' }}>Kandang</td>
                      <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600, borderBottom: '1px solid rgba(31,59,40,0.06)' }}>
                        {selectedDoc.KodeKandang || <span style={{ color: '#ca8a04', fontStyle: 'italic' }}>Belum ditempatkan</span>}
                      </td>
                    </tr>
                    {selectedDoc.TanggalMasukKandang && (
                      <tr>
                        <td style={{ padding: '0.6rem 0.5rem', color: '#5d7463' }}>Tanggal Masuk Kandang</td>
                        <td style={{ padding: '0.6rem 0.5rem', fontWeight: 600 }}>
                          {formatDate(selectedDoc.TanggalMasukKandang)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}

export default DashboardDoc
