import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { verifyEmail } from '../../api/auth.api'

export default function VerifyEmailPage() {
  const { token } = useParams()
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    verifyEmail(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8 relative">
      <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-outline-variant" />
      <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-outline-variant" />
      <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-outline-variant" />
      <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-outline-variant" />

      <div className="w-full max-w-sm text-center">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-2 border-outline-variant flex items-center justify-center mx-auto mb-6 animate-pulse">
              <span className="material-symbols-outlined text-on-surface-variant text-[24px]">
                hourglass_top
              </span>
            </div>
            <p className="text-mono-label font-mono text-on-surface-variant uppercase tracking-widest">
              Verifying...
            </p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 border-2 border-primary-fixed-dim flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-primary-fixed-dim text-[24px]">
                verified
              </span>
            </div>
            <h2 className="text-headline-md font-geist text-on-surface mb-3">Email verified</h2>
            <p className="text-body-md font-geist text-on-surface-variant mb-6">
              Your account is now active. You can sign in.
            </p>
            <Link to="/login">
              <Button className="w-full">Access System</Button>
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 border-2 border-error flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-error text-[24px]">
                error_outline
              </span>
            </div>
            <h2 className="text-headline-md font-geist text-on-surface mb-3">
              Verification failed
            </h2>
            <p className="text-body-md font-geist text-on-surface-variant mb-6">
              The link may have expired or is invalid.
            </p>
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                Back to Login
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
