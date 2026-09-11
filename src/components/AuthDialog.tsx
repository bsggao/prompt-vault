import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  LogOut,
  CircleUserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  LoaderCircle,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { useI18n } from '../lib/i18n'
import { Modal } from './ui/dialog'
import { Button } from './ui/button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import {
  authErrorMessage,
  sendRegistrationCode,
  resendRegistrationCode,
  verifyRegistrationCode,
  signInWithPassword,
  sendRecoveryCode,
  resetPassword,
} from '../services/auth'

type Mode = 'login' | 'register' | 'recovery'
export function AuthDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const { user } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [retryAt, setRetryAt] = useState(0)
  const [now, setNow] = useState(Date.now())
  const pending = useRef(false)
  const seconds = Math.max(0, Math.ceil((retryAt - now) / 1000))
  const showPasswordField =
    mode === 'login' || (mode === 'register' && !sentTo) || (mode === 'recovery' && !!sentTo)

  useEffect(() => {
    if (!retryAt) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [retryAt])
  useEffect(() => {
    if (!open) {
      setPassword('')
      setCode('')
      setError('')
      setShowPassword(false)
    }
  }, [open])

  function switchMode(next: Mode) {
    setMode(next)
    setSentTo('')
    setPassword('')
    setCode('')
    setError('')
    setShowPassword(false)
  }
  async function perform(action: () => Promise<void>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      await action()
    } catch (cause) {
      setError(authErrorMessage(cause))
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  function complete(message = 'Welcome to your vault') {
    setPassword('')
    setCode('')
    setSentTo('')
    setMode('login')
    onOpenChange(false)
    toast.success(t(message))
  }
  async function sendCode() {
    if (Date.now() < retryAt) return
    if (mode === 'register') {
      if (sentTo) await resendRegistrationCode(sentTo)
      else setSentTo(await sendRegistrationCode(email, password))
      setPassword('')
    } else setSentTo(await sendRecoveryCode(sentTo || email))
    setCode('')
    setNow(Date.now())
    setRetryAt(Date.now() + 60_000)
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    void perform(async () => {
      if (mode === 'login') {
        await signInWithPassword(email, password, remember)
        complete()
      } else if (!sentTo) await sendCode()
      else if (mode === 'register') {
        await verifyRegistrationCode(sentTo, code, remember)
        complete()
      } else {
        await resetPassword(sentTo, code, password, remember)
        complete('Password updated. You are signed in.')
      }
    })
  }
  const heading = user
    ? 'Your account'
    : mode === 'login'
      ? 'Welcome back'
      : mode === 'register'
        ? 'Create your account'
        : 'Reset your password'
  const action =
    mode === 'login'
      ? 'Sign in'
      : !sentTo
        ? 'Send verification code'
        : mode === 'register'
          ? 'Verify and create account'
          : 'Reset password and sign in'
  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t(heading)} className="auth-modal">
      <div className="auth-icon">
        <CircleUserRound size={29} />
      </div>
      <p className="auth-brand">PROMPTVAULT</p>
      <h2>{t(heading)}</h2>
      <p className="muted">
        {user
          ? user.email
          : t(
              mode === 'login'
                ? 'Sign in with your email and password.'
                : mode === 'register'
                  ? 'Verify your email once, then sign in with your password.'
                  : 'Verify your email to choose a new password.',
            )}
      </p>
      {!user && (
        <form onSubmit={submit} aria-busy={busy}>
          <label htmlFor="auth-email">
            <Mail size={14} />
            {t('Email')}
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="you@example.com"
            value={sentTo || email}
            disabled={busy || !supabase || !!sentTo}
            onChange={(event) => setEmail(event.target.value)}
          />
          {showPasswordField && (
            <>
              <label htmlFor="auth-password">
                <LockKeyhole size={14} />
                {t(mode === 'recovery' ? 'New password' : 'Password')}
              </label>
              <div className="auth-password">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  minLength={mode === 'login' ? undefined : 8}
                  placeholder={t(
                    mode === 'login' ? 'Enter your password' : 'At least 8 characters',
                  )}
                  value={password}
                  disabled={busy || !supabase}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  aria-label={t(showPassword ? 'Hide password' : 'Show password')}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </>
          )}
          {sentTo && (
            <>
              <p className="auth-status" role="status">
                {t('Code sent to {email}. Check your inbox and spam folder.', { email: sentTo })}
              </p>
              <label htmlFor="auth-code">{t('Verification code')}</label>
              <input
                id="auth-code"
                className="otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                pattern="[0-9]{6,10}"
                minLength={6}
                maxLength={10}
                value={code}
                disabled={busy}
                aria-describedby={error ? 'auth-error' : undefined}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 10))}
              />
              <div className="auth-code-actions">
                <button
                  type="button"
                  disabled={busy || seconds > 0}
                  onClick={() => void perform(sendCode)}
                >
                  {seconds > 0 ? t('Resend in {seconds}s', { seconds }) : t('Resend code')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setSentTo('')
                    setCode('')
                    setError('')
                  }}
                >
                  {t('Change email')}
                </button>
              </div>
            </>
          )}
          <div className="auth-options">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={remember}
                disabled={busy}
                onChange={(event) => setRemember(event.target.checked)}
              />
              {t('Remember me')}
            </label>
            {mode === 'login' && (
              <button type="button" disabled={busy} onClick={() => switchMode('recovery')}>
                {t('Forgot password?')}
              </button>
            )}
          </div>
          {error && (
            <p id="auth-error" role="alert" className="field-error auth-error">
              {t(error)}
            </p>
          )}
          <Button
            type="submit"
            disabled={
              busy ||
              !supabase ||
              (mode !== 'login' && !sentTo && seconds > 0) ||
              (!!sentTo && code.length < 6)
            }
          >
            {busy ? <LoaderCircle size={16} className="spin" /> : <ArrowRight size={16} />}
            {busy
              ? t('Please wait...')
              : mode !== 'login' && !sentTo && seconds > 0
                ? t('Resend in {seconds}s', { seconds })
                : t(action)}
          </Button>
          <p className="auth-switch">
            {t(mode === 'login' ? 'New to PromptVault?' : 'Already have an account?')}{' '}
            <button
              type="button"
              disabled={busy}
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            >
              {t(mode === 'login' ? 'Create account' : 'Back to sign in')}
            </button>
          </p>
        </form>
      )}
      {!supabase && (
        <p className="auth-status" role="status">
          {t('Cloud sign-in is not available yet. Please finish connecting the project.')}
        </p>
      )}
      {user && (
        <>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                const { error } = await supabase!.auth.signOut()
                if (error) throw error
                complete('Signed out')
              })
            }
          >
            <LogOut size={16} />
            {t(busy ? 'Please wait...' : 'Sign out')}
          </Button>
          {error && (
            <p role="alert" className="field-error auth-error">
              {t(error)}
            </p>
          )}
        </>
      )}
      <p className="auth-privacy">
        {t('Choose whether each upload is public or private. Only you can edit your uploads.')}
      </p>
    </Modal>
  )
}
