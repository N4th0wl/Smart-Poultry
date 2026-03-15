import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

import AdminLayout from '../layouts/AdminLayout'
import Login from '../pages/Login'
import Register from '../pages/Register'
import Dashboard from '../pages/Dashboard'
import Orders from '../pages/Orders'
import PesananRetailer from '../pages/PesananRetailer'
import TugasProduksi from '../pages/TugasProduksi'
import MonitoringProduksi from '../pages/MonitoringProduksi'
import LaporanProduksi from '../pages/LaporanProduksi'
import PengirimanPage from '../pages/PengirimanPage'
import NotaPage from '../pages/NotaPage'
import KaryawanPage from '../pages/KaryawanPage'
import BlockchainPage from '../pages/BlockchainPage'
import AccountSettings from '../pages/AccountSettings'
import NotaPenerimaanPage from '../pages/NotaPenerimaanPage'
import AdminPanelProcessor from '../pages/AdminPanelProcessor'
import AdminPanelBlockchain from '../pages/AdminPanelBlockchain'
import TraceabilityPage from '../pages/TraceabilityPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'ADMIN') return <Navigate to="/app/dashboard" replace />
  return children
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) return <Navigate to="/app/dashboard" replace />
  return children
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
        <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

        {/* PUBLIC: QR Code traceability page (no auth required) */}
        <Route path="/trace/:kodeOrder" element={<TraceabilityPage />} />

        <Route path="/app" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<AdminRoute><Orders /></AdminRoute>} />
          <Route path="pesanan-retailer" element={<AdminRoute><PesananRetailer /></AdminRoute>} />
          <Route path="nota-penerimaan" element={<AdminRoute><NotaPenerimaanPage /></AdminRoute>} />
          <Route path="tugas" element={<TugasProduksi />} />
          <Route path="produksi" element={<MonitoringProduksi />} />
          <Route path="laporan" element={<LaporanProduksi />} />
          <Route path="pengiriman" element={<AdminRoute><PengirimanPage /></AdminRoute>} />
          <Route path="nota" element={<AdminRoute><NotaPage /></AdminRoute>} />
          <Route path="karyawan" element={<AdminRoute><KaryawanPage /></AdminRoute>} />
          <Route path="blockchain" element={<AdminRoute><BlockchainPage /></AdminRoute>} />
          <Route path="admin/processors" element={<AdminRoute><AdminPanelProcessor /></AdminRoute>} />
          <Route path="admin/blockchain" element={<AdminRoute><AdminPanelBlockchain /></AdminRoute>} />
          <Route path="account-settings" element={<AccountSettings />} />
          <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/app/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

