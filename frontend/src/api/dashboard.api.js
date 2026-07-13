import api from './axios.js'

// Unified dashboard — one request powers the entire home screen.
export const getDashboard = () => api.get('/dashboard')

// Paginated global activity feed for the "Load More" control.
export const getDashboardActivity = (page = 1, limit = 12) =>
  api.get('/dashboard/activity', { params: { page, limit } })

// Legacy per-project dashboard (kept for project-scoped views).
export const getProjectDashboard = (projectId) =>
  api.get(`/projects/${projectId}/dashboard`)
