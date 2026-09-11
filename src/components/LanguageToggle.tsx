import { useUI } from '../store/ui'
import { useI18n } from '../lib/i18n'
import { Button } from './ui/button'

export function LanguageToggle() {
  const { language } = useI18n()
  const set = useUI((state) => state.set)
  const label = language === 'en' ? '切换为中文' : 'Switch to English'
  return (
    <Button
      variant="ghost"
      className="language-toggle"
      aria-label={label}
      title={label}
      onClick={() => set({ language: language === 'en' ? 'zh' : 'en' })}
    >
      <span lang={language === 'en' ? 'zh-CN' : 'en'}>{language === 'en' ? '中文' : 'EN'}</span>
    </Button>
  )
}
