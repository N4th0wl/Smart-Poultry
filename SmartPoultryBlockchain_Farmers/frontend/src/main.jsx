import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './index.css'
import './styles/toast.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import DashboardLayout from './pages/DashboardLayout.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import DashboardSupplier from './pages/DashboardSupplier.jsx'
import DashboardOrder from './pages/DashboardOrder.jsx'
import DashboardNotaPenerimaan from './pages/DashboardNotaPenerimaan.jsx'
import DashboardWarehouse from './pages/DashboardWarehouse.jsx'
import DashboardPerlengkapan from './pages/DashboardPerlengkapan.jsx'
import DashboardDoc from './pages/DashboardDoc.jsx'
import DashboardKandang from './pages/DashboardKandang.jsx'
import DashboardPanenPengiriman from './pages/DashboardPanenPengiriman.jsx'
import DashboardStaff from './pages/DashboardStaff.jsx'
import DashboardSettings from './pages/DashboardSettings.jsx'
import AdminLayout from './pages/AdminLayout.jsx'
import AdminPanelUser from './pages/AdminPanelUser.jsx'
import AdminPanelBlockchain from './pages/AdminPanelBlockchain.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Toaster
      position="top-right"
      gutter={12}
      containerStyle={{
        top: 24,
        right: 24,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(244, 247, 240, 0.95))',
          backdropFilter: 'blur(12px)',
          borderRadius: '16px',
          padding: '16px 20px',
          boxShadow: '0 16px 48px rgba(15, 26, 18, 0.15)',
          border: '1px solid rgba(31, 59, 40, 0.1)',
          fontSize: '0.95rem',
          color: '#152416',
          maxWidth: '420px',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#2ea043',
            secondary: '#ffffff',
          },
          style: {
            background: 'linear-gradient(135deg, rgba(46, 160, 67, 0.12), rgba(26, 127, 55, 0.08))',
            border: '1px solid rgba(46, 160, 67, 0.25)',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#c23b32',
            secondary: '#ffffff',
          },
          style: {
            background: 'linear-gradient(135deg, rgba(194, 59, 50, 0.12), rgba(180, 40, 32, 0.08))',
            border: '1px solid rgba(194, 59, 50, 0.25)',
          },
        },
        loading: {
          iconTheme: {
            primary: '#2f5a3c',
            secondary: 'rgba(47, 90, 60, 0.2)',
          },
        },
      }}
    />
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* User Dashboard Routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="supplier" element={<DashboardSupplier />} />
            <Route path="order" element={<DashboardOrder />} />
            <Route path="nota-penerimaan" element={<DashboardNotaPenerimaan />} />
            <Route path="warehouse" element={<DashboardWarehouse />} />
            <Route path="warehouse/:warehouseId/perlengkapan" element={<DashboardPerlengkapan />} />
            <Route path="perlengkapan" element={<DashboardPerlengkapan />} />
            <Route path="doc" element={<DashboardDoc />} />
            <Route path="kandang" element={<DashboardKandang />} />
            <Route path="panen" element={<DashboardPanenPengiriman />} />
            <Route path="staff" element={<DashboardStaff />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>

          {/* Admin Dashboard Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminPanelUser />} />
            <Route path="blockchain" element={<AdminPanelBlockchain />} />
            <Route path="settings" element={<DashboardSettings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
