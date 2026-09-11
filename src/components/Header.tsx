import { useI18n } from '../lib/i18n'
import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Plus, UserRound } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'
import { Button } from './ui/button'
import { AuthDialog } from './AuthDialog'
import { useAuth } from '../hooks/useAuth'
import { useUI } from '../store/ui'
export function Header() {
  const { t } = useI18n()

  const [accountOpen, setAccountOpen] = useState(false)
  const { user } = useAuth()
  const resetFilters = useUI((s) => s.resetFilters)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        document.querySelector<HTMLInputElement>('.search-bar input')?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])
  return (
    <>
      <header className="header">
        <Link to="/" className="brand" onClick={resetFilters}>
          <img src="/favicon.svg" alt="" />
          <span>
            PromptVault<span className="brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label={t('Main navigation')}>
          <NavLink to="/" end onClick={resetFilters}>
            {t('Gallery')}{' '}
          </NavLink>
          <NavLink to="/favorites" onClick={resetFilters}>
            {t('Favorites')}{' '}
          </NavLink>
        </nav>
        <SearchBar />
        <div className="header-actions">
          <Button asChild className="header-upload">
            <Link to="/upload">
              <Plus size={17} />
              <span>{t('Upload Prompt')}</span>
            </Link>
          </Button>
          <ThemeToggle />
          <LanguageToggle />
          <button
            className="avatar"
            aria-label={t('Open account')}
            onClick={() => setAccountOpen(true)}
          >
            {user ? (
              user.email?.slice(0, 2).toUpperCase()
            ) : (
              <UserRound size={19} aria-hidden="true" />
            )}
          </button>
        </div>
      </header>
      <AuthDialog open={accountOpen} onOpenChange={setAccountOpen} />
    </>
  )
}
