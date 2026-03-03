import { useState, useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { authService } from '../services'
import toast from 'react-hot-toast'
import '../styles/Dashboard.css'

const navItems = [
  { to: '/dashboard', label: 'Overview', keywords: ['overview', 'dashboard', 'beranda', 'ringkasan'] },
  { to: '/dashboard/supplier', label: 'Supplier', keywords: ['supplier', 'pemasok'] },
  { to: '/dashboard/order', label: 'Order', keywords: ['order', 'pesanan', 'pembelian'] },
  { to: '/dashboard/nota-penerimaan', label: 'Nota Penerimaan', keywords: ['nota', 'penerimaan', 'receipt'] },
  { to: '/dashboard/warehouse', label: 'Warehouse', keywords: ['warehouse', 'gudang', 'stok'] },
  { to: '/dashboard/perlengkapan', label: 'Perlengkapan', keywords: ['perlengkapan', 'supplies', 'equipment'] },
  { to: '/dashboard/doc', label: 'DOC', keywords: ['doc', 'day old chick', 'bibit', 'ayam'] },
  { to: '/dashboard/kandang', label: 'Kandang', keywords: ['kandang', 'coop', 'cycle', 'monitoring'] },
  { to: '/dashboard/panen', label: 'Panen & Pengiriman', keywords: ['panen', 'harvest', 'pengiriman', 'delivery'] },
  { to: '/dashboard/staff', label: 'Tim & Staff', keywords: ['staff', 'tim', 'team', 'karyawan'] },
]

function DashboardLayout() {
  const [isNavOpen, setIsNavOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    authService.logout()
    toast.success('Berhasil logout')
    navigate('/login')
  }

  const handleSettings = () => {
    navigate('/dashboard/settings')
    setIsNavOpen(false)
  }

  // Filtered nav items for search dropdown
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase()
    return navItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.some(k => k.includes(q))
    )
  }, [searchQuery])

  const handleSearchSelect = (to) => {
    navigate(to)
    setSearchQuery('')
    setIsSearchFocused(false)
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="sidebar-brand">
          <div>
            <p className="brand-name">SmartPoultry</p>
            <span className="brand-caption">Farm Control Center</span>
          </div>
          <button
            type="button"
            className={`mobile-nav-toggle ${isNavOpen ? 'is-active' : ''}`}
            onClick={() => setIsNavOpen((prev) => !prev)}
            aria-label="Toggle dashboard menu"
          >
            <span className="hamburger-box">
              <span className="hamburger-inner"></span>
            </span>
          </button>
        </div>
        <nav className={`sidebar-nav ${isNavOpen ? 'open' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              onClick={() => setIsNavOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
          <div className="mobile-actions">
            <button type="button" className="ghost-button" onClick={handleSettings}>Settings</button>
            <button type="button" className="solid-button" onClick={handleLogout}>Logout</button>
          </div>
        </nav>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="topbar-title">Dashboard Peternakan</p>
            <span className="topbar-subtitle">Pantau data operasional harian Anda</span>
          </div>
          <div className="topbar-center">
            <div className={`topbar-search-wrapper ${isSearchFocused ? 'focused' : ''}`}>
              <svg className="topbar-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="topbar-search-input"
                placeholder="Cari halaman..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                id="dashboard-search"
              />
              {searchQuery && (
                <button className="topbar-search-clear" onClick={() => setSearchQuery('')}>✕</button>
              )}
              {isSearchFocused && searchResults.length > 0 && (
                <div className="topbar-search-dropdown">
                  {searchResults.map(item => (
                    <button
                      key={item.to}
                      className="search-result-item"
                      onMouseDown={() => handleSearchSelect(item.to)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              {isSearchFocused && searchQuery && searchResults.length === 0 && (
                <div className="topbar-search-dropdown">
                  <div className="search-no-result">Halaman tidak ditemukan</div>
                </div>
              )}
            </div>
          </div>
          <div className="topbar-actions">
            <button type="button" className="ghost-button" onClick={handleSettings}>Settings</button>
            <button type="button" className="solid-button" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <section className="dashboard-content">
          <Outlet />
        </section>
      </main>
    </div>
  )
}

export default DashboardLayout
