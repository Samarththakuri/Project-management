import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Button, Input } from '../../components/ui'
import { forgotPassword } from '../../api/auth.api'

const schema = z.object({
  email: z.string().email('Invalid email'),
})

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  async function onSubmit(data) {
    setServerError('')
    try {
      await forgotPassword(data)
      setSent(true)
    } catch (err) {
      setServerError(err.response?.data?.message || 'Request failed')
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 relative">
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-outline-variant" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-outline-variant" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-outline-variant" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-outline-variant" />

      <div className="w-full max-w-sm">
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-primary-fixed-dim flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-primary-fixed-dim text-[24px]">
                mail_lock
              </span>
            </div>
            <h2 className="text-headline-md font-geist text-on-surface mb-3">Reset link sent</h2>
            <p className="text-body-md font-geist text-on-surface-variant mb-6">
              Check your inbox for a password reset link.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                Back to Login
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="text-mono-label font-mono text-primary-fixed-dim uppercase tracking-widest mb-2">
                Recovery
              </p>
              <h2 className="text-headline-md font-geist text-on-surface">Reset password</h2>
              <p className="text-body-md font-geist text-on-surface-variant mt-2">
                Enter your email and we'll send a reset link.
              </p>
            </div>

            {serverError && (
              <div className="mb-4 px-4 py-3 border border-error bg-error-container/20 text-error text-body-md font-geist">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
              <Input
                id="email"
                label="Work Email"
                type="email"
                placeholder="you@company.com"
                icon="mail"
                error={errors.email?.message}
                {...register('email')}
              />
              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
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
          </>
        )}
      </div>
    </div>
  )
}
