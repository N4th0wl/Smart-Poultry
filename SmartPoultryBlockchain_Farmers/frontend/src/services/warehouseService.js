import api from './api';

export const warehouseService = {
    // Get all warehouses
    async getWarehouses() {
        const response = await api.get('/warehouse');
        return response.data;
    },

    // Get single warehouse with stock
    async getWarehouseById(id) {
        const response = await api.get(`/warehouse/${id}`);
        return response.data;
    },

    // Create warehouse
    async createWarehouse(warehouseData) {
        const response = await api.post('/warehouse', warehouseData);
        return response.data;
    },

    // Update warehouse
    async updateWarehouse(id, warehouseData) {
        const response = await api.put(`/warehouse/${id}`, warehouseData);
        return response.data;
    },

    // Delete warehouse
    async deleteWarehouse(id) {
        const response = await api.delete(`/warehouse/${id}`);
        return response.data;
    },

    // Get all perlengkapan
    async getAllPerlengkapan() {
        const response = await api.get('/warehouse/perlengkapan/all');
        return response.data;
    },

    // Get single perlengkapan
    async getPerlengkapanById(id) {
        const response = await api.get(`/warehouse/perlengkapan/${id}`);
        return response.data;
    },

    // Create perlengkapan
    async createPerlengkapan(perlengkapanData) {
        const response = await api.post('/warehouse/perlengkapan', perlengkapanData);
        return response.data;
    },

    // Update perlengkapan
    async updatePerlengkapan(id, perlengkapanData) {
        const response = await api.put(`/warehouse/perlengkapan/${id}`, perlengkapanData);
        return response.data;
    },

    // Delete perlengkapan
    async deletePerlengkapan(id) {
        const response = await api.delete(`/warehouse/perlengkapan/${id}`);
        return response.data;
    },

    // Add stock to warehouse
    async addStock(warehouseId, stockData) {
        const response = await api.post(`/warehouse/${warehouseId}/stok`, stockData);
        return response.data;
    },

    // Update stock
    async updateStock(stockId, stockData) {
        const response = await api.put(`/warehouse/stok/${stockId}`, stockData);
        return response.data;
    },

    // Transfer stock between warehouses
    async transferStock(transferData) {
        const response = await api.post('/warehouse/transfer', transferData);
        return response.data;
    }
};

export const panenService = {
    // Get all panen
    async getPanen() {
        const response = await api.get('/panen');
        return response.data;
    },

    // Get single panen
    async getPanenById(id) {
        const response = await api.get(`/panen/${id}`);
        return response.data;
    },

    // Create panen
    async createPanen(panenData) {
        const response = await api.post('/panen', panenData);
        return response.data;
    },

    // Update panen
    async updatePanen(id, panenData) {
        const response = await api.put(`/panen/${id}`, panenData);
        return response.data;
    },

    // Delete panen
    async deletePanen(id) {
        const response = await api.delete(`/panen/${id}`);
        return response.data;
    },

    // Get all pengiriman
    async getPengiriman() {
        const response = await api.get('/panen/pengiriman/all');
        return response.data;
    },

    // Get single pengiriman
    async getPengirimanById(id) {
        const response = await api.get(`/panen/pengiriman/${id}`);
        return response.data;
    },

    // Create pengiriman
    async createPengiriman(pengirimanData) {
        const response = await api.post('/panen/pengiriman', pengirimanData);
        return response.data;
    },

    // Update pengiriman
    async updatePengiriman(id, pengirimanData) {
        const response = await api.put(`/panen/pengiriman/${id}`, pengirimanData);
        return response.data;
    },

    // Delete pengiriman
    async deletePengiriman(id) {
        const response = await api.delete(`/panen/pengiriman/${id}`);
        return response.data;
    }
};

export default { warehouseService, panenService };
