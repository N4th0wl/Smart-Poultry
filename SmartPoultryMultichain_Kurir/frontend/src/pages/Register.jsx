import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services'
import '../styles/Login.css'

function Register() {
    const navigate = useNavigate()
    const { isAuthenticated, isAdmin, isLoading } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [namaPerusahaan, setNamaPerusahaan] = useState('')
    const [alamatPerusahaan, setAlamatPerusahaan] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            if (isAdmin) {
                navigate('/admin', { replace: true })
            } else {
                navigate('/dashboard', { replace: true })
            }
        }
    }, [isAuthenticated, isAdmin, isLoading, navigate])

    const handleSubmit = async (event) => {
        event.preventDefault()
        setError('')
        setLoading(true)

        try {
            await authService.register(email, password, namaPerusahaan, alamatPerusahaan)
            toast.success('Registrasi berhasil!')
            navigate('/dashboard')
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Registrasi gagal.'
            setError(errorMessage)
            toast.error(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    // Show nothing while checking auth status
    if (isLoading) return null

    return (
        <main className="login-page">
            <section className="login-card">
                <div className="login-brand">
                    <span className="login-brand-link">
                        SmartPoultry Kurir
                    </span>
                    <p>Daftar untuk mengelola pengiriman perusahaan kurir Anda.</p>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    {error && <div className="login-error">{error}</div>}
                    <label>
                        Nama Perusahaan Kurir
                        <input
                            type="text"
                            placeholder="PT. Express Logistics"
                            value={namaPerusahaan}
                            onChange={(e) => setNamaPerusahaan(e.target.value)}
                            required
                            disabled={loading}
                            id="register-company"
                        />
                    </label>
                    <label>
                        Alamat Perusahaan
                        <input
                            type="text"
                            placeholder="Jl. Logistik No. 1, Jakarta"
                            value={alamatPerusahaan}
                            onChange={(e) => setAlamatPerusahaan(e.target.value)}
                            required
                            disabled={loading}
                            id="register-address"
                        />
                    </label>
                    <label>
                        Email
                        <input
                            type="email"
                            placeholder="admin@kurir.id"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            id="register-email"
                        />
                    </label>
                    <label>
                        Password
                        <div className="login-password">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Minimum 6 karakter"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={loading}
                                id="register-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword((prev) => !prev)}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </label>
                    <button type="submit" className="login-submit" disabled={loading} id="register-submit">
                        {loading ? 'Memproses...' : 'Daftar Sekarang'}
                    </button>
                    <div className="login-dialog">
                        <span>Sudah punya akun?</span>
                        <Link to="/login">Masuk</Link>
                    </div>
                </form>
            </section>
        </main>
    )
}

export default Register
