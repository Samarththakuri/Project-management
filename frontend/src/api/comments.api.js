import api from './axios'

export const getTaskComments = (projectId, taskId) =>
  api.get(`/projects/${projectId}/tasks/${taskId}/comments`)

export const createComment = (projectId, taskId, data) =>
  api.post(`/projects/${projectId}/tasks/${taskId}/comments`, data)

export const updateComment = (projectId, taskId, commentId, data) =>
  api.patch(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, data)

export const deleteComment = (projectId, taskId, commentId) =>
  api.delete(`/projects/${projectId}/tasks/${taskId}/comments/${commentId}`)
