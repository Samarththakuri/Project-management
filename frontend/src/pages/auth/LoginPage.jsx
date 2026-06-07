import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Button, Input } from '../../components/ui'
import useAuthStore from '../../store/authStore'
import { login } from '../../api/auth.api'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const setUser = useAuthStore((s) => s.setUser)
  const [serverError, setServerError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  async function onSubmit(data) {
    setServerError('')
    try {
      const res = await login(data)
      setUser(res.data.data.user)
      const from = location.state?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setServerError(err.response?.data?.message || 'Login failed')
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-surface-container-low border-r border-outline-variant p-12 relative overflow-hidden">
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-16 h-16 border-t-2 border-l-2 border-primary-fixed-dim" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-b-2 border-r-2 border-primary-fixed-dim" />

        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-on-surface"
              style={{ left: `${(i + 1) * 12.5}%` }}
            />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0 border-t border-on-surface"
              style={{ top: `${(i + 1) * 16.67}%` }}
            />
          ))}
        </div>

        <div className="relative">
          <p className="text-mono-label font-mono text-primary-fixed-dim uppercase tracking-widest mb-2">
            Project Camp
          </p>
          <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
            Technical Operations
          </p>
        </div>

        <div className="relative">
          <h1 className="text-headline-lg font-geist text-on-surface leading-tight mb-4">
            Control your
            <br />
            <span className="text-primary-fixed-dim">project stack.</span>
          </h1>
          <p className="text-body-lg font-geist text-on-surface-variant max-w-sm">
            High-velocity project management for engineering teams who demand precision.
          </p>
        </div>

        <div className="relative flex items-center gap-8">
          <div>
            <p className="text-headline-sm font-geist text-primary-fixed-dim">99.9%</p>
            <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mt-1">
              Uptime
            </p>
          </div>
          <div className="w-px h-10 bg-outline-variant" />
          <div>
            <p className="text-headline-sm font-geist text-on-surface">48ms</p>
            <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest mt-1">
              Avg Response
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 lg:p-16 relative">
        {/* Corner accents (mobile-visible) */}
        <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-outline-variant" />
        <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-outline-variant" />
        <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-outline-variant" />
        <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-outline-variant" />

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-mono-label font-mono text-primary-fixed-dim uppercase tracking-widest mb-2">
              System Access
            </p>
            <h2 className="text-headline-md font-geist text-on-surface">Sign in</h2>
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
            <div className="flex flex-col gap-1">
              <Input
                id="password"
                label="Password"
                type="password"
                placeholder="••••••••"
                icon="lock"
                error={errors.password?.message}
                {...register('password')}
              />
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-mono-label font-mono text-on-surface-variant hover:text-primary-fixed-dim uppercase tracking-widest transition-colors"
                >
                  Forgot?
                </Link>
              </div>
            </div>

            <Button type="submit" size="lg" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? 'Authenticating...' : 'Access System'}
            </Button>
          </form>

          <p className="mt-6 text-body-md font-geist text-on-surface-variant text-center">
            No account?{' '}
            <Link
              to="/register"
              className="text-primary-fixed-dim hover:text-primary-fixed transition-colors"
            >
              Initialize one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
