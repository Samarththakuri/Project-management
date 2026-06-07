import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { Button, Input } from '../../components/ui'
import { resetPassword } from '../../api/auth.api'

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export default function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  async function onSubmit(data) {
    setServerError('')
    try {
      await resetPassword(token, { newPassword: data.newPassword })
      navigate('/login', { replace: true })
    } catch (err) {
      setServerError(err.response?.data?.message || 'Reset failed')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 relative">
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-outline-variant" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-outline-variant" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-outline-variant" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-outline-variant" />

      <div className="w-full max-w-sm">
        <div className="mb-8">
          <p className="text-mono-label font-mono text-primary-fixed-dim uppercase tracking-widest mb-2">
            Recovery
          </p>
          <h2 className="text-headline-md font-geist text-on-surface">Set new password</h2>
        </div>

        {serverError && (
          <div className="mb-4 px-4 py-3 border border-error bg-error-container/20 text-error text-body-md font-geist">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
          <Input
            id="newPassword"
            label="New Password"
            type="password"
            placeholder="Min. 8 characters"
            icon="lock"
            error={errors.newPassword?.message}
            {...register('newPassword')}
          />
          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            icon="lock_reset"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
          <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update Password'}
          </Button>
        </form>

        <p className="mt-6 text-body-md font-geist text-on-surface-variant text-center">
          <Link
            to="/login"
            className="text-primary-fixed-dim hover:text-primary-fixed transition-colors"
          >
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  )
}
