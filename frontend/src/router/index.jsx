import { createBrowserRouter, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useAuthStore from '../store/authStore'
import { getCurrentUser } from '../api/auth.api'

import AppLayout from '../components/layout/AppLayout'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage'
import VerifyEmailPage from '../pages/auth/VerifyEmailPage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import ProjectsPage from '../pages/projects/ProjectsPage'
import ProjectOverviewPage from '../pages/projects/ProjectOverviewPage'
import KanbanBoardPage from '../pages/projects/KanbanBoardPage'
import CalendarView from '../pages/projects/CalendarView'
import SettingsPage from '../pages/settings/SettingsPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, setUser } = useAuthStore()
  const [checking, setChecking] = useState(!isAuthenticated)
  const location = useLocation()

  useEffect(() => {
    if (isAuthenticated) {
      setChecking(false)
      return
    }
    getCurrentUser()
      .then((res) => {
        setUser(res.data.data)
        setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [])

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest animate-pulse">
          Authenticating...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password/:token', element: <ResetPasswordPage /> },
  { path: '/verify-email/:token', element: <VerifyEmailPage /> },
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      { path: '/projects', element: <ProjectsPage /> },
      { path: '/projects/:projectId', element: <ProjectOverviewPage /> },
      { path: '/projects/:projectId/board', element: <KanbanBoardPage /> },
      { path: '/projects/:projectId/calendar', element: <CalendarView /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
])

export default router
