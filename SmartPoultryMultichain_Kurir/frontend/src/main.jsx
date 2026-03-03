import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom'
import './index.css'
import './styles/toast.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import DashboardLayout from './pages/DashboardLayout.jsx'
import DashboardHome from './pages/DashboardHome.jsx'
import DashboardKurir from './pages/DashboardKurir.jsx'
import DashboardPengiriman from './pages/DashboardPengiriman.jsx'
import DashboardBlockchain from './pages/DashboardBlockchain.jsx'
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
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(238, 244, 251, 0.95))',
                    backdropFilter: 'blur(12px)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    boxShadow: '0 16px 48px rgba(13, 27, 62, 0.15)',
                    border: '1px solid rgba(26, 58, 107, 0.12)',
                    fontSize: '0.95rem',
                    color: '#0d1b3e',
                    maxWidth: '420px',
                },
                success: {
                    duration: 3000,
                    iconTheme: {
                        primary: '#16a34a',
                        secondary: '#ffffff',
                    },
                    style: {
                        background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(22, 163, 74, 0.04))',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                    },
                },
                error: {
                    duration: 5000,
                    iconTheme: {
                        primary: '#dc2626',
                        secondary: '#ffffff',
                    },
                    style: {
                        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), rgba(220, 38, 38, 0.04))',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                    },
                },
                loading: {
                    iconTheme: {
                        primary: '#3b82f6',
                        secondary: 'rgba(59, 130, 246, 0.2)',
                    },
                },
            }}
        />
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* User Dashboard Routes */}
                    <Route path="/dashboard" element={<DashboardLayout />}>
                        <Route index element={<DashboardHome />} />
                        <Route path="kurir" element={<DashboardKurir />} />
                        <Route path="pengiriman" element={<DashboardPengiriman />} />
                        <Route path="blockchain" element={<DashboardBlockchain />} />
                        <Route path="settings" element={<DashboardSettings />} />
                    </Route>

                    {/* Admin Dashboard Routes */}
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminPanelUser />} />
                        <Route path="blockchain" element={<AdminPanelBlockchain />} />
                        <Route path="settings" element={<DashboardSettings />} />
                    </Route>

                    {/* Catch-all: redirect unknown routes to login */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>,
)
