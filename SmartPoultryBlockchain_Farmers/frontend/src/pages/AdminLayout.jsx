import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { authService } from '../services'
import toast from 'react-hot-toast'
import '../styles/Dashboard.css'
import '../styles/AdminDashboard.css'

const adminNavItems = [
    { to: '/admin', label: 'Panel User', icon: '👥' },
    { to: '/admin/blockchain', label: 'Monitoring Blockchain', icon: '🔗' },
]

function AdminLayout() {
    const [isNavOpen, setIsNavOpen] = useState(false)
    const navigate = useNavigate()

    const handleLogout = () => {
        authService.logout()
        toast.success('Berhasil logout')
        navigate('/login')
    }

    const handleSettings = () => {
        navigate('/admin/settings')
        setIsNavOpen(false)
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
                        onClick={() => setIsNavOpen((prev) => !prev)}
                        aria-label="Toggle admin menu"
                    >
                        <span className="hamburger-box">
                            <span className="hamburger-inner"></span>
                        </span>
                    </button>
                </div>
                <nav className={`sidebar-nav ${isNavOpen ? 'open' : ''}`}>
                    {adminNavItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === '/admin'}
                            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                            onClick={() => setIsNavOpen(false)}
                        >
                            <span style={{ marginRight: '8px' }}>{item.icon}</span>
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
                        <p className="topbar-title">Admin Dashboard</p>
                        <span className="topbar-subtitle">Manajemen Sistem SmartPoultry</span>
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

export default AdminLayout
