import { useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services'
import '../styles/Settings.css'

function DashboardSettings() {
    const { user, updateUser } = useAuth()
    const [profileForm, setProfileForm] = useState({
        namaPerusahaan: user?.namaPerusahaan || '',
        alamatPerusahaan: user?.alamatPerusahaan || ''
    })
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    })
    const [savingProfile, setSavingProfile] = useState(false)
    const [savingPassword, setSavingPassword] = useState(false)

    const handleProfileSubmit = async (e) => {
        e.preventDefault()
        setSavingProfile(true)
        try {
            const response = await authService.updateProfile(profileForm)
            updateUser(response.user)
            toast.success('Profil berhasil diperbarui')
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal memperbarui profil')
        } finally {
            setSavingProfile(false)
        }
    }

    const handlePasswordSubmit = async (e) => {
        e.preventDefault()
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return toast.error('Password baru tidak cocok')
        }
        setSavingPassword(true)
        try {
            await authService.updatePassword(passwordForm.currentPassword, passwordForm.newPassword)
            toast.success('Password berhasil diperbarui')
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
        } catch (error) {
            toast.error(error.response?.data?.error || 'Gagal memperbarui password')
        } finally {
            setSavingPassword(false)
        }
    }

    return (
        <div>
            <div className="page-header">
                <h2>Settings</h2>
            </div>

            <div className="settings-grid">
                <div className="section-card">
                    <h3>Profil Perusahaan</h3>
                    <form onSubmit={handleProfileSubmit} className="settings-form">
                        <label>
                            Email
                            <input type="email" value={user?.email || ''} disabled />
                        </label>
                        <label>
                            Nama Perusahaan
                            <input type="text" value={profileForm.namaPerusahaan} onChange={(e) => setProfileForm({ ...profileForm, namaPerusahaan: e.target.value })} />
                        </label>
                        <label>
                            Alamat Perusahaan
                            <input type="text" value={profileForm.alamatPerusahaan} onChange={(e) => setProfileForm({ ...profileForm, alamatPerusahaan: e.target.value })} />
                        </label>
                        <button type="submit" className="solid-button" disabled={savingProfile}>
                            {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
                        </button>
                    </form>
                </div>

                <div className="section-card">
                    <h3>Ubah Password</h3>
                    <form onSubmit={handlePasswordSubmit} className="settings-form">
                        <label>
                            Password Saat Ini
                            <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} required />
                        </label>
                        <label>
                            Password Baru
                            <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} required />
                        </label>
                        <label>
                            Konfirmasi Password Baru
                            <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} required />
                        </label>
                        <button type="submit" className="solid-button" disabled={savingPassword}>
                            {savingPassword ? 'Menyimpan...' : 'Ubah Password'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default DashboardSettings
