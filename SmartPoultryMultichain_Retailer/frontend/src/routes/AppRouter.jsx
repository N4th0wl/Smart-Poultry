import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import AdminLayout from '../layouts/AdminLayout'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import Orders from '../pages/Orders'
import NotaPenerimaanPage from '../pages/NotaPenerimaanPage'
import GudangPage from '../pages/GudangPage'
import PenjualanPage from '../pages/PenjualanPage'

import AccountSettings from '../pages/AccountSettings'

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore()
    return isAuthenticated ? children : <Navigate to="/login" replace />
}

function GuestRoute({ children }) {
    const { isAuthenticated } = useAuthStore()
    return isAuthenticated ? <Navigate to="/app/dashboard" replace /> : children
}

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
                <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
                <Route path="/app" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="orders" element={<Orders />} />
                    <Route path="nota-penerimaan" element={<NotaPenerimaanPage />} />
                    <Route path="gudang" element={<GudangPage />} />
                    <Route path="penjualan" element={<PenjualanPage />} />

                    <Route path="account-settings" element={<AccountSettings />} />
                    <Route index element={<Navigate to="dashboard" replace />} />
                </Route>
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
