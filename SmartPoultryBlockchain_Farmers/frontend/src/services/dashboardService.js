import api from './api'

export const dashboardService = {
    // Get dashboard summary (total populasi, kandang aktif, etc.)
    async getSummary(filters = {}) {
        const params = new URLSearchParams()
        if (filters.cycle) params.append('cycle', filters.cycle)
        if (filters.kandang) params.append('kandang', filters.kandang)

        const response = await api.get(`/dashboard/summary?${params.toString()}`)
        return response.data
    },

    // Get kandang statistics with latest status
    async getKandangStats(filters = {}) {
        const params = new URLSearchParams()
        if (filters.cycle) params.append('cycle', filters.cycle)

        const response = await api.get(`/dashboard/kandang-stats?${params.toString()}`)
        return response.data
    },

    // Get performance KPI (FCR, ADG, Feed Intake)
    async getPerformanceKPI(filters = {}) {
        const params = new URLSearchParams()
        if (filters.kandang) params.append('kandang', filters.kandang)
        if (filters.startDate) params.append('startDate', filters.startDate)
        if (filters.endDate) params.append('endDate', filters.endDate)

        const response = await api.get(`/dashboard/performance?${params.toString()}`)
        return response.data
    },

    // Get mortality KPI
    async getMortalityKPI(filters = {}) {
        const params = new URLSearchParams()
        if (filters.kandang) params.append('kandang', filters.kandang)

        const response = await api.get(`/dashboard/mortality?${params.toString()}`)
        return response.data
    },

    // Get feed usage statistics
    async getFeedUsage(filters = {}) {
        const params = new URLSearchParams()
        if (filters.kandang) params.append('kandang', filters.kandang)
        if (filters.period) params.append('period', filters.period) // daily, weekly, monthly

        const response = await api.get(`/dashboard/feed-usage?${params.toString()}`)
        return response.data
    },

    // Get harvest estimates
    async getHarvestEstimate(filters = {}) {
        const params = new URLSearchParams()
        if (filters.cycle) params.append('cycle', filters.cycle)

        const response = await api.get(`/dashboard/harvest-estimate?${params.toString()}`)
        return response.data
    },

    // Get pending orders count
    async getPendingOrders() {
        const response = await api.get('/dashboard/pending-orders')
        return response.data
    },

    // Get recent activities/notifications
    async getRecentActivities(limit = 5) {
        const response = await api.get(`/dashboard/activities?limit=${limit}`)
        return response.data
    },
}

export default dashboardService
