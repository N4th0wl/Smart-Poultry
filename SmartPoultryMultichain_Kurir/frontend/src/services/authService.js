import api from './api';

export const authService = {
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    async register(email, password, namaPerusahaan, alamatPerusahaan) {
        const response = await api.post('/auth/register', {
            email,
            password,
            namaPerusahaan,
            alamatPerusahaan
        });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    async updateProfile(data) {
        const response = await api.put('/auth/profile', data);
        if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    async updatePassword(currentPassword, newPassword) {
        const response = await api.put('/auth/password', { currentPassword, newPassword });
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    async getCurrentUser() {
        const response = await api.get('/auth/me');
        return response.data;
    },

    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    getToken() {
        return localStorage.getItem('token');
    }
};

export default authService;
