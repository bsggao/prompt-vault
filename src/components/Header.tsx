import { useI18n } from '../lib/i18n'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Plus, UserRound } from 'lucide-react'
import { SearchBar } from './SearchBar'
import { ThemeToggle } from './ThemeToggle'
import { LanguageToggle } from './LanguageToggle'
import { Button } from './ui/button'
import { useAuth } from '../hooks/useAuth'
import { useUI } from '../store/ui'
import { useSiteSettings } from '../hooks/useSiteSettings'

const AuthDialog = lazy(() =>
  import('./AuthDialog').then((module) => ({ default: module.AuthDialog })),
)
export function Header() {
  const { data: settings } = useSiteSettings()
  const { t } = useI18n()

  const { user } = useAuth()
  const resetFilters = useUI((s) => s.resetFilters)
  const accountOpen = useUI((s) => s.authOpen)
  const setAccountOpen = useUI((s) => s.setAuthOpen)
  const setPendingFavoriteId = useUI((s) => s.setPendingFavoriteId)
  const preservePendingFavorite = useRef(false)
  const handleAccountOpenChange = (open: boolean) => {
    if (!open && !preservePendingFavorite.current) setPendingFavoriteId(null)
    preservePendingFavorite.current = false
    setAccountOpen(open)
  }
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
          <span className="brand-label" title={settings?.site_title || 'PromptVault'}>
            {settings?.site_title || 'PromptVault'}
            <span className="brand-dot">.</span>
          </span>
        </Link>
        <nav aria-label={t('Main navigation')}>
          <NavLink to="/" end onClick={resetFilters}>
            {t('Gallery')}{' '}
          </NavLink>
          {user && (
            <NavLink to="/mine" onClick={resetFilters}>
              {t('Mine')}{' '}
            </NavLink>
          )}
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
      {accountOpen && (
        <Suspense fallback={null}>
          <AuthDialog
            open
            onAuthenticated={() => {
              preservePendingFavorite.current = true
            }}
            onOpenChange={handleAccountOpenChange}
          />
        </Suspense>
      )}
    </>
  )
}
