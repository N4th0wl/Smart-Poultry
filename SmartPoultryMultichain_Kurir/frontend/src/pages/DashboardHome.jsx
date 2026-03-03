import { useState, useEffect } from 'react'
import { KPICard, LoadingState } from '../components'
import { dashboardService } from '../services'

function DashboardHome() {
    const [stats, setStats] = useState(null)
    const [recent, setRecent] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [statsData, recentData] = await Promise.all([
                dashboardService.getStats(),
                dashboardService.getRecent()
            ])
            setStats(statsData)
            setRecent(recentData)
        } catch (error) {
            console.error('Dashboard load error:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status) => {
        const map = {
            'PICKUP': 'badge-pickup',
            'DALAM_PERJALANAN': 'badge-transit',
            'TERKIRIM': 'badge-delivered',
            'GAGAL': 'badge-failed'
        }
        return map[status] || ''
    }

    const getStatusLabel = (status) => {
        const map = {
            'PICKUP': 'Pickup',
            'DALAM_PERJALANAN': 'Dalam Perjalanan',
            'TERKIRIM': 'Terkirim',
            'GAGAL': 'Gagal'
        }
        return map[status] || status
    }

    if (loading) return <LoadingState />

    return (
        <div>
            <div className="page-header">
                <h2>Overview</h2>
            </div>

            <div className="kpi-grid">
                <KPICard label="Total Kurir Aktif" value={stats?.totalKurir || 0} accent />
                <KPICard label="Total Pengiriman" value={stats?.totalPengiriman || 0} />
                <KPICard label="Pengiriman Aktif" value={stats?.pengirimanAktif || 0} accent />
                <KPICard label="Selesai" value={stats?.pengirimanSelesai || 0} />
                <KPICard label="Gagal" value={stats?.pengirimanGagal || 0} />
                <KPICard label="Farm → Processor" value={stats?.farmToProcessor || 0} />
                <KPICard label="Processor → Retailer" value={stats?.processorToRetailer || 0} />
                <KPICard label="Blockchain Chains" value={stats?.totalChains || 0} />
            </div>

            <div className="section-card">
                <h3>Pengiriman Terbaru</h3>
                {recent.length === 0 ? (
                    <p style={{ color: 'rgba(200,215,240,0.4)', fontSize: '.9rem' }}>Belum ada pengiriman</p>
                ) : (
                    <div className="table-wrapper" style={{ marginTop: '12px' }}>
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Tipe</th>
                                    <th>Asal</th>
                                    <th>Tujuan</th>
                                    <th>Kurir</th>
                                    <th>Tanggal</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recent.map(s => (
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DashboardHome
