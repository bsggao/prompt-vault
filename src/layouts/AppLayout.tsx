import { useI18n } from '../lib/i18n'
import { Outlet } from 'react-router-dom'
import { Suspense } from 'react'
import { GallerySkeleton } from '../components/GallerySkeleton'
import { Header } from '../components/Header'
export function AppLayout() {
  const { t } = useI18n()

  return (
    <>
      <Header />
      <Suspense
        fallback={
          <main className="upload-page">
            <GallerySkeleton />
          </main>
        }
      >
        <Outlet />
      </Suspense>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} PromptVault</span>
        <span>{t('A home for your imagination.')}</span>
        <span>
          {t('Made for the way you create')} <span className="footer-star">✳</span>
        </span>
      </footer>
    </>
  )
}
