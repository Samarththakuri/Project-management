import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Avatar } from '../../components/ui'
import useAuthStore from '../../store/authStore'
import { changePassword, resendVerification } from '../../api/auth.api'
import { logout } from '../../api/auth.api'
import { useNavigate } from 'react-router-dom'

const passwordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const clearUser = useAuthStore((s) => s.clearUser)
  const navigate = useNavigate()
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState('')
  const [resendError, setResendError] = useState('')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(passwordSchema) })

  async function onPasswordSubmit(data) {
    setPasswordError('')
    setPasswordSuccess(false)
    try {
      await changePassword({ oldPassword: data.oldPassword, newPassword: data.newPassword })
      setPasswordSuccess(true)
      reset()
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password')
    }
  }

  async function handleResendVerification() {
    setResending(true)
    setResendMsg('')
    setResendError('')
    try {
      await resendVerification()
      setResendMsg('Verification email sent. Check your inbox.')
    } catch (err) {
      setResendError(err.response?.data?.message || 'Failed to send verification email')
    } finally {
      setResending(false)
    }
  }

  async function handleLogout() {
    try {
      await logout()
    } catch {}
    clearUser()
    navigate('/login', { replace: true })
  }

  return (
    <div className="max-w-container-max mx-auto max-w-2xl">
      <div className="mb-8">
        <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mb-1">
          Configuration
        </p>
        <h1 className="text-headline-lg font-geist text-on-surface">Settings</h1>
      </div>

      {/* Profile section */}
      <section className="bg-surface-container border border-outline-variant mb-6">
        <div className="px-6 py-4 border-b border-outline-variant">
          <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
            Profile
          </p>
        </div>
        <div className="p-6 flex items-center gap-6">
          <Avatar
            src={user?.avatar}
            name={user?.fullName || user?.username || ''}
            size="lg"
          />
          <div>
            <p className="text-headline-sm font-geist text-on-surface">
              {user?.fullName || 'Unknown User'}
            </p>
            <p className="text-body-md font-geist text-on-surface-variant mt-1">{user?.email}</p>
            <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mt-2">
              @{user?.username || ''}
            </p>
          </div>
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between gap-3 text-body-md font-geist">
            <div className="flex items-center gap-3">
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${user?.isEmailVerified ? 'bg-primary-fixed-dim' : 'bg-error'}`}
              />
              <span className="text-on-surface-variant">
                Email {user?.isEmailVerified ? 'verified' : 'not verified'}
              </span>
            </div>
            {!user?.isEmailVerified && (
              <Button
                variant="secondary"
                onClick={handleResendVerification}
                disabled={resending}
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </Button>
            )}
          </div>
          {resendMsg && (
            <p className="mt-3 text-body-md font-geist text-primary-fixed-dim">{resendMsg}</p>
          )}
          {resendError && (
            <p className="mt-3 text-body-md font-geist text-error">{resendError}</p>
          )}
        </div>
      </section>

      {/* Change password section */}
      <section className="bg-surface-container border border-outline-variant mb-6">
        <div className="px-6 py-4 border-b border-outline-variant">
          <p className="text-mono-label font-mono text-on-surface uppercase tracking-widest">
            Change Password
          </p>
        </div>
        <div className="p-6">
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
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="flex flex-col gap-5">
            <Input
              id="oldPassword"
              label="Current Password"
              type="password"
              placeholder="••••••••"
              icon="lock"
              error={errors.oldPassword?.message}
              {...register('oldPassword')}
            />
            <Input
              id="newPassword"
              label="New Password"
              type="password"
              placeholder="Min. 8 characters"
              icon="lock_reset"
              error={errors.newPassword?.message}
              {...register('newPassword')}
            />
            <Input
              id="confirmPassword"
              label="Confirm New Password"
              type="password"
              placeholder="Repeat new password"
              icon="key"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
            <div className="flex justify-end pt-2 border-t border-outline-variant">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </section>

      {/* Danger zone */}
      <section className="bg-surface-container border border-error/30">
        <div className="px-6 py-4 border-b border-error/30">
          <p className="text-mono-label font-mono text-error uppercase tracking-widest">
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
          <Button variant="secondary" onClick={handleLogout} className="border-error/50 text-error hover:bg-error-container/20">
            Sign Out
          </Button>
        </div>
      </section>
    </div>
  )
}
