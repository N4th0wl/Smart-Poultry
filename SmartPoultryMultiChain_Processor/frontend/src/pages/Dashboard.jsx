import { useEffect, useState } from 'react'
import StatCard from '../components/StatCard'
import useAuthStore from '../stores/authStore'
import apiClient from '../services/apiClient'

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState(null)
  const [apiStatus, setApiStatus] = useState('Memeriksa...')

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        await apiClient.get('/health')
        if (mounted) setApiStatus('Terhubung')
      } catch {
        if (mounted) setApiStatus('Belum terhubung')
      }
      try {
        const res = await apiClient.get('/dashboard/stats')
        if (mounted) setStats(res.data.data)
      } catch {
        // stats not available
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  const isAdmin = user?.role === 'ADMIN'

  return (
    <div>
      {/* Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #3C1111 0%, #5C1A1A 50%, #8B1A1A 100%)',
        color: '#FFF5F2',
        borderRadius: 20,
        padding: '32px 28px',
        marginBottom: 24,
        animation: 'fadeRise 0.7s ease both',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle decorative circle */}
        <div style={{
          position: 'absolute', top: -60, right: -40,
          width: 200, height: 200, borderRadius: '50%',
          background: 'rgba(255,255,255,0.03)',
        }} />

        <div style={{
          textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: '0.2em',
          color: 'rgba(255,245,242,0.5)', marginBottom: 8, fontWeight: 600,
        }}>
          SmartPoultry Processor
        </div>
        <h2 style={{ fontSize: '1.45rem', margin: '0 0 6px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {isAdmin ? 'Dashboard Admin' : 'Dashboard Karyawan'}
        </h2>
        <p style={{ margin: 0, color: 'rgba(255,245,242,0.65)', fontSize: '0.9rem' }}>
          Selamat datang, {user?.nama || 'User'}! Kelola aktivitas produksi ayam
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12, marginTop: 22,
        }}>
          {[
            { label: 'Total Order', value: stats?.totalOrders ?? '-' },
            { label: 'Diterima', value: stats?.ordersDiterima ?? '-' },
            { label: 'Produksi', value: stats?.totalProduksi ?? '-' },
            { label: 'API', value: apiStatus },
          ].map((m, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,245,242,0.5)', fontWeight: 500 }}>{m.label}</span>
              <strong style={{ display: 'block', fontSize: '1.2rem', marginTop: 2 }}>{m.value}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="sp-grid cols-4">
        <StatCard label="Total Order" value={stats?.totalOrders ?? '-'} hint="Semua order" />
        <StatCard label="Order Diterima" value={stats?.ordersDiterima ?? '-'} hint="Siap produksi" />
        <StatCard label="Total Produksi" value={stats?.totalProduksi ?? '-'} hint="Record produksi" />
        {isAdmin ? (
          <StatCard label="Total Pengiriman" value={stats?.totalPengiriman ?? '-'} hint="Pengiriman keluar" />
        ) : (
          <StatCard label="Tugas Belum" value={stats?.tugasBelum ?? '-'} hint="Belum dikerjakan" />
        )}
      </div>

      {isAdmin && (
        <div className="sp-grid cols-4" style={{ marginTop: 16 }}>
          <StatCard label="Karyawan Aktif" value={stats?.totalKaryawan ?? '-'} hint="Terdaftar" />
          <StatCard label="Total Tugas" value={stats?.totalTugas ?? '-'} hint="Semua tugas" />
          <StatCard label="Tugas Berlangsung" value={stats?.tugasSedang ?? '-'} hint="Sedang dikerjakan" />
          <StatCard label="Order Selesai" value={stats?.ordersSelesai ?? '-'} hint="Terkirim" />
        </div>
      )}

      <div className="sp-section">
        <div className="sp-sectionHeader">
          <div className="sp-sectionTitle">Order Terbaru</div>
        </div>

        <div className="sp-card">
          <div className="sp-cardBody">
            <table className="sp-table">
              <thead>
                <tr>
                  <th>Kode Order</th>
                  <th>Peternakan</th>
                  <th>Jenis Ayam</th>
                  <th>Status</th>
                  <th>Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {stats?.recentOrders?.length > 0 ? (
                  stats.recentOrders.map((order) => (
                    <tr key={order.KodeOrder}>
                      <td><strong>{order.KodeOrder}</strong></td>
                      <td>{order.NamaPeternakan}</td>
                      <td>{order.JenisAyam}</td>
                      <td><span className={`sp-badge ${order.StatusOrder === 'SELESAI' ? 'success' : order.StatusOrder === 'DITERIMA' ? 'info' : 'muted'}`}>{order.StatusOrder}</span></td>
                      <td>{order.TanggalOrder}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="sp-empty">
                      {apiStatus === 'Terhubung' ? 'Belum ada order.' : 'Menunggu koneksi database...'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
