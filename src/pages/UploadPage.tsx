import { useI18n } from '../lib/i18n'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { PromptForm } from '../components/PromptForm'
import { usePrompts } from '../hooks/usePrompts'
import { useAuth } from '../hooks/useAuth'
import { CloudAccess } from '../components/CloudAccess'
import { Button } from '../components/ui/button'
import { GallerySkeleton } from '../components/GallerySkeleton'
export function UploadPage() {
  const { t } = useI18n()

  const { id } = useParams()
  const { items, isLoading, error, refetch } = usePrompts()
  const { user, ready } = useAuth()
  const item = items.find((p) => p.id === id)
  if (!ready || (id && isLoading))
    return (
      <main id="main-content" className="upload-page">
        <GallerySkeleton />
      </main>
    )
  if (!user)
    return (
      <main id="main-content" className="upload-page">
        <CloudAccess />
      </main>
    )
  if (id && error)
    return (
      <main id="main-content" className="empty-state">
        <h2>{t('Unable to load this prompt.')}</h2>
        <p>{t(error.message)}</p>
        <Button onClick={() => refetch()}>{t('Try again')}</Button>
      </main>
    )
  if (id && !item)
    return (
      <main id="main-content" className="empty-state">
        <h2>{t('Prompt not found.')}</h2>
        <Button asChild>
          <Link to="/">{t('Back to gallery')}</Link>
        </Button>
      </main>
    )
  if (id && item?.ownerId !== user.id)
    return (
      <main id="main-content" className="empty-state">
        <h2>{t('You can only edit your own uploads.')}</h2>
        <Button asChild>
          <Link to="/">{t('Back to gallery')}</Link>
        </Button>
      </main>
    )
  return (
    <main id="main-content" className="upload-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={15} />
        {t('Back to gallery')}{' '}
      </Link>
      <div className="upload-heading">
        <div>
          <p className="eyebrow">{t('GOOD IDEAS DESERVE A HOME')}</p>
          <h1>{item ? t('Refine your inspiration.') : t('Save a little inspiration.')}</h1>
          <p>
            {item
              ? t('Fine-tune the details, keep the idea.')
              : t('An amazing image. The perfect prompt. Keep them together.')}
          </p>
        </div>
      </div>
      <PromptForm key={id ?? 'new'} item={item} />
    </main>
  )
}
