import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services'
import '../styles/Login.css'

function Login() {
    const navigate = useNavigate()
    const { isAuthenticated, isAdmin, isLoading } = useAuth()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
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
            const response = await authService.login(email, password)
            toast.success('Login Berhasil!')

            if (response.user?.role === 'admin') {
                navigate('/admin')
            } else {
                navigate('/dashboard')
            }
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Login gagal. Periksa email dan password Anda.'
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
                    <p>Masuk untuk mengelola pengiriman supply chain.</p>
                </div>
                <form className="login-form" onSubmit={handleSubmit}>
                    {error && <div className="login-error">{error}</div>}
                    <label>
                        Email
                        <input
                            type="email"
                            placeholder="nama@kurir.id"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            disabled={loading}
                            id="login-email"
                        />
                    </label>
                    <label>
                        Password
                        <div className="login-password">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                                disabled={loading}
                                id="login-password"
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                            >
                                {showPassword ? 'Hide' : 'Show'}
                            </button>
                        </div>
                    </label>
                    <button type="submit" className="login-submit" disabled={loading} id="login-submit">
                        {loading ? 'Memproses...' : 'Login'}
                    </button>
                    <div className="login-dialog">
                        <span>Belum punya akun?</span>
                        <Link to="/register">Daftar</Link>
                    </div>
                    <p className="login-hint">
                        Dengan masuk, Anda menyetujui kebijakan keamanan SmartPoultry.
                    </p>
                </form>
            </section>
        </main>
    )
}

export default Login
