import { useI18n } from '../lib/i18n'
import { ImagePlus, SearchX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from './ui/button'
import { useUI } from '../store/ui'
export function EmptyState({
  filtered,
  favorites = false,
}: {
  filtered: boolean
  favorites?: boolean
}) {
  const { t } = useI18n()

  const reset = useUI((s) => s.resetFilters)
  return (
    <div className="empty-state">
      <div className="empty-icon">{filtered ? <SearchX size={28} /> : <ImagePlus size={28} />}</div>
      <h2>
        {filtered
          ? t('No prompts found.')
          : favorites
            ? t('A little inspiration, saved.')
            : t('No prompts yet.')}
      </h2>
      <p>
        {filtered
          ? t('Try another keyword or filter.')
          : favorites
            ? t('Tap the heart on a prompt to keep it here.')
            : t('Save your first AI image prompt.')}
      </p>
      {filtered ? (
        <Button variant="outline" onClick={reset}>
          {t('Clear filters')}{' '}
        </Button>
      ) : (
        <Button asChild>
          <Link to={favorites ? '/' : '/upload'}>
            {favorites ? t('Explore gallery') : t('Add Prompt')}
          </Link>
        </Button>
      )}
    </div>
  )
}
