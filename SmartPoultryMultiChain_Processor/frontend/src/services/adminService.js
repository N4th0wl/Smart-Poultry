import apiClient from './apiClient';

export const adminService = {
    // ====== Processor Management ======

    // Get all processors
    async getProcessors(search = '') {
        const params = search ? { search } : {};
        const response = await apiClient.get('/admin/processors', { params });
        return response.data;
    },

    // Get single processor detail
    async getProcessor(id) {
        const response = await apiClient.get(`/admin/processors/${id}`);
        return response.data;
    },

    // Create processor (with initial user)
    async createProcessor(data) {
        const response = await apiClient.post('/admin/processors', data);
        return response.data;
    },

    // Update processor
    async updateProcessor(id, data) {
        const response = await apiClient.put(`/admin/processors/${id}`, data);
        return response.data;
    },

    // Delete processor
    async deleteProcessor(id) {
        const response = await apiClient.delete(`/admin/processors/${id}`);
        return response.data;
    },

    // ====== Blockchain Monitoring ======

    // Get blockchain overview (all processors)
    async getBlockchainOverview(search = '') {
        const params = search ? { search } : {};
        const response = await apiClient.get('/admin/blockchain/overview', { params });
        return response.data;
    },

    // Get blocks for a specific chain identity
    async getBlocks(identityId) {
        const response = await apiClient.get(`/admin/blockchain/blocks/${identityId}`);
        return response.data;
    },

    // Validate chain
    async validateChain(identityId) {
        const response = await apiClient.get(`/admin/blockchain/validate/${identityId}`);
        return response.data;
    },

    // ====== Admin Dashboard Stats ======
    async getStats() {
        const response = await apiClient.get('/admin/stats');
        return response.data;
    },
};

export default adminService;
