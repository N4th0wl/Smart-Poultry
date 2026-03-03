import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { authService } from '../services'
import '../styles/Register.css'

const strengthMap = [
  { label: 'Sangat Lemah', tone: 'weak' },
  { label: 'Lemah', tone: 'weak' },
  { label: 'Sedang', tone: 'mid' },
  { label: 'Kuat', tone: 'good' },
  { label: 'Sangat Kuat', tone: 'strong' },
]

function getStrength(value) {
  const checks = [
    value.length >= 8,
    value.length >= 12,
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ]
  const score = checks.filter(Boolean).length
  const normalized = Math.min(score, strengthMap.length)
  const index = Math.min(normalized, strengthMap.length - 1)
  return {
    score: normalized,
    label: strengthMap[index].label,
    tone: strengthMap[index].tone,
    percent: Math.max(12, (normalized / strengthMap.length) * 100),
  }
}

function Register() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [farmName, setFarmName] = useState('')
  const [farmLocation, setFarmLocation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const strength = useMemo(() => getStrength(password), [password])
  const isMatch = confirmPassword.length > 0 && password === confirmPassword
  const isStrongEnough = strength.score >= 3

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!isStrongEnough) {
      setFormError('Gunakan password yang lebih kuat sebelum melanjutkan.')
      return
    }
    if (!isMatch) {
      setFormError('Konfirmasi password belum sama dengan password utama.')
      return
    }
    setFormError('')
    setLoading(true)

    try {
      await authService.register(email, password, farmName, farmLocation)
      toast.success('Registrasi Berhasil!')
      navigate('/dashboard')
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Pendaftaran gagal. Silakan coba lagi.'
      setFormError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="register-page">
      <section className="register-card">
        <div className="register-brand">
          <Link to="/" className="register-brand-link">
            SmartPoultry
          </Link>
          <p>Daftarkan peternakan Anda dan mulai optimalkan operasional dengan data yang lebih presisi.</p>
        </div>
        <form className="register-form" onSubmit={handleSubmit}>
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
            <div className="register-password">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Buat password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="register-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <div className={`register-strength ${strength.tone}`}>
            <div className="register-strength-bar">
              <span className="register-strength-meter" style={{ width: `${strength.percent}%` }}></span>
            </div>
            <span className="register-strength-label">Kekuatan Password: {strength.label}</span>
          </div>
          <label>
            Konfirmasi Password
            <div className="register-password">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
                disabled={loading}
              />
              <button
                type="button"
                className="register-toggle"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          <label>
            Nama Peternakan
            <input
              type="text"
              placeholder="Nama peternakan"
              value={farmName}
              onChange={(event) => setFarmName(event.target.value)}
              required
              disabled={loading}
            />
          </label>
          <label>
            Lokasi Peternakan
            <input
              type="text"
              placeholder="Kota / Kabupaten"
              value={farmLocation}
              onChange={(event) => setFarmLocation(event.target.value)}
              required
              disabled={loading}
            />
          </label>
          <button type="submit" className="register-submit" disabled={loading}>
            {loading ? 'Memproses...' : 'Daftar Sekarang'}
          </button>
          {!isStrongEnough && password.length > 0 ? (
            <p className="register-error">Password terlalu lemah. Gunakan kombinasi huruf besar, kecil, angka, dan simbol.</p>
          ) : null}
          {confirmPassword.length > 0 && !isMatch ? (
            <p className="register-error">Konfirmasi password belum cocok.</p>
          ) : null}
          {formError ? <p className="register-error">{formError}</p> : null}
          <div className="register-dialog">
            <span>Sudah punya akun?</span>
            <Link to="/login">Masuk</Link>
          </div>
        </form>
      </section>
    </main>
  )
}

export default Register
