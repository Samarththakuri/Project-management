import api from './axios'

export const register = (data) => api.post('/auth/register', data)
export const login = (data) => api.post('/auth/login', data)
export const logout = () => api.post('/auth/logout')
export const getCurrentUser = () => api.get('/auth/current-user')
export const verifyEmail = (token) => api.get(`/auth/verify-email/${token}`)
export const forgotPassword = (data) => api.post('/auth/forgot-password', data)
export const resetPassword = (token, data) => api.post(`/auth/reset-password/${token}`, data)
export const changePassword = (data) => api.post('/auth/change-password', data)
export const refreshToken = () => api.post('/auth/refresh-token')
