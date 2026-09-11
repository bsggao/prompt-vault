import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, CircleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '../lib/i18n'
import { finishGoogleSignIn, safeReturnTo } from '../services/auth'
import { AuthDialog } from '../components/AuthDialog'
import { Button } from '../components/ui/button'

export function AuthCallbackPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(false)
  const [callback] = useState(() => {
    const url = new URL(window.location.href)
    const fragment = new URLSearchParams(url.hash.slice(1))
    return {
      denied: url.searchParams.get('error') || fragment.get('error'),
      code: url.searchParams.get('code'),
      next: safeReturnTo(url.searchParams.get('next')),
    }
  })
  useEffect(() => {
    let cancelled = false
    const { denied, code, next } = callback
    async function finish() {
      try {
        if (denied)
          throw new Error(
            denied === 'access_denied'
              ? 'Google sign-in was cancelled. Please try again.'
              : 'Sign-in could not be completed. Please try again.',
          )
        if (!code) throw new Error('The sign-in link is missing or expired. Please sign in again.')
        await finishGoogleSignIn(code)
        if (!cancelled) {
          toast.success(t('Welcome to your vault'))
          navigate(next, { replace: true })
        }
      } catch (cause) {
        if (!cancelled) {
          // Remove OAuth credentials/error parameters from history after processing.
          window.history.replaceState(window.history.state, '', '/auth/callback')
          setError(
            cause instanceof Error
              ? cause.message
              : 'Sign-in could not be completed. Please try again.',
          )
        }
      }
    }
    void finish()
    return () => {
      cancelled = true
    }
  }, [navigate, t, callback])
  return (
    <main className="empty-state">
      {error ? (
        <>
          <CircleAlert size={32} />
          <h1>{t('Sign-in was not completed.')}</h1>
          <p role="alert">{t(error)}</p>
          <Button onClick={() => setRetry(true)}>{t('Try again')}</Button>
          <AuthDialog open={retry} onOpenChange={setRetry} />
        </>
      ) : (
        <>
          <Loader2 size={32} className="spin" />
          <h1>{t('Completing sign-in…')}</h1>
          <p role="status">{t('Connecting to your cloud library.')}</p>
        </>
      )}
    </main>
  )
}
