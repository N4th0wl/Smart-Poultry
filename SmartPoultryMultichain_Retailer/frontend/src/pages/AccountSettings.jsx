import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import { useToast } from '../components/ToastProvider'
import useAuthStore from '../stores/authStore'
import apiClient from '../services/apiClient'

export default function AccountSettings() {
    const { user, updateUser } = useAuthStore()
    const { showToast } = useToast()
    const [form, setForm] = useState({ namaRetailer: user?.nama || '', alamatRetailer: '', kontakRetailer: '' })
    const [loading, setLoading] = useState(false)

    async function onSubmit(e) {
        e.preventDefault(); setLoading(true)
        try {
            const res = await apiClient.put('/auth/me', form)
            updateUser({ ...user, nama: res.data.nama })
            showToast({ title: 'Berhasil', description: 'Profil diperbarui.', status: 'success' })
        } catch (err) {
            showToast({ title: 'Gagal', description: err.response?.data?.message || 'Error', status: 'error' })
        } finally { setLoading(false) }
    }

    return (
        <div>
            <PageHeader title="Pengaturan Akun" subtitle="Kelola informasi akun Anda" />
            <div className="sp-card" style={{ maxWidth: 600 }}>
                <div className="sp-cardBody">
                    <form className="sp-form" onSubmit={onSubmit}>
                        <label className="sp-field"><span className="sp-label">Email</span><input className="sp-input" value={user?.email || ''} disabled /></label>
                        <label className="sp-field"><span className="sp-label">Kode User</span><input className="sp-input" value={user?.kodeUser || ''} disabled /></label>
                        <label className="sp-field"><span className="sp-label">Nama Retailer</span><input className="sp-input" value={form.namaRetailer} onChange={e => setForm(p => ({ ...p, namaRetailer: e.target.value }))} required /></label>
                        <label className="sp-field"><span className="sp-label">Alamat</span><input className="sp-input" value={form.alamatRetailer} onChange={e => setForm(p => ({ ...p, alamatRetailer: e.target.value }))} /></label>
                        <label className="sp-field"><span className="sp-label">Kontak</span><input className="sp-input" value={form.kontakRetailer} onChange={e => setForm(p => ({ ...p, kontakRetailer: e.target.value }))} /></label>
                        <button className="sp-btn" type="submit" disabled={loading}>{loading ? 'Menyimpan...' : 'Simpan'}</button>
                    </form>
                </div>
            </div>
        </div>
    )
}
