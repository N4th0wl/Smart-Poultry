import { useState, useEffect } from 'react'
import { authService } from '../services'
import toast from 'react-hot-toast'
import '../styles/DashboardSettings.css'

function DashboardSettings() {
    const [user, setUser] = useState(() => authService.getUser())
    const [profile, setProfile] = useState({
        namaPeternakan: '',
        lokasiPeternakan: '',
        email: ''
    })
    const [passwords, setPasswords] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [loading, setLoading] = useState({
        profile: false,
        password: false
    })
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    useEffect(() => {
        loadProfile()
    }, [])

    const loadProfile = async () => {
        try {
            const userData = await authService.getCurrentUser()
            setProfile({
                namaPeternakan: userData.namaPeternakan || '',
                lokasiPeternakan: userData.lokasiPeternakan || '',
                email: userData.email || ''
            })
        } catch (error) {
            toast.error('Gagal memuat data profil')
        }
    }

    const handleProfileUpdate = async (e) => {
        e.preventDefault()
        setLoading(prev => ({ ...prev, profile: true }))
        try {
            const response = await authService.updateProfile({
                namaPeternakan: profile.namaPeternakan,
                lokasiPeternakan: profile.lokasiPeternakan
            })
            if (response.user) {
                localStorage.setItem('user', JSON.stringify(response.user))
                setUser(response.user)
            }
            toast.success('Profil berhasil diperbarui!')
        } catch (error) {
            toast.error('Gagal memperbarui profil')
        } finally {
            setLoading(prev => ({ ...prev, profile: false }))
        }
    }

    const handlePasswordUpdate = async (e) => {
        e.preventDefault()
        if (passwords.newPassword !== passwords.confirmPassword) {
            toast.error('Konfirmasi password tidak cocok')
            return
        }

        if (passwords.newPassword.length < 6) {
            toast.error('Password baru minimal 6 karakter')
            return
        }

        setLoading(prev => ({ ...prev, password: true }))
        try {
            await authService.updatePassword(
                passwords.currentPassword,
                passwords.newPassword
            )
            toast.success('Password berhasil diperbarui!')
            setPasswords({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            })
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal memperbarui password')
        } finally {
            setLoading(prev => ({ ...prev, password: false }))
        }
    }

    const getInitials = (name) => {
        if (!name) return '?'
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <div className="settings-page">
            {/* Page Header */}
            <div className="settings-page-header">
                <div className="settings-header-content">
                    <div className="settings-avatar-container">
                        <div className="settings-avatar">
                            {getInitials(profile.namaPeternakan)}
                        </div>
                        <div className="settings-avatar-ring" />
                    </div>
                    <div className="settings-header-text">
                        <h1 id="settings-title">Pengaturan Akun</h1>
                        <p className="settings-subtitle">
                            Kelola informasi peternakan dan keamanan akun Anda
                        </p>
                    </div>
                </div>
                <div className="settings-header-badge">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Terproteksi</span>
                </div>
            </div>

            <div className="settings-content-grid">
                {/* Profile Section */}
                <section className="settings-card settings-card-profile" id="settings-profile">
                    <div className="settings-card-header">
                        <div className="settings-card-icon settings-card-icon-green">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                        </div>
                        <div>
                            <h2>Informasi Peternakan</h2>
                            <p className="settings-card-desc">
                                Data peternakan yang muncul pada dashboard dan laporan
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="settings-form">
                        <div className="settings-field">
                            <label htmlFor="settings-email">Alamat Email</label>
                            <div className="settings-input-wrapper settings-input-disabled">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <input
                                    id="settings-email"
                                    type="text"
                                    value={profile.email}
                                    disabled
                                />
                            </div>
                            <span className="settings-hint">Email tidak dapat diubah</span>
                        </div>

                        <div className="settings-field">
                            <label htmlFor="settings-nama-peternakan">Nama Peternakan</label>
                            <div className="settings-input-wrapper">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                                <input
                                    id="settings-nama-peternakan"
                                    type="text"
                                    value={profile.namaPeternakan}
                                    onChange={(e) => setProfile({ ...profile, namaPeternakan: e.target.value })}
                                    required
                                    placeholder="Masukkan nama peternakan"
                                />
                            </div>
                        </div>

                        <div className="settings-field">
                            <label htmlFor="settings-lokasi">Lokasi Peternakan</label>
                            <div className="settings-input-wrapper">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                    <circle cx="12" cy="10" r="3" />
                                </svg>
                                <input
                                    id="settings-lokasi"
                                    type="text"
                                    value={profile.lokasiPeternakan}
                                    onChange={(e) => setProfile({ ...profile, lokasiPeternakan: e.target.value })}
                                    required
                                    placeholder="Masukkan lokasi peternakan"
                                />
                            </div>
                        </div>

                        <div className="settings-form-footer">
                            <button
                                id="settings-save-profile-btn"
                                type="submit"
                                className="settings-btn settings-btn-primary"
                                disabled={loading.profile}
                            >
                                {loading.profile ? (
                                    <>
                                        <span className="settings-spinner" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        Simpan Perubahan
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Password Section */}
                <section className="settings-card settings-card-password" id="settings-password">
                    <div className="settings-card-header">
                        <div className="settings-card-icon settings-card-icon-amber">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                        </div>
                        <div>
                            <h2>Keamanan Akun</h2>
                            <p className="settings-card-desc">
                                Perbarui password untuk menjaga keamanan akun Anda
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handlePasswordUpdate} className="settings-form">
                        <div className="settings-field">
                            <label htmlFor="settings-current-pw">Password Saat Ini</label>
                            <div className="settings-input-wrapper">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                                </svg>
                                <input
                                    id="settings-current-pw"
                                    type={showCurrentPassword ? 'text' : 'password'}
                                    value={passwords.currentPassword}
                                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                                    required
                                    placeholder="Masukkan password saat ini"
                                />
                                <button
                                    type="button"
                                    className="settings-toggle-pw"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                    tabIndex={-1}
                                >
                                    {showCurrentPassword ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="settings-field">
                            <label htmlFor="settings-new-pw">Password Baru</label>
                            <div className="settings-input-wrapper">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <input
                                    id="settings-new-pw"
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={passwords.newPassword}
                                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                                    required
                                    placeholder="Masukkan password baru"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="settings-toggle-pw"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    tabIndex={-1}
                                >
                                    {showNewPassword ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <span className="settings-hint">Minimal 6 karakter</span>
                        </div>

                        <div className="settings-field">
                            <label htmlFor="settings-confirm-pw">Konfirmasi Password Baru</label>
                            <div className="settings-input-wrapper">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                                <input
                                    id="settings-confirm-pw"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={passwords.confirmPassword}
                                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                                    required
                                    placeholder="Ulangi password baru"
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    className="settings-toggle-pw"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    tabIndex={-1}
                                >
                                    {showConfirmPassword ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                                <span className="settings-hint settings-hint-error">
                                    Password tidak cocok
                                </span>
                            )}
                            {passwords.confirmPassword && passwords.newPassword === passwords.confirmPassword && passwords.confirmPassword.length >= 6 && (
                                <span className="settings-hint settings-hint-success">
                                    ✓ Password cocok
                                </span>
                            )}
                        </div>

                        <div className="settings-form-footer">
                            <button
                                id="settings-change-pw-btn"
                                type="submit"
                                className="settings-btn settings-btn-amber"
                                disabled={loading.password || passwords.newPassword !== passwords.confirmPassword}
                            >
                                {loading.password ? (
                                    <>
                                        <span className="settings-spinner" />
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                        </svg>
                                        Ubah Password
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </section>

                {/* Info Card */}
                <section className="settings-card settings-card-info" id="settings-account-info">
                    <div className="settings-card-header">
                        <div className="settings-card-icon settings-card-icon-blue">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="16" x2="12" y2="12" />
                                <line x1="12" y1="8" x2="12.01" y2="8" />
                            </svg>
                        </div>
                        <div>
                            <h2>Informasi Akun</h2>
                            <p className="settings-card-desc">Detail teknis untuk referensi</p>
                        </div>
                    </div>

                    <div className="settings-info-grid">
                        <div className="settings-info-item">
                            <span className="settings-info-label">User ID</span>
                            <span className="settings-info-value">{user?.userId || '-'}</span>
                        </div>
                        <div className="settings-info-item">
                            <span className="settings-info-label">Kode Peternakan</span>
                            <span className="settings-info-value settings-info-code">
                                {user?.kodePeternakan || '-'}
                            </span>
                        </div>
                        <div className="settings-info-item">
                            <span className="settings-info-label">Email Terdaftar</span>
                            <span className="settings-info-value">{profile.email || '-'}</span>
                        </div>
                        <div className="settings-info-item">
                            <span className="settings-info-label">Status</span>
                            <span className="settings-info-value">
                                <span className="settings-status-active">
                                    <span className="settings-status-dot" />
                                    Aktif
                                </span>
                            </span>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    )
}

export default DashboardSettings
