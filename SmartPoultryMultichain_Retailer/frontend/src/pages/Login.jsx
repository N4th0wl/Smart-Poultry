import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../components/ToastProvider'
import useAuthStore from '../stores/authStore'
import apiClient from '../services/apiClient'

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuthStore()
    const { showToast } = useToast()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPw, setShowPw] = useState(false)
    const [loading, setLoading] = useState(false)

    async function onSubmit(e) {
        e.preventDefault()
        if (!email || !password) {
            showToast({ title: 'Data tidak lengkap', description: 'Email dan password harus diisi.', status: 'warning' })
            return
        }
        setLoading(true)
        try {
            const res = await apiClient.post('/auth/login', { email, password })
            login(res.data.user, res.data.token)
            showToast({ title: 'Login berhasil!', description: `Selamat datang, ${res.data.user.nama}`, status: 'success' })
            navigate('/app/dashboard')
        } catch (err) {
            showToast({
                title: 'Login gagal',
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
                <div className="sp-authBrand">
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0D5C3E', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
                        SmartPoultry
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1A8A5C', marginTop: -4 }}>
                        Retailer
                    </div>
                    <p style={{ fontSize: '0.95rem', color: '#6B7B74', maxWidth: 340, margin: '8px auto 0', lineHeight: 1.6 }}>
                        Sistem manajemen retailer terintegrasi dengan blockchain untuk transparansi rantai pasok
                    </p>
                </div>

                <form className="sp-form" onSubmit={onSubmit}>
                    <div className="sp-authTitle">Masuk</div>
                    <div className="sp-authSubtitle" style={{ marginBottom: 8 }}>
                        Gunakan email dan password yang terdaftar
                    </div>

                    <label className="sp-field">
                        <span className="sp-label">Email</span>
                        <input
                            className="sp-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="nama@contoh.com"
                            type="email"
                            required
                            id="login-email"
                        />
                    </label>

                    <label className="sp-field">
                        <span className="sp-label">Password</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                            <input
                                className="sp-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                type={showPw ? 'text' : 'password'}
                                required
                                id="login-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(!showPw)}
                                style={{
                                    border: '1.5px solid rgba(13,92,62,0.12)',
                                    background: '#F2FBF7',
                                    color: '#0D5C3E',
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

                    <button className="sp-btn" type="submit" disabled={loading} id="login-submit">
                        {loading ? 'Memproses...' : 'Masuk'}
                    </button>

                    <div className="sp-authFooter">
                        Belum punya akun? <Link to="/register" className="sp-link">Daftar di sini</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}
