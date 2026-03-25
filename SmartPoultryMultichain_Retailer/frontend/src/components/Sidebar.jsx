import { NavLink } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

function IconDashboard(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M4 13.5c0-.7 0-1.05.14-1.32.12-.23.31-.42.54-.54.27-.14.62-.14 1.32-.14h2c.7 0 1.05 0 1.32.14.23.12.42.31.54.54.14.27.14.62.14 1.32v6c0 .7 0 1.05-.14 1.32-.12.23-.31.42-.54.54-.27.14-.62.14-1.32.14h-2c-.7 0-1.05 0-1.32-.14a1.25 1.25 0 0 1-.54-.54C4 20.55 4 20.2 4 19.5v-6Z" stroke="currentColor" strokeWidth="1.7" />
            <path d="M14 4.5c0-.7 0-1.05.14-1.32.12-.23.31-.42.54-.54C14.95 2.5 15.3 2.5 16 2.5h2c.7 0 1.05 0 1.32.14.23.12.42.31.54.54.14.27.14.62.14 1.32v15c0 .7 0 1.05-.14 1.32-.12.23-.31.42-.54.54-.27.14-.62.14-1.32.14h-2c-.7 0-1.05 0-1.32-.14a1.25 1.25 0 0 1-.54-.54C14 20.55 14 20.2 14 19.5v-15Z" stroke="currentColor" strokeWidth="1.7" />
            <path d="M4 4.5c0-.7 0-1.05.14-1.32.12-.23.31-.42.54-.54C4.95 2.5 5.3 2.5 6 2.5h2c.7 0 1.05 0 1.32.14.23.12.42.31.54.54.14.27.14.62.14 1.32v3c0 .7 0 1.05-.14 1.32-.12.23-.31.42-.54.54-.27.14-.62.14-1.32.14h-2c-.7 0-1.05 0-1.32-.14a1.25 1.25 0 0 1-.54-.54C4 8.55 4 8.2 4 7.5v-3Z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
    )
}

function IconOrder(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.7" />
            <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    )
}

function IconReceipt(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    )
}

function IconWarehouse(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M3 21V8l9-5 9 5v13" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M9 21v-6h6v6" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
            <path d="M3 21h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    )
}

function IconSale(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

function IconChain(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 1 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 1 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
    )
}

function IconUserCircle(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M16.5 18.5c-.65-2.08-2.75-3.5-4.5-3.5s-3.85 1.42-4.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    )
}

function NavItem({ to, icon: Icon, label, onNavigate }) {
    return (
        <NavLink
            to={to}
            className={({ isActive }) => `sp-navItem${isActive ? ' active' : ''}`}
            end
            onClick={onNavigate}
        >
            <Icon className="sp-navIcon" />
            <span className="sp-navLabel">{label}</span>
        </NavLink>
    )
}

export default function Sidebar({ isOpen, onRequestClose, onNavigate, onAccountSettings }) {
    const { user, logout } = useAuthStore()

    const handleLogout = () => {
        logout()
        window.location.href = '/login'
    }

    return (
        <aside className={`sp-sidebar${isOpen ? ' open' : ''}`}>
            <div className="sp-brand">
                <button className="sp-brandAction" type="button" onClick={onAccountSettings} aria-label="Pengaturan akun">
                    <IconUserCircle className="sp-brandAvatar" />
                </button>
                <div className="sp-brandMeta">
                    <div className="sp-brandTitle">SmartPoultry</div>
                    <div className="sp-brandCaption">Retailer • {user?.role || 'User'}</div>
                </div>
            </div>

            <nav className="sp-nav">
                <NavItem to="/app/dashboard" icon={IconDashboard} label="Dashboard" onNavigate={onNavigate} />
                <NavItem to="/app/orders" icon={IconOrder} label="Order" onNavigate={onNavigate} />
                <NavItem to="/app/nota-penerimaan" icon={IconReceipt} label="Nota Penerimaan" onNavigate={onNavigate} />
                <NavItem to="/app/gudang" icon={IconWarehouse} label="Gudang / Stok" onNavigate={onNavigate} />
                <NavItem to="/app/penjualan" icon={IconSale} label="Penjualan" onNavigate={onNavigate} />
            </nav>

            <div className="sp-sidebarFooter">
                <button className="sp-btn danger" type="button" onClick={handleLogout}>Logout</button>
            </div>
        </aside>
    )
}
