import api from './api'

export const staffService = {
    // =====================================================
    // TIM KERJA
    // =====================================================

    async getTim() {
        const response = await api.get('/staff/tim')
        return response.data
    },

    async getTimById(id) {
        const response = await api.get(`/staff/tim/${id}`)
        return response.data
    },

    async createTim(data) {
        const response = await api.post('/staff/tim', data)
        return response.data
    },

    async updateTim(id, data) {
        const response = await api.put(`/staff/tim/${id}`, data)
        return response.data
    },

    async deleteTim(id) {
        const response = await api.delete(`/staff/tim/${id}`)
        return response.data
    },

    // =====================================================
    // STAF
    // =====================================================

    async getStaf() {
        const response = await api.get('/staff')
        return response.data
    },

    async getStafById(id) {
        const response = await api.get(`/staff/${id}`)
        return response.data
    },

    async createStaf(data) {
        const response = await api.post('/staff', data)
        return response.data
    },

    async updateStaf(id, data) {
        const response = await api.put(`/staff/${id}`, data)
        return response.data
    },

    async deleteStaf(id) {
        const response = await api.delete(`/staff/${id}`)
        return response.data
    },
}

export default staffService
