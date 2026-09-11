import { useI18n } from '../lib/i18n'
export function GallerySkeleton() {
  const { t } = useI18n()

  return (
    <div className="prompt-grid" role="status" aria-label={t('Loading prompts')}>
      {Array.from({ length: 8 }, (_, i) => (
        <div className="skeleton-card" key={i}>
          <div className="skeleton skeleton-image" style={{ height: 230 + (i % 3) * 45 }} />
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      ))}
    </div>
  )
}
