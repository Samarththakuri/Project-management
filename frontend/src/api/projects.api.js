import api from './axios'

export const getProjects = () => api.get('/projects')
export const createProject = (data) => api.post('/projects', data)
export const getProjectById = (id) => api.get(`/projects/${id}`)
export const updateProject = (id, data) => api.patch(`/projects/${id}`, data)
export const deleteProject = (id) => api.delete(`/projects/${id}`)

export const getMembers = (projectId) => api.get(`/projects/${projectId}/members`)
export const addMember = (projectId, data) => api.post(`/projects/${projectId}/members`, data)
export const updateMemberRole = (projectId, memberId, data) =>
  api.patch(`/projects/${projectId}/members/${memberId}`, data)
export const removeMember = (projectId, memberId) =>
  api.delete(`/projects/${projectId}/members/${memberId}`)
