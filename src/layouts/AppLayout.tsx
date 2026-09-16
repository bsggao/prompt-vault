import { useI18n } from '../lib/i18n'
import { Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { GallerySkeleton } from '../components/GallerySkeleton'
import { Header } from '../components/Header'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
export function AppLayout() {
  const { data: settings } = useSiteSettings()
  const { data: canWrite } = useBusinessAccess()
  const { t } = useI18n()

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('Skip to content')}
      </a>
      <Header />
      {canWrite === false && (
        <div className="account-status-notice" role="status">
          {t(
            'Your account can browse, but uploading, editing and favorites are disabled. Contact the administrator for help.',
          )}
        </div>
      )}
      <Suspense
        fallback={
          <main id="main-content" className="upload-page">
            <GallerySkeleton />
          </main>
        }
      >
        <Outlet />
      </Suspense>
      <footer className="site-footer">
        <span>
          © {new Date().getFullYear()} {settings?.site_title || 'PromptVault'}
        </span>
        <span>{settings?.description || t('A home for your imagination.')}</span>
        <span>
          {t('Made for the way you create')} <span className="footer-star">✳</span>
        </span>
      </footer>
    </>
  )
}
