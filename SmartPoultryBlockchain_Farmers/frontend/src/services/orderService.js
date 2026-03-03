import api from './api';

export const orderService = {
    // Get all orders
    async getOrders() {
        const response = await api.get('/orders');
        return response.data;
    },

    // Get single order
    async getOrder(id) {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    },

    // Create order
    async createOrder(orderData) {
        const response = await api.post('/orders', orderData);
        return response.data;
    },

    // Update order
    async updateOrder(id, orderData) {
        const response = await api.put(`/orders/${id}`, orderData);
        return response.data;
    },

    // Delete order
    async deleteOrder(id) {
        const response = await api.delete(`/orders/${id}`);
        return response.data;
    },

    // Get all nota penerimaan
    async getNotaPenerimaan() {
        const response = await api.get('/orders/nota-penerimaan/all');
        return response.data;
    },

    // Get single nota penerimaan
    async getNotaPenerimaanById(id) {
        const response = await api.get(`/orders/nota-penerimaan/${id}`);
        return response.data;
    }
};

export const supplierService = {
    // Get all suppliers
    async getSuppliers() {
        const response = await api.get('/suppliers');
        return response.data;
    },

    // Create supplier
    async createSupplier(supplierData) {
        const response = await api.post('/suppliers', supplierData);
        return response.data;
    },

    // Update supplier
    async updateSupplier(id, supplierData) {
        const response = await api.put(`/suppliers/${id}`, supplierData);
        return response.data;
    },

    // Delete supplier
    async deleteSupplier(id) {
        const response = await api.delete(`/suppliers/${id}`);
        return response.data;
    }
};

export default { orderService, supplierService };
