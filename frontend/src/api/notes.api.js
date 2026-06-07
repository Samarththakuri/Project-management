import api from './axios'

export const getProjectNotes = (projectId) => api.get(`/projects/${projectId}/notes`)
export const createNote = (projectId, data) => api.post(`/projects/${projectId}/notes`, data)
export const getNoteById = (projectId, noteId) =>
  api.get(`/projects/${projectId}/notes/${noteId}`)
export const updateNote = (projectId, noteId, data) =>
  api.patch(`/projects/${projectId}/notes/${noteId}`, data)
export const deleteNote = (projectId, noteId) =>
  api.delete(`/projects/${projectId}/notes/${noteId}`)
