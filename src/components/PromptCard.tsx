import { useI18n } from '../lib/i18n'
import { ArrowUpRight, Check, Copy, Globe2, Heart, LockKeyhole, Sparkles } from 'lucide-react'
import type { PromptItem } from '../types/prompt'
import { useCopy } from '../hooks/useCopy'
import { useUI } from '../store/ui'
export function PromptCard({
  item,
  index,
  onOpen,
  onFavorite,
  favoritePending,
  canFavorite,
  showVisibility,
}: {
  item: PromptItem
  index: number
  onOpen: () => void
  onFavorite: () => void
  favoritePending: boolean
  canFavorite: boolean
  showVisibility: boolean
}) {
  const { t } = useI18n()

  const { copied, copy } = useCopy()
  const set = useUI((s) => s.set)
  return (
    <article className="prompt-card" style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}>
      <div className="card-image">
        <button
          className="image-open"
          onClick={onOpen}
          aria-label={t('View {title}', { title: item.title })}
        >
          <img
            src={item.imageUrl}
            alt={item.title}
            loading={index < 2 ? 'eager' : 'lazy'}
            fetchPriority={index === 0 ? 'high' : 'auto'}
            decoding="async"
          />
        </button>
        <div className="card-badges">
          <span className="image-category">{t(item.category)}</span>
          {showVisibility && (
            <span className={`visibility-badge ${item.isPublic ? 'is-public' : 'is-private'}`}>
              {item.isPublic ? <Globe2 size={12} /> : <LockKeyhole size={12} />}
              {t(item.isPublic ? 'Public' : 'Only you')}
            </span>
          )}
        </div>
        <div className="image-hover">
          <button onClick={onOpen}>
            {t('View prompt')} <ArrowUpRight size={16} />
          </button>
          <button
            onClick={() => copy(item.prompt)}
            aria-label={t('Copy {title} prompt', { title: item.title })}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
          {canFavorite && (
            <button
              disabled={favoritePending}
              onClick={onFavorite}
              aria-busy={favoritePending}
              aria-label={t(item.isFavorite ? 'Unfavorite {title}' : 'Favorite {title}', {
                title: item.title,
              })}
            >
              <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>
      <div className="card-content">
        <button className="card-title" onClick={onOpen}>
          {item.title}
        </button>
        <span className="model-badge">
          <Sparkles size={10} />
          {t(item.model || 'Other')}
        </span>
        <div className="card-tags">
          {item.tags.slice(0, 3).map((tag) => (
            <button key={tag} onClick={() => set({ search: tag })}>
              #{tag}
            </button>
          ))}
        </div>
        <div className="card-footer">
          {canFavorite && (
            <button
              className={`favorite-button ${item.isFavorite ? 'is-favorite' : ''}`}
              disabled={favoritePending}
              onClick={onFavorite}
              aria-busy={favoritePending}
              aria-label={t(
                item.isFavorite ? 'Remove {title} from favorites' : 'Save {title} to favorites',
                { title: item.title },
              )}
              aria-pressed={item.isFavorite}
            >
              <Heart size={16} fill={item.isFavorite ? 'currentColor' : 'none'} />
              <span>{item.isFavorite ? t('Saved') : t('Save')}</span>
            </button>
          )}
          <button
            className="card-copy"
            onClick={() => copy(item.prompt)}
            aria-label={t('Copy prompt for {title}', { title: item.title })}
            title={copied ? t('Copied') : t('Copy prompt')}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>
    </article>
  )
}
