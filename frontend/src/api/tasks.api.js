import api from './axios'

export const getProjectTasks = (projectId) => api.get(`/projects/${projectId}/tasks`)
export const createTask = (projectId, data) => api.post(`/projects/${projectId}/tasks`, data)
export const getTaskById = (projectId, taskId) => api.get(`/projects/${projectId}/tasks/${taskId}`)
export const updateTask = (projectId, taskId, data) =>
  api.patch(`/projects/${projectId}/tasks/${taskId}`, data)
export const deleteTask = (projectId, taskId) =>
  api.delete(`/projects/${projectId}/tasks/${taskId}`)

export const createSubtask = (projectId, taskId, data) =>
  api.post(`/projects/${projectId}/tasks/${taskId}/subtasks`, data)
export const updateSubtask = (projectId, taskId, subtaskId, data) =>
  api.patch(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, data)
export const deleteSubtask = (projectId, taskId, subtaskId) =>
  api.delete(`/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`)
