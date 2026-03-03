import { useState, useMemo } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { authService } from '../services'
import toast from 'react-hot-toast'
import '../styles/Dashboard.css'

const adminNavItems = [
    { to: '/admin', label: 'Users', keywords: ['users', 'pengguna', 'akun'] },
    { to: '/admin/blockchain', label: 'Blockchain Ledger', keywords: ['blockchain', 'ledger', 'block'] },
]

function AdminLayout() {
    const [isNavOpen, setIsNavOpen] = useState(false)
    const navigate = useNavigate()

    const handleLogout = () => {
        authService.logout()
        toast.success('Berhasil logout')
        navigate('/login')
    }

    return (
        <div className="dashboard-shell">
            <aside className="dashboard-sidebar">
                <div className="sidebar-brand">
                    <div>
                        <p className="brand-name">SmartPoultry</p>
                        <span className="brand-caption">Admin Panel</span>
                    </div>
                    <button
                        type="button"
                        className={`mobile-nav-toggle ${isNavOpen ? 'is-active' : ''}`}
                        onClick={() => setIsNavOpen(prev => !prev)}
                        aria-label="Toggle menu"
                    >
                        <span className="hamburger-box"><span className="hamburger-inner"></span></span>
                    </button>
                </div>
                <nav className={`sidebar-nav ${isNavOpen ? 'open' : ''}`}>
                    {adminNavItems.map(item => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/admin'}
                            className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
                            onClick={() => setIsNavOpen(false)}
                        >
                            {item.label}
                        </NavLink>
                    ))}
                    <div className="mobile-actions">
                        <button type="button" className="ghost-button" onClick={() => { navigate('/admin/settings'); setIsNavOpen(false); }}>Settings</button>
                        <button type="button" className="solid-button" onClick={handleLogout}>Logout</button>
                    </div>
                </nav>
            </aside>

            <main className="dashboard-main">
                <header className="dashboard-topbar">
                    <div>
                        <p className="topbar-title">Admin Panel</p>
                        <span className="topbar-subtitle">Manajemen Users & Blockchain</span>
                    </div>
                    <div className="topbar-actions">
                        <button type="button" className="ghost-button" onClick={() => navigate('/admin/settings')}>Settings</button>
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

export default AdminLayout
