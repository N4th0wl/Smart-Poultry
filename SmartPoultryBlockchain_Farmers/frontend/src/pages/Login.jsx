import { useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services'
import '../styles/Login.css'

function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authService.login(email, password)
      toast.success('Login Berhasil!')

      // Role-based redirect
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

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-brand">
          <Link to="/" className="login-brand-link">
            SmartPoultry
          </Link>
          <p>Masuk untuk mengelola data peternakan secara aman.</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          <label>
            Email
            <input
              type="email"
              placeholder="nama@peternakan.id"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              disabled={loading}
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
          <button type="submit" className="login-submit" disabled={loading}>
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
