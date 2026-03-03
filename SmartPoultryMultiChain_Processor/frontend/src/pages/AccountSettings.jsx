import { useState } from 'react'
import { useToast } from '../components/ToastProvider'
import useAuthStore from '../stores/authStore'
import apiClient from '../services/apiClient'

export default function AccountSettings() {
  const { user, updateUser } = useAuthStore()
  const { showToast } = useToast()
  const [name, setName] = useState(user?.nama || '')
  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiClient.put('/auth/me', { namaProcessor: name })
      updateUser({ ...user, nama: name })
      showToast({ title: 'Berhasil', description: 'Profil diperbarui.', status: 'success' })
    } catch (err) {
      showToast({ title: 'Gagal', description: err.response?.data?.message || 'Gagal memperbarui.', status: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const initials = (user?.nama || 'U').slice(0, 2).toUpperCase()

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      {/* Page Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 20, flexWrap: 'wrap', marginBottom: 32, padding: '28px 32px',
        background: 'linear-gradient(135deg, #3C1111 0%, #5C1A1A 50%, #8B1A1A 100%)',
        borderRadius: 20, color: '#FFF5F2',
        boxShadow: '0 4px 12px rgba(139,26,26,0.12), 0 16px 40px rgba(44,24,16,0.1)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -50, right: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: 'rgba(255,245,242,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.05em',
            color: '#FFF5F2', border: '1.5px solid rgba(255,245,242,0.15)',
          }}>
            {initials}
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.01em' }}>
              Pengaturan Akun
            </h1>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255,245,242,0.6)' }}>
              Kelola informasi akun Anda
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', background: 'rgba(255,245,242,0.1)',
          borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
          color: 'rgba(255,245,242,0.7)', border: '1px solid rgba(255,245,242,0.08)',
          position: 'relative', zIndex: 1,
        }}>
          ● {user?.role || 'User'}
        </div>
      </div>

      {/* Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Account Info Card */}
        <div className="sp-card" style={{ gridColumn: '1 / -1' }}>
          <div className="sp-cardHeader">Informasi Akun</div>
          <div className="sp-cardBody">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 14,
            }}>
              {[
                { label: 'Email', value: user?.email || '-' },
                { label: 'Role', value: user?.role || '-' },
                { label: 'Status', value: null, isStatus: true },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '14px 18px', borderRadius: 12,
                  background: '#FAF7F4', border: '1px solid rgba(139,26,26,0.04)',
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7A6B63' }}>
                    {item.label}
                  </div>
                  {item.isStatus ? (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontSize: '0.88rem', fontWeight: 600, color: '#16a34a', marginTop: 6,
                    }}>
                      <span style={{
                        width: 7, height: 7, borderRadius: '50%', background: '#16a34a',
                        boxShadow: '0 0 8px rgba(22,163,74,0.5)', animation: 'statusPulse 2s ease-in-out infinite',
                      }} />
                      Aktif
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: 6, color: '#2C1810' }}>
                      {item.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Edit Profile Card */}
        <div className="sp-card">
          <div className="sp-cardHeader">Edit Profil</div>
          <div className="sp-cardBody">
            <form className="sp-form" onSubmit={handleSave}>
              <label className="sp-field">
                <span className="sp-label">Email</span>
                <input className="sp-input" value={user?.email || ''} disabled />
              </label>
              <label className="sp-field">
                <span className="sp-label">Nama Processor</span>
                <input className="sp-input" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="sp-field">
                <span className="sp-label">Role</span>
                <input className="sp-input" value={user?.role || ''} disabled />
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
                <button className="sp-btn" type="submit" disabled={loading}>
                  {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Security Card */}
        <div className="sp-card">
          <div className="sp-cardHeader">Keamanan</div>
          <div className="sp-cardBody">
            <p style={{ color: '#7A6B63', fontSize: '0.9rem', lineHeight: 1.7 }}>
              Untuk mengubah password Anda, silakan hubungi administrator sistem.
              Password yang kuat harus memiliki kombinasi huruf besar, huruf kecil, angka, dan simbol.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
