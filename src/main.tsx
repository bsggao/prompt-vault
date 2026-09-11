import { useI18n } from './lib/i18n'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppLayout } from './layouts/AppLayout'
import { GalleryPage } from './pages/GalleryPage'
import { AuthProvider } from './hooks/useAuth'
import { useUI } from './store/ui'
import './index.css'
const UploadPage = React.lazy(() =>
  import('./pages/UploadPage').then((module) => ({ default: module.UploadPage })),
)
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})
function App() {
  const { t, language, locale } = useI18n()

  const theme = useUI((s) => s.theme)
  React.useEffect(() => {
    document.documentElement.lang = locale
    document.title = t('PromptVault — Your creative library')
  }, [language, locale, t])
  React.useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])
  return (
    <>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<GalleryPage />} />
          <Route path="mine" element={<GalleryPage mine />} />
          <Route path="favorites" element={<GalleryPage favorites />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="edit/:id" element={<UploadPage />} />
          <Route
            path="*"
            element={
              <div className="empty-state">
                <h1>{t('Page not found.')}</h1>
                <a href="/" className="button button-primary">
                  {t('Back to gallery')}{' '}
                </a>
              </div>
            }
          />
        </Route>
      </Routes>
      <Toaster richColors position="bottom-right" theme={theme} />
    </>
  )
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
