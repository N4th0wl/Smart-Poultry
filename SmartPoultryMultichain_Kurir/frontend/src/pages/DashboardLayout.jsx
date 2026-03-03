import { useState, useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { authService } from '../services'
import toast from 'react-hot-toast'
import '../styles/Dashboard.css'

const navItems = [
    { to: '/dashboard', label: 'Overview', keywords: ['overview', 'dashboard', 'beranda', 'ringkasan'] },
    { to: '/dashboard/kurir', label: 'Kurir', keywords: ['kurir', 'courier', 'pengantar'] },
    { to: '/dashboard/pengiriman', label: 'Pengiriman', keywords: ['pengiriman', 'shipment', 'delivery', 'kirim'] },
    { to: '/dashboard/blockchain', label: 'Blockchain', keywords: ['blockchain', 'chain', 'block', 'ledger', 'tracing'] },
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
                        <span className="brand-caption">Courier Control Center</span>
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
                        <p className="topbar-title">Dashboard Kurir</p>
                        <span className="topbar-subtitle">Kelola pengiriman supply chain</span>
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
