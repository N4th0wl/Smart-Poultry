import api from './api';

export const blockchainService = {
    // Get blockchain overview (dashboard summary)
    async getOverview() {
        const response = await api.get('/blockchain/overview');
        return response.data;
    },

    // Get all chains
    async getChains() {
        const response = await api.get('/blockchain/chains');
        return response.data;
    },

    // Get chain details by cycle ID
    async getChain(cycleId) {
        const response = await api.get(`/blockchain/chains/${cycleId}`);
        return response.data;
    },

    // Get all blocks for a cycle
    async getBlocks(cycleId) {
        const response = await api.get(`/blockchain/blocks/${cycleId}`);
        return response.data;
    },

    // Get specific block
    async getBlock(cycleId, blockIndex) {
        const response = await api.get(`/blockchain/blocks/${cycleId}/${blockIndex}`);
        return response.data;
    },

    // Validate chain integrity
    async validateChain(cycleId) {
        const response = await api.get(`/blockchain/validate/${cycleId}`);
        return response.data;
    },

    // Get full traceability data
    async getTraceability(cycleId) {
        const response = await api.get(`/blockchain/trace/${cycleId}`);
        return response.data;
    }
};

export default blockchainService;
