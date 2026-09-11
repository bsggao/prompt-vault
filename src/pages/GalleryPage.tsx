import { useI18n } from '../lib/i18n'
import { useState } from 'react'
import { ArrowUpRight, FolderHeart, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { usePrompts } from '../hooks/usePrompts'
import { useUI } from '../store/ui'
import { filterPrompts } from '../utils/filterPrompts'
import { Filters } from '../components/Filters'
import { PromptGrid } from '../components/PromptGrid'
import { PromptDetail } from '../components/PromptDetail'
import { EmptyState } from '../components/EmptyState'
import { GallerySkeleton } from '../components/GallerySkeleton'
import { Button } from '../components/ui/button'
import { useAuth } from '../hooks/useAuth'
import { CloudAccess } from '../components/CloudAccess'
export function GalleryPage({ favorites = false }: { favorites?: boolean }) {
  const { t } = useI18n()

  const { items, isLoading, error, refetch, favorite } = usePrompts()
  const ui = useUI()
  const { user } = useAuth()
  const [selected, setSelected] = useState<string | null>(null)
  const filtered = filterPrompts(items, ui, favorites)
  const current = items.find((p) => p.id === selected)
  const hasFilters =
    !!ui.search || ui.category !== 'All' || ui.model !== 'All' || ui.ratio !== 'All'
  return (
    <main className="gallery-layout">
      <aside className="intro">
        <div>
          <div className="intro-kicker">
            <span /> {t('YOUR CREATIVE LIBRARY')}{' '}
          </div>
          <h1>
            {favorites ? (
              <>
                {t('Your favorites.')} <br />
                {t('Always close.')}{' '}
              </>
            ) : (
              <>
                {t('Discover.')} <br />
                {t('Inspire.')} <br />
                {t('Make it')} <br />
                <span>{t('your own.')}</span>
              </>
            )}
          </h1>
          <p>
            {favorites
              ? t('The ideas you love, all in one place. Ready whenever inspiration strikes.')
              : t(
                  'A home for your favorite AI images and the prompts behind them. Collect, organize, and create something great.',
                )}
          </p>
          <Button asChild className="intro-upload">
            <Link to="/upload">
              <Plus size={17} />
              {t('Upload prompt')}{' '}
            </Link>
          </Button>
          <div className="intro-rule" />
          <div className="library-note">
            <div className="library-note-icon">
              <FolderHeart size={18} />
            </div>
            <div>
              <strong>{t('A little less searching.')}</strong>
              <span>{t('A lot more creating.')}</span>
            </div>
          </div>
        </div>
        <div className="intro-bottom">
          <Sparkles size={20} />
          <blockquote>
            {t('“Good prompts')} <br /> {t('make a better')} <br />
            <em>{t('imagination.')}</em>”
          </blockquote>
          <div className="intro-bottom-line" />
          <p>{t('CURATED BY YOU. CREATED FOR YOU.')}</p>
          <span className="local-status">
            <span />
            {t('Your personal cloud library')}
          </span>
        </div>
      </aside>
      <section
        className="gallery-main"
        aria-label={favorites ? t('Favorite prompts') : t('Prompt gallery')}
      >
        <div className="gallery-heading">
          <div>
            <p className="eyebrow">
              {favorites ? t('THE ONES YOU LOVE') : t('LESS SCROLLING. MORE CREATING.')}
            </p>
            <h2>
              {favorites ? t('My favorites') : t('A world of inspiration')}
              <span className="heading-sparkle">✳</span>
            </h2>
          </div>
          <span className="gallery-subtitle">
            {t('Your next idea starts here')} <ArrowUpRight size={14} />
          </span>
        </div>
        <Filters count={filtered.length} />
        {isLoading ? (
          <GallerySkeleton />
        ) : !user ? (
          <CloudAccess />
        ) : error ? (
          <div className="empty-state">
            <h2>{t('We couldn’t load your vault.')}</h2>
            <p>{t(error.message)}</p>
            <Button onClick={() => refetch()}>{t('Try again')}</Button>
          </div>
        ) : filtered.length ? (
          <PromptGrid
            items={filtered}
            onOpen={(p) => setSelected(p.id)}
            onFavorite={(p) => favorite.mutate(p)}
            favoritePending={favorite.isPending}
          />
        ) : (
          <EmptyState filtered={hasFilters} favorites={favorites} />
        )}{' '}
        {filtered.length > 0 && (
          <div className="gallery-end">
            <span />
            <p>{t('A little inspiration goes a long way.')}</p>
            <Sparkles size={14} />
            <span />
          </div>
        )}
      </section>
      {current && (
        <PromptDetail
          item={current}
          items={filtered.some((p) => p.id === current.id) ? filtered : [current]}
          onClose={() => setSelected(null)}
          onNavigate={setSelected}
        />
      )}
    </main>
  )
}
