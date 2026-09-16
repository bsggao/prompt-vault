import { useI18n } from '../lib/i18n'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Heart,
  Pencil,
  Sparkles,
  Share2,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import type { PromptItem } from '../types/prompt'
import { useCopy } from '../hooks/useCopy'
import { usePrompts } from '../hooks/usePrompts'
import { Button } from './ui/button'
import { Modal } from './ui/dialog'
import { useAuth } from '../hooks/useAuth'
import { useUI } from '../store/ui'
function CopyBlock({ title, text }: { title: string; text: string }) {
  const { t } = useI18n()

  const { copied, copy } = useCopy()
  return (
    <section className="detail-section">
      <div className="copy-block-heading">
        <h3>{title}</h3>
        <button
          className="copy-block-copy"
          title={copied ? t('Copied') : t('Copy')}
          aria-label={t('Copy {title}', { title })}
          onClick={() => copy(text)}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="copy-block">
        <p tabIndex={0} role="region" aria-label={title}>
          {text}
        </p>
      </div>
    </section>
  )
}
export function PromptDetail({
  item,
  items,
  onClose,
  onNavigate,
}: {
  item: PromptItem
  items: PromptItem[]
  onClose: () => void
  onNavigate: (id: string) => void
}) {
  const { t, locale } = useI18n()

  const { copy, copied } = useCopy()
  const { copy: copyShareLink } = useCopy()
  const { user } = useAuth()
  const { favorite, remove } = usePrompts()
  const canEdit = !!user && item.ownerId === user.id
  const canFavorite = item.isPublic || canEdit
  const setAuthOpen = useUI((state) => state.setAuthOpen)
  const setPendingFavoriteId = useUI((state) => state.setPendingFavoriteId)
  const [confirm, setConfirm] = useState(false)
  const index = items.findIndex((p) => p.id === item.id)
  const navigate = (delta: number) =>
    onNavigate(items[(index + delta + items.length) % items.length].id)
  const handleFavorite = () => {
    if (!user) {
      setPendingFavoriteId(item.id)
      setAuthOpen(true)
      return
    }
    favorite.mutate(item)
  }
  const sharePrompt = async () => {
    const url = new URL('/', window.location.origin)
    url.searchParams.set('prompt', item.id)
    if (navigator.share) {
      try {
        await navigator.share({
          title: item.title,
          text: t('Discover this prompt on PromptVault'),
          url: url.href,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copyShareLink(url.href, 'Link copied')
  }
  return (
    <>
      <Modal
        open
        onOpenChange={(open) => !open && onClose()}
        title={item.title}
        className="detail-modal"
      >
        <div className="detail-image">
          <img src={item.imageUrl} alt={item.title} decoding="async" />
          {items.length > 1 && (
            <>
              <button
                className="image-arrow prev"
                onClick={() => navigate(-1)}
                aria-label={t('Previous prompt')}
              >
                <ChevronLeft size={21} />
              </button>
              <button
                className="image-arrow next"
                onClick={() => navigate(1)}
                aria-label={t('Next prompt')}
              >
                <ChevronRight size={21} />
              </button>
              <span className="image-pagination">
                {index + 1} / {items.length}
              </span>
            </>
          )}
        </div>
        <div className="detail-content">
          <div className="detail-heading">
            <div>
              <p className="eyebrow">{t('A LITTLE INSPIRATION')}</p>
              <h2>{item.title}</h2>
            </div>
            {canFavorite && (
              <button
                className={`detail-heart ${item.isFavorite ? 'is-favorite' : ''}`}
                disabled={favorite.isPending && favorite.variables?.id === item.id}
                onClick={handleFavorite}
                aria-label={item.isFavorite ? t('Remove from favorites') : t('Add to favorites')}
                aria-pressed={item.isFavorite}
              >
                <Heart size={22} fill={item.isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
          <div className="detail-badges">
            <span>
              <Sparkles size={13} />
              {t(item.model || 'Other')}
            </span>
            <span>{t(item.category)}</span>
          </div>
          <div className="detail-tags">
            {item.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </div>
          <dl className="detail-meta">
            <dt>{t('Aspect ratio')}</dt>
            <dd>
              <span>{item.aspectRatio || t('Not specified')}</span>
            </dd>
            <dt>{t('Source')}</dt>
            <dd>{t(item.source || 'Original')}</dd>
            {item.sourceUrl && (
              <>
                <dt>{t('Source URL')}</dt>
                <dd>
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {item.sourceUrl.replace(/^https?:\/\//, '')}
                    <ExternalLink size={12} />
                  </a>
                </dd>
              </>
            )}
          </dl>
          <CopyBlock title={t('Prompt')} text={item.prompt} />
          {item.negativePrompt && (
            <CopyBlock title={t('Negative prompt')} text={item.negativePrompt} />
          )}{' '}
          {item.notes && (
            <section className="detail-section">
              <h3>{t('Notes')}</h3>
              <p className="detail-notes">{item.notes}</p>
            </section>
          )}
          <div className="detail-created">
            {t('Created')}{' '}
            {new Date(item.createdAt).toLocaleDateString(locale, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            <span>·</span>
            {t(
              item.moderationStatus === 'removed'
                ? 'Removed from gallery'
                : item.isPublic
                  ? 'Public'
                  : 'Only you',
            )}
          </div>
          <div className="detail-actions">
            <Button onClick={() => copy(item.prompt)}>
              {copied ? <Check size={15} /> : <Copy size={15} />}{' '}
              {copied ? t('Copied') : t('Copy prompt')}
            </Button>
            {item.isPublic && item.moderationStatus !== 'removed' && (
              <Button variant="outline" onClick={() => void sharePrompt()}>
                <Share2 size={15} />
                {t('Share')}
              </Button>
            )}
            {canEdit && (
              <>
                <Button variant="outline" asChild>
                  <Link to={`/edit/${item.id}`}>
                    <Pencil size={14} />
                    {t('Edit')}{' '}
                  </Link>
                </Button>
                <Button variant="destructive" onClick={() => setConfirm(true)}>
                  <Trash2 size={14} />
                  {t('Delete')}{' '}
                </Button>
              </>
            )}
          </div>
        </div>
      </Modal>
      <AlertDialog.Root open={confirm} onOpenChange={setConfirm}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="modal-overlay alert-overlay" />
          <AlertDialog.Content className="alert-content">
            <div className="delete-icon">
              <Trash2 size={23} />
            </div>
            <AlertDialog.Title>{t('Delete this prompt?')}</AlertDialog.Title>
            <AlertDialog.Description>
              {t(
                'This action cannot be undone. The image and prompt will be removed from your vault.',
              )}{' '}
            </AlertDialog.Description>
            <div className="alert-actions">
              <AlertDialog.Cancel asChild>
                <Button variant="outline" disabled={remove.isPending}>
                  {t('Cancel')}{' '}
                </Button>
              </AlertDialog.Cancel>
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() =>
                  remove.mutate(item.id, {
                    onSuccess: () => {
                      setConfirm(false)
                      onClose()
                    },
                  })
                }
              >
                {remove.isPending ? t('Deleting…') : t('Delete')}
              </Button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}
