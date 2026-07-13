import api from './axios.js'

// Global search across every project the user belongs to (⌘K palette).
export const searchAll = (q, type = 'all') =>
  api.get('/search', { params: { q, type } })
