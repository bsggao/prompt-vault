import { Loader2 } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { Button } from './ui/button'

export function GoogleSignInButton({
  busy,
  disabled,
  onClick,
}: {
  busy: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const { t } = useI18n()
  return (
    <Button
      type="button"
      variant="outline"
      className="google-signin"
      disabled={disabled || busy}
      onClick={onClick}
    >
      {busy ? (
        <Loader2 size={19} className="spin" />
      ) : (
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.22c1.89-1.74 2.99-4.31 2.99-7.36Z"
          />
          <path
            fill="#34A853"
            d="M12 22c2.7 0 4.96-.9 6.61-2.41l-3.22-2.51c-.9.6-2.04.97-3.39.97-2.61 0-4.82-1.76-5.61-4.12H3.06v2.59A10 10 0 0 0 12 22Z"
          />
          <path
            fill="#FBBC05"
            d="M6.39 13.93A6 6 0 0 1 6.07 12c0-.67.11-1.32.32-1.93V7.48H3.06A10 10 0 0 0 2 12c0 1.61.38 3.14 1.06 4.52l3.33-2.59Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.95c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.94 5.48l3.33 2.59C7.18 7.71 9.39 5.95 12 5.95Z"
          />
        </svg>
      )}
      {t(busy ? 'Opening Google…' : 'Continue with Google')}
    </Button>
  )
}
