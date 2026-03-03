import api from './api';

export const adminService = {
    // ====== User Management ======

    // Get all users
    async getUsers(search = '') {
        const params = search ? { search } : {};
        const response = await api.get('/admin/users', { params });
        return response.data;
    },

    // Get single user
    async getUser(userId) {
        const response = await api.get(`/admin/users/${userId}`);
        return response.data;
    },

    // Create user
    async createUser(data) {
        const response = await api.post('/admin/users', data);
        return response.data;
    },

    // Update user
    async updateUser(userId, data) {
        const response = await api.put(`/admin/users/${userId}`, data);
        return response.data;
    },

    // Delete user
    async deleteUser(userId) {
        const response = await api.delete(`/admin/users/${userId}`);
        return response.data;
    },

    // ====== Blockchain Monitoring (Peternakan only) ======

    // Get blockchain overview (all farms)
    async getBlockchainOverview(search = '') {
        const params = search ? { search } : {};
        const response = await api.get('/admin/blockchain/overview', { params });
        return response.data;
    },

    // Get blocks for a cycle
    async getBlocks(cycleId) {
        const response = await api.get(`/admin/blockchain/blocks/${cycleId}`);
        return response.data;
    },

    // Validate chain
    async validateChain(cycleId) {
        const response = await api.get(`/admin/blockchain/validate/${cycleId}`);
        return response.data;
    },

    // ====== Unified Cross-Chain Monitoring ======

    // Get unified overview (Peternakan + Kurir + Processor)
    async getUnifiedOverview(search = '') {
        const params = search ? { search } : {};
        const response = await api.get('/admin/blockchain/unified-overview', { params });
        return response.data;
    },

    // Get cross-chain connection status
    async getCrossChainStatus() {
        const response = await api.get('/admin/blockchain/cross-chain-status');
        return response.data;
    },

    // Get unified chain view for a cycle (Peternakan + linked Kurir + Processor)
    async getUnifiedChain(cycleId) {
        const response = await api.get(`/admin/blockchain/unified-chain/${cycleId}`);
        return response.data;
    },

    // Get Kurir blocks (cross-chain)
    async getKurirBlocks(kodePengiriman) {
        const response = await api.get(`/admin/blockchain/kurir-blocks/${kodePengiriman}`);
        return response.data;
    },

    // Get Processor blocks (cross-chain)
    async getProcessorBlocks(idIdentity) {
        const response = await api.get(`/admin/blockchain/processor-blocks/${idIdentity}`);
        return response.data;
    },

    // Validate Kurir chain (cross-chain)
    async validateKurirChain(kodePengiriman) {
        const response = await api.get(`/admin/blockchain/validate-kurir/${kodePengiriman}`);
        return response.data;
    },

    // Validate Processor chain (cross-chain)
    async validateProcessorChain(idIdentity) {
        const response = await api.get(`/admin/blockchain/validate-processor/${idIdentity}`);
        return response.data;
    },

    // Get Retailer blocks (cross-chain)
    async getRetailerBlocks(idIdentity) {
        const response = await api.get(`/admin/blockchain/retailer-blocks/${idIdentity}`);
        return response.data;
    },

    // Validate Retailer chain (cross-chain)
    async validateRetailerChain(idIdentity) {
        const response = await api.get(`/admin/blockchain/validate-retailer/${idIdentity}`);
        return response.data;
    }
};

export default adminService;

