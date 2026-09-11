import { useState } from 'react'
import { Cloud } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { AuthDialog } from './AuthDialog'
import { Button } from './ui/button'

export function CloudAccess() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  return (
    <div className="empty-state cloud-access">
      <div className="empty-icon">
        <Cloud size={29} />
      </div>
      <h2>{t('Your inspiration, in the cloud.')}</h2>
      <p>
        {t(
          supabase
            ? 'Sign in with your email to save and sync your images and prompts.'
            : 'Cloud storage is not configured yet.',
        )}
      </p>
      <Button onClick={() => setOpen(true)}>{t('Sign in to continue')}</Button>
      <AuthDialog open={open} onOpenChange={setOpen} />
    </div>
  )
}
