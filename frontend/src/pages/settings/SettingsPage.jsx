import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Avatar, Skeleton } from '../../components/ui'
import useAuthStore from '../../store/authStore'
import useNotificationStore from '../../store/notificationStore'
import { changePassword, logout, resendVerification } from '../../api/auth.api'
import { apiErrorMessage, retryAfterFromError } from '../../utils/errors'
import { avatarUrl } from '../../utils/format'

// Mirrors backend/src/validators/auth.schemas.js — keep the two in step.
const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword !== d.oldPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword'],
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

const RESEND_COOLDOWN_SECONDS = 60
const SUCCESS_HIDE_MS = 5000
// Don't re-hit /current-user more than once per this window when the tab is
// focused and blurred repeatedly.
const REFRESH_THROTTLE_MS = 3000

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const isLoading = useAuthStore((s) => s.isLoading)
  const clearUser = useAuthStore((s) => s.clearUser)
  const refreshUser = useAuthStore((s) => s.refreshUser)
  const resetNotifications = useNotificationStore((s) => s.reset)
  const navigate = useNavigate()

  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [resendError, setResendError] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [loggingOut, setLoggingOut] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) })

  const lastRefreshRef = useRef(0)

  // The verification link opens on an unauthenticated route (often in another
  // tab), so this tab only learns about it by re-asking the API. Refresh on
  // mount and whenever the tab regains focus.
  const syncUser = useCallback(() => {
    if (document.visibilityState === 'hidden') return
    const now = Date.now()
    if (now - lastRefreshRef.current < REFRESH_THROTTLE_MS) return
    lastRefreshRef.current = now
    refreshUser()
  }, [refreshUser])

  useEffect(() => {
    syncUser()
    window.addEventListener('focus', syncUser)
    document.addEventListener('visibilitychange', syncUser)
    return () => {
      window.removeEventListener('focus', syncUser)
      document.removeEventListener('visibilitychange', syncUser)
    }
  }, [syncUser])

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => (s > 1 ? s - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  // Auto-hide the password success banner.
  useEffect(() => {
    if (!passwordSuccess) return
    const id = setTimeout(() => setPasswordSuccess(false), SUCCESS_HIDE_MS)
    return () => clearTimeout(id)
  }, [passwordSuccess])

  // Dismiss stale password feedback as soon as the user edits the form again.
  // Wired through register()'s onChange rather than watch() so it only fires on
  // real edits (reset() would otherwise wipe the banner we just showed).
  const clearPasswordFeedback = useCallback(() => {
    setPasswordSuccess(false)
    setPasswordError('')
  }, [])

  async function onPasswordSubmit(data) {
    setPasswordError('')
    setPasswordSuccess(false)
    try {
      await changePassword({ oldPassword: data.oldPassword, newPassword: data.newPassword })
      reset()
      setPasswordSuccess(true)
    } catch (err) {
      setPasswordError(apiErrorMessage(err, 'Failed to update password'))
    }
  }

  async function handleResendVerification() {
    setResending(true)
    setResendMsg('')
    setResendError('')
    try {
      await resendVerification()
      setResendMsg('Verification email sent. Check your inbox.')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      setResendError(apiErrorMessage(err, 'Failed to send verification email'))
      // A 429 tells us exactly how long the server wants us to wait.
      const retryAfter = retryAfterFromError(err)
      if (retryAfter) setCooldown(retryAfter)
    } finally {
      setResending(false)
    }
  }

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      // Server-side this clears the stored refresh token and both httpOnly
      // cookies. Auth state lives only in cookies + these stores, so a failure
      // here must not stop the local teardown.
      await logout()
    } catch {
      // Ignored — sign out locally regardless.
    } finally {
      clearUser()
      resetNotifications()
      navigate('/login', { replace: true })
    }
  }

  const profileLoading = isLoading && !user
  const verified = !!user?.isEmailVerified

  return (
    <div className="max-w-container-max mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
          Configuration
        </p>
        <h1 className="text-headline-lg font-geist text-on-surface">Settings</h1>
      </div>

      {/* Profile section */}
      <section
        aria-labelledby="settings-profile-heading"
        className="bg-surface-container border border-outline-variant mb-6"
      >
        <div className="px-6 py-4 border-b border-outline-variant">
          <p
            id="settings-profile-heading"
            className="text-mono-label font-mono text-on-surface uppercase tracking-widest"
          >
            Profile
          </p>
        </div>
        {profileLoading ? (
          <div className="p-6 flex items-center gap-6" aria-busy="true">
            <Skeleton className="w-10 h-10 flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-6" width="40%" />
              <Skeleton className="h-4" width="60%" />
              <Skeleton className="h-3" width="25%" />
            </div>
            <span className="sr-only">Loading your profile…</span>
          </div>
        ) : (
          <div className="p-6 flex items-center gap-6">
            <Avatar
              src={avatarUrl(user?.avatar)}
              name={user?.fullName || user?.username || ''}
              size="lg"
            />
            <div>
              <p className="text-headline-sm font-geist text-on-surface">
                {user?.fullName || user?.username || '—'}
              </p>
              <p className="text-body-md font-geist text-on-surface-variant mt-1">{user?.email}</p>
              <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mt-2">
                @{user?.username || ''}
              </p>
            </div>
          </div>
        )}
        {!profileLoading && (
          <div className="px-6 pb-6">
            <div className="flex items-center justify-between gap-3 text-body-md font-geist">
              <p className="flex items-center gap-3" role="status" aria-live="polite">
                <span
                  aria-hidden="true"
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${verified ? 'bg-primary-fixed-dim' : 'bg-error'}`}
                />
                <span className="text-on-surface-variant">
                  Email {verified ? 'verified' : 'not verified'}
                </span>
              </p>
              {!verified && (
                <Button
                  variant="secondary"
                  onClick={handleResendVerification}
                  disabled={resending || cooldown > 0}
                  aria-busy={resending}
                  aria-label={
                    cooldown > 0
                      ? `Resend verification email, available in ${cooldown} seconds`
                      : 'Resend verification email'
                  }
                >
                  {resending
                    ? 'Sending…'
                    : cooldown > 0
                      ? `Resend verification email (${cooldown}s)`
                      : 'Resend verification email'}
                </Button>
              )}
            </div>
            <div aria-live="polite">
              {resendMsg && (
                <p className="mt-3 text-body-md font-geist text-primary-fixed-dim">{resendMsg}</p>
              )}
              {resendError && (
                <p className="mt-3 text-body-md font-geist text-error">{resendError}</p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Change password section */}
      <section
        aria-labelledby="settings-password-heading"
        className="bg-surface-container border border-outline-variant mb-6"
      >
        <div className="px-6 py-4 border-b border-outline-variant">
          <p
            id="settings-password-heading"
            className="text-mono-label font-mono text-on-surface uppercase tracking-widest"
          >
            Change Password
          </p>
        </div>
        <div className="p-6">
          <div aria-live="polite">
            {passwordSuccess && (
              <div className="mb-4 px-4 py-3 border border-primary-fixed-dim bg-on-primary-fixed-variant/20 text-primary-fixed-dim text-body-md font-geist">
                Password updated successfully.
              </div>
            )}
            {passwordError && (
              <div className="mb-4 px-4 py-3 border border-error bg-error-container/20 text-error text-body-md font-geist">
                {passwordError}
              </div>
            )}
          </div>
          <form
            onSubmit={handleSubmit(onPasswordSubmit)}
            aria-label="Change password"
            className="flex flex-col gap-5"
          >
            <Input
              id="oldPassword"
              label="Current Password"
              type="password"
              placeholder="••••••••"
              icon="lock"
              autoComplete="current-password"
              error={errors.oldPassword?.message}
              {...register('oldPassword', { onChange: clearPasswordFeedback })}
            />
            <Input
              id="newPassword"
              label="New Password"
              type="password"
              placeholder="Min. 8 characters"
              icon="lock_reset"
              autoComplete="new-password"
              error={errors.newPassword?.message}
              {...register('newPassword', { onChange: clearPasswordFeedback })}
            />
            <Input
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              icon="key"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', { onChange: clearPasswordFeedback })}
            />
            <div className="flex justify-end pt-2 border-t border-outline-variant">
              <Button type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Danger zone */}
      <section
        aria-labelledby="settings-session-heading"
        className="bg-surface-container border border-error/30"
      >
        <div className="px-6 py-4 border-b border-error/30">
          <p
            id="settings-session-heading"
            className="text-mono-label font-mono text-error uppercase tracking-widest"
          >
            Session
          </p>
        </div>
        <div className="p-6 flex items-center justify-between">
          <div>
            <p className="text-body-md font-geist text-on-surface">Sign out of Project Camp</p>
            <p className="text-body-md font-geist text-on-surface-variant mt-1">
              You will be redirected to the login page.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogout}
            disabled={loggingOut}
            aria-busy={loggingOut}
            className="border-error/50 text-error hover:bg-error-container/20"
          >
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </Button>
        </div>
      </section>
    </div>
  )
}
