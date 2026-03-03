import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import useAuthStore from '../stores/authStore'
import apiClient from '../services/apiClient'

function getPasswordStrength(pw) {
    if (!pw) return { level: '', label: '', width: '0%' }
    let score = 0
    if (pw.length >= 6) score++
    if (pw.length >= 8) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++

    if (score <= 1) return { level: 'weak', label: 'Lemah', width: '20%' }
    if (score === 2) return { level: 'mid', label: 'Sedang', width: '45%' }
    if (score === 3) return { level: 'good', label: 'Baik', width: '70%' }
    return { level: 'strong', label: 'Kuat', width: '100%' }
}

const strengthColors = {
    weak: 'linear-gradient(90deg, #DC2626, #EF4444)',
    mid: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
    good: 'linear-gradient(90deg, #16A34A, #22C55E)',
    strong: 'linear-gradient(90deg, #059669, #10B981)',
}

export default function Register() {
    const navigate = useNavigate()
    const { login } = useAuthStore()
    const { showToast } = useToast()
    const [form, setForm] = useState({ email: '', namaProcessor: '', password: '', confirmPassword: '' })
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))
    const strength = getPasswordStrength(form.password)

    async function onSubmit(e) {
        e.preventDefault()
        const { email, namaProcessor, password, confirmPassword } = form

        if (!email || !namaProcessor || !password || !confirmPassword) {
            showToast({ title: 'Data tidak lengkap', description: 'Semua field harus diisi.', status: 'warning' })
            return
        }
        if (password !== confirmPassword) {
            showToast({ title: 'Password tidak cocok', description: 'Password dan konfirmasi password harus sama.', status: 'error' })
            return
        }
        if (password.length < 6) {
            showToast({ title: 'Password terlalu pendek', description: 'Password minimal 6 karakter.', status: 'warning' })
            return
        }

        setLoading(true)
        try {
            const res = await apiClient.post('/auth/register', form)
            login(res.data.user, res.data.token)
            showToast({ title: 'Registrasi berhasil!', description: `Selamat datang, ${res.data.user.nama}`, status: 'success' })
            navigate('/app/dashboard')
        } catch (err) {
            showToast({
                title: 'Registrasi gagal',
                description: err.response?.data?.message || 'Terjadi kesalahan. Coba lagi.',
                status: 'error',
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="sp-auth">
            <div className="sp-authCard">
                {/* Brand side */}
                <div className="sp-authBrand">
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#8B1A1A', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                        SmartPoultry
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#A52422', marginTop: -4 }}>
                        Processor
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#7A6B63', maxWidth: 360, margin: '8px auto 0', lineHeight: 1.6 }}>
                        Buat akun untuk mengakses sistem manajemen processor yang terintegrasi blockchain
                    </p>
                </div>

                {/* Form side */}
                <form className="sp-form" onSubmit={onSubmit}>
                    <div className="sp-authTitle">Daftar Akun</div>
                    <div className="sp-authSubtitle" style={{ marginBottom: 4 }}>
                        Buat akun baru untuk mengakses sistem processor
                    </div>

                    <label className="sp-field">
                        <span className="sp-label">Email</span>
                        <input className="sp-input" value={form.email} onChange={handleChange('email')} placeholder="nama@contoh.com" type="email" required id="register-email" />
                    </label>

                    <label className="sp-field">
                        <span className="sp-label">Nama Processor</span>
                        <input className="sp-input" value={form.namaProcessor} onChange={handleChange('namaProcessor')} placeholder="Nama perusahaan processor" required id="register-nama" />
                    </label>

                    <label className="sp-field">
                        <span className="sp-label">Password</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                            <input className="sp-input" value={form.password} onChange={handleChange('password')} placeholder="Minimal 6 karakter" type={showPw ? 'text' : 'password'} required id="register-password" />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                style={{
                                    border: '1.5px solid rgba(139,26,26,0.12)',
                                    background: '#FFF9F6',
                                    color: '#8B1A1A',
                                    padding: '12px 14px',
                                    borderRadius: 12,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                }}
                            >
                                {showPw ? '🙈' : '👁'}
                            </button>
                        </div>
                    </label>

                    {form.password && (
                        <div style={{ display: 'grid', gap: 6, fontSize: '0.82rem', color: '#7A6B63' }}>
                            <div style={{ height: 6, borderRadius: 999, background: '#F5EFEA', overflow: 'hidden' }}>
                                <span style={{
                                    display: 'block', height: '100%', borderRadius: 999,
                                    background: strengthColors[strength.level] || '#ddd',
                                    width: strength.width, transition: 'width 0.3s ease',
                                }} />
                            </div>
                            <span style={{ fontWeight: 600 }}>Kekuatan: {strength.label}</span>
                        </div>
                    )}

                    <label className="sp-field">
                        <span className="sp-label">Konfirmasi Password</span>
                        <input className="sp-input" value={form.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="Ulangi password" type="password" required id="register-confirm" />
                    </label>

                    <button className="sp-btn" type="submit" disabled={loading} id="register-submit">
                        {loading ? 'Memproses...' : 'Daftar'}
                    </button>

                    <div className="sp-authFooter">
                        Sudah punya akun? <Link to="/login" className="sp-link">Masuk di sini</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
