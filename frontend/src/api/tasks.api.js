import api from './axios'

export const getProjectTasks = (projectId) => api.get(`/projects/${projectId}/tasks`)
export const createTask = (projectId, data) => api.post(`/projects/${projectId}/tasks`, data)
export const getTaskById = (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`)
export const updateTask = (projectId, taskId, data) =>
  api.patch(`/projects/${projectId}/tasks/${taskId}`, data)
export const deleteTask = (projectId, taskId) =>
  api.delete(`/projects/${projectId}/tasks/${taskId}`)
export const reorderTasks = (projectId, tasks) =>
  api.patch(`/projects/${projectId}/tasks/reorder`, { tasks })

export const getProjectCalendar = (projectId, from, to) =>
  api.get(`/projects/${projectId}/tasks/calendar`, { params: { from, to } })
