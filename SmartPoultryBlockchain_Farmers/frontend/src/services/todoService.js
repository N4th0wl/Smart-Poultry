import api from './api'

const todoService = {
    getAll: () => api.get('/todos'),
    create: (data) => api.post('/todos', data),
    update: (id, data) => api.put(`/todos/${id}`, data),
    delete: (id) => api.delete(`/todos/${id}`)
}

export default todoService
