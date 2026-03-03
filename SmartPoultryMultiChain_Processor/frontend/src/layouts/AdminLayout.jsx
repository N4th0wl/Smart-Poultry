import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const handleAccountSettings = () => {
    setIsSidebarOpen(false)
    navigate('/app/account-settings')
  }

  const title = user?.role === 'ADMIN'
    ? 'SmartPoultry — Processor Admin'
    : 'SmartPoultry — Processor Karyawan'

  return (
    <div className="sp-shell">
      <Sidebar
        isOpen={isSidebarOpen}
        onRequestClose={() => setIsSidebarOpen(false)}
        onNavigate={() => setIsSidebarOpen(false)}
        onAccountSettings={handleAccountSettings}
      />

      <div
        className={`sp-sidebarOverlay${isSidebarOpen ? ' visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <div className="sp-content">
        <Topbar title={title} onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="sp-page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
