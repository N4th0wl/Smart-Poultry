import api from './api';

export const authService = {
    // Login
    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    // Register
    async register(email, password, namaPeternakan, lokasiPeternakan) {
        const response = await api.post('/auth/register', {
            email,
            password,
            namaPeternakan,
            lokasiPeternakan
        });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    // Update Profile
    async updateProfile(data) {
        const response = await api.put('/auth/profile', data);
        if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return response.data;
    },

    // Update Password
    async updatePassword(currentPassword, newPassword) {
        const response = await api.put('/auth/password', { currentPassword, newPassword });
        return response.data;
    },

    // Logout
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    // Get current user
    async getCurrentUser() {
        const response = await api.get('/auth/me');
        return response.data;
    },

    // Check if authenticated
    isAuthenticated() {
        return !!localStorage.getItem('token');
    },

    // Get stored user
    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Get token
    getToken() {
        return localStorage.getItem('token');
    }
};

export default authService;
