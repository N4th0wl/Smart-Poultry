import api from './api';

// DOC Service
export const docService = {
    async getDoc() {
        const response = await api.get('/doc');
        return response.data;
    },

    async getDocById(id) {
        const response = await api.get(`/doc/${id}`);
        return response.data;
    },

    async updateDoc(id, docData) {
        const response = await api.put(`/doc/${id}`, docData);
        return response.data;
    },

    async getNotaPenerimaan() {
        const response = await api.get('/doc/nota-penerimaan');
        return response.data;
    }
};

// Kandang Service
export const kandangService = {
    async getKandang() {
        const response = await api.get('/kandang');
        return response.data;
    },

    async getKandangById(id) {
        const response = await api.get(`/kandang/${id}`);
        return response.data;
    },

    async getAvailableDocs() {
        const response = await api.get('/kandang/available-doc');
        return response.data;
    },

    async createKandang(kandangData) {
        const response = await api.post('/kandang', kandangData);
        return response.data;
    },

    async updateKandang(id, kandangData) {
        const response = await api.put(`/kandang/${id}`, kandangData);
        return response.data;
    },

    async deleteKandang(id) {
        const response = await api.delete(`/kandang/${id}`);
        return response.data;
    },

    // === Monitoring endpoints ===

    async getKandangStatus(id) {
        const response = await api.get(`/kandang/${id}/status`);
        return response.data;
    },

    async createKandangStatus(id, statusData) {
        const response = await api.post(`/kandang/${id}/status`, statusData);
        return response.data;
    },

    async getKandangPerformance(id) {
        const response = await api.get(`/kandang/${id}/performance`);
        return response.data;
    },

    async createKandangPerformance(id, performanceData) {
        const response = await api.post(`/kandang/${id}/performance`, performanceData);
        return response.data;
    },

    async getKandangPemakaianObat(id) {
        const response = await api.get(`/kandang/${id}/pemakaian-obat`);
        return response.data;
    },

    async createKandangPemakaianObat(id, data) {
        const response = await api.post(`/kandang/${id}/pemakaian-obat`, data);
        return response.data;
    },

    async getKandangPemakaianPerlengkapan(id) {
        const response = await api.get(`/kandang/${id}/pemakaian-perlengkapan`);
        return response.data;
    },

    async createKandangPemakaianPerlengkapan(id, data) {
        const response = await api.post(`/kandang/${id}/pemakaian-perlengkapan`, data);
        return response.data;
    },

    async getKandangPemakaianFeed(id) {
        const response = await api.get(`/kandang/${id}/pemakaian-feed`);
        return response.data;
    },

    async createKandangPemakaianFeed(id, data) {
        const response = await api.post(`/kandang/${id}/pemakaian-feed`, data);
        return response.data;
    },

    async getKandangKematian(id) {
        const response = await api.get(`/kandang/${id}/kematian`);
        return response.data;
    },

    async createKandangKematian(id, data) {
        const response = await api.post(`/kandang/${id}/kematian`, data);
        return response.data;
    },

    // Delete operations
    async deleteKandangStatus(kandangId, kodeStatus) {
        const response = await api.delete(`/kandang/${kandangId}/status/${kodeStatus}`);
        return response.data;
    },

    async deleteKandangPerformance(kandangId, kodePerformance) {
        const response = await api.delete(`/kandang/${kandangId}/performance/${kodePerformance}`);
        return response.data;
    },

    async deleteKandangPemakaianFeed(kandangId, kodePemakaianFeed) {
        const response = await api.delete(`/kandang/${kandangId}/pemakaian-feed/${kodePemakaianFeed}`);
        return response.data;
    },

    async deleteKandangPemakaianObat(kandangId, kodePemakaianObat) {
        const response = await api.delete(`/kandang/${kandangId}/pemakaian-obat/${kodePemakaianObat}`);
        return response.data;
    },

    async deleteKandangPemakaianPerlengkapan(kandangId, kodePemakaian) {
        const response = await api.delete(`/kandang/${kandangId}/pemakaian-perlengkapan/${kodePemakaian}`);
        return response.data;
    },

    async deleteKandangKematian(kandangId, kodeStatusKematian) {
        const response = await api.delete(`/kandang/${kandangId}/kematian/${kodeStatusKematian}`);
        return response.data;
    },

    // Get perlengkapan by category (for monitoring forms)
    async getPerlengkapanByKategori(kategori) {
        const response = await api.get(`/kandang/perlengkapan-by-kategori/${kategori}`);
        return response.data;
    }
};

// Cycle Service
export const cycleService = {
    async getCycles() {
        const response = await api.get('/cycle');
        return response.data;
    },

    async getCycleById(id) {
        const response = await api.get(`/cycle/${id}`);
        return response.data;
    },

    async createCycle(cycleData) {
        const response = await api.post('/cycle', cycleData);
        return response.data;
    },

    async updateCycle(id, cycleData) {
        const response = await api.put(`/cycle/${id}`, cycleData);
        return response.data;
    }
};

export default { docService, kandangService, cycleService };
