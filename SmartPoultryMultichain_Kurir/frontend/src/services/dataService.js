import api from './api';

export const kurirService = {
    async getAll() {
        const response = await api.get('/kurir');
        return response.data;
    },
    async create(data) {
        const response = await api.post('/kurir', data);
        return response.data;
    },
    async update(id, data) {
        const response = await api.put(`/kurir/${id}`, data);
        return response.data;
    },
    async remove(id) {
        const response = await api.delete(`/kurir/${id}`);
        return response.data;
    }
};

export const pengirimanService = {
    async getAll() {
        const response = await api.get('/pengiriman');
        return response.data;
    },
    async getById(id) {
        const response = await api.get(`/pengiriman/${id}`);
        return response.data;
    },
    async create(data) {
        const response = await api.post('/pengiriman', data);
        return response.data;
    },
    async createBukti(pengirimanId, data) {
        const response = await api.post(`/pengiriman/${pengirimanId}/bukti`, data);
        return response.data;
    },
    async createNota(pengirimanId, data) {
        const response = await api.post(`/pengiriman/${pengirimanId}/nota`, data);
        return response.data;
    }
};

export const dashboardService = {
    async getStats() {
        const response = await api.get('/dashboard/stats');
        return response.data;
    },
    async getRecent() {
        const response = await api.get('/dashboard/recent');
        return response.data;
    }
};

export const blockchainService = {
    async getChains() {
        const response = await api.get('/blockchain/chains');
        return response.data;
    },
    async getLedger() {
        const response = await api.get('/blockchain/ledger');
        return response.data;
    },
    async getTrace(kodePengiriman) {
        const response = await api.get(`/blockchain/trace/${kodePengiriman}`);
        return response.data;
    },
    async validate(kodePengiriman) {
        const response = await api.get(`/blockchain/validate/${kodePengiriman}`);
        return response.data;
    },
    async getStats() {
        const response = await api.get('/blockchain/stats');
        return response.data;
    },
    // Cross-chain methods
    async getCrossChain(kodePengiriman) {
        const response = await api.get(`/blockchain/cross-chain/${kodePengiriman}`);
        return response.data;
    },
    async getUpstreamChains() {
        const response = await api.get('/blockchain/upstream-chains');
        return response.data;
    },
    async getUpstreamChain(cycleId) {
        const response = await api.get(`/blockchain/upstream-chain/${cycleId}`);
        return response.data;
    },
    async getCrossChainStatus() {
        const response = await api.get('/blockchain/cross-chain-status');
        return response.data;
    }
};

export const adminService = {
    async getUsers() {
        const response = await api.get('/admin/users');
        return response.data;
    },
    async createUser(data) {
        const response = await api.post('/admin/users', data);
        return response.data;
    },
    async updateRole(userId, role) {
        const response = await api.put(`/admin/users/${userId}/role`, { role });
        return response.data;
    },
    async deleteUser(userId) {
        const response = await api.delete(`/admin/users/${userId}`);
        return response.data;
    },
    async getCompanies() {
        const response = await api.get('/admin/companies');
        return response.data;
    }
};
