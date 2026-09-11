import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { LogOut, CircleUserRound } from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '../lib/i18n'
import { Modal } from './ui/dialog'
import { Button } from './ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { signInWithGoogle } from '../services/auth'
import { GoogleSignInButton } from './GoogleSignInButton'

export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const { user } = useAuth()
  const { pathname } = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function googleLogin() {
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle(pathname)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.')
      setBusy(false)
    }
  }

  async function signOut() {
    if (!supabase) return
    setBusy(true)
    setError('')
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      onOpenChange(false)
      toast.success(t('Signed out'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-out failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t(user ? 'Your account' : 'Sign in to your vault')}
      className="auth-modal"
    >
      <div className="auth-icon">
        <CircleUserRound size={29} />
      </div>
      <h2>{t(user ? 'Your account' : 'Sign in to save your inspiration.')}</h2>
      <p className="muted">
        {user
          ? user.email
          : t(
              'Use Google to collect images and prompts, with everything saved securely in your cloud library.',
            )}
      </p>
      {!user && <GoogleSignInButton busy={busy} disabled={!supabase} onClick={googleLogin} />}
      {!supabase && (
        <p className="auth-status" role="status">
          {t('Cloud sign-in is not available yet. Please finish connecting the project.')}
        </p>
      )}
      {user && (
        <Button variant="outline" disabled={busy} onClick={signOut}>
          <LogOut size={16} />
          {t(busy ? 'Please wait...' : 'Sign out')}
        </Button>
      )}
      {error && (
        <p role="alert" className="field-error auth-error">
          {t(error)}
        </p>
      )}
      <p className="auth-privacy">
        {t('Your images and prompts are stored in the cloud, accessible only to you by default.')}
      </p>
    </Modal>
  )
}
