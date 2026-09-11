import { Moon, Sun } from 'lucide-react'
import { useUI } from '../store/ui'
import { Button } from './ui/button'
import { useI18n } from '../lib/i18n'
export function ThemeToggle() {
  const { t } = useI18n()
  const { theme, set } = useUI()
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t(theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode')}
      onClick={() => set({ theme: theme === 'light' ? 'dark' : 'light' })}
    >
      {theme === 'light' ? <Sun size={19} /> : <Moon size={19} />}
    </Button>
  )
}
