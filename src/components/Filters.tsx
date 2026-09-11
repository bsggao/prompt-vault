import { useI18n } from '../lib/i18n'
import { useState } from 'react'
import { Check, ChevronDown, Grid2X2, List, SlidersHorizontal, X } from 'lucide-react'
import { categories, models, ratios } from '../types/prompt'
import { useUI } from '../store/ui'
import { Button } from './ui/button'
import { Modal } from './ui/dialog'
export function CategoryFilter() {
  const { t } = useI18n()

  const { category, set } = useUI()
  return (
    <div className="category-filter" role="group" aria-label={t('Categories')}>
      {['All', ...categories].map((c) => (
        <button
          key={c}
          className={category === c ? 'category active' : 'category'}
          onClick={() => set({ category: c })}
          aria-pressed={category === c}
        >
          {t(c)}
        </button>
      ))}
    </div>
  )
}
function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const { t } = useI18n()
  return (
    <div className="select-filter">
      <select aria-label={t(label)} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="All">{t(label)}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {t(o)}
          </option>
        ))}
      </select>
      <ChevronDown size={13} />
    </div>
  )
}
export function ModelFilter() {
  const { model, set } = useUI()
  return (
    <SelectFilter
      label="All models"
      value={model}
      options={models}
      onChange={(model) => set({ model })}
    />
  )
}
export function AspectRatioFilter() {
  const { ratio, set } = useUI()
  return (
    <SelectFilter
      label="All ratios"
      value={ratio}
      options={ratios}
      onChange={(ratio) => set({ ratio })}
    />
  )
}
export function Filters({ count }: { count: number }) {
  const { t } = useI18n()

  const [open, setOpen] = useState(false)
  const state = useUI()
  const filtered =
    state.category !== 'All' || state.model !== 'All' || state.ratio !== 'All' || !!state.search
  return (
    <div className="filters">
      <CategoryFilter />
      <div className="filter-toolbar">
        <div className="desktop-filters">
          <ModelFilter />
          <AspectRatioFilter />
        </div>
        <Button
          className="mobile-filter-button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal size={14} />
          {t('Filters')}
          {filtered && <span className="filter-dot" />}
        </Button>
        <div className="select-filter sort-filter">
          <select
            aria-label={t('Sort prompts')}
            value={state.sort}
            onChange={(e) => state.set({ sort: e.target.value })}
          >
            {[
              { value: 'Newest', label: 'Newest' },
              { value: 'Oldest', label: 'Oldest' },
              { value: 'Favorites', label: 'Saved first' },
            ].map(({ value, label }) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
          <ChevronDown size={13} />
        </div>
        {filtered && (
          <button className="clear-filters" onClick={state.resetFilters}>
            <X size={13} />
            <span>{t('Reset')}</span>
          </button>
        )}
        <span className="prompt-count" aria-live="polite">
          {count} <span>{t('prompts')}</span>
        </span>
        <div className="view-switch">
          <button
            aria-label={t('Grid view')}
            aria-pressed={state.view === 'grid'}
            className={state.view === 'grid' ? 'active' : ''}
            onClick={() => state.set({ view: 'grid' })}
          >
            <Grid2X2 size={16} />
          </button>
          <button
            aria-label={t('List view')}
            aria-pressed={state.view === 'list'}
            className={state.view === 'list' ? 'active' : ''}
            onClick={() => state.set({ view: 'list' })}
          >
            <List size={17} />
          </button>
        </div>
      </div>
      <Modal open={open} onOpenChange={setOpen} title={t('Filters')} className="filter-drawer">
        <div className="drawer-heading">
          <h2>{t('Filters')}</h2>
        </div>
        {(
          [
            { title: 'Category', key: 'category', values: categories },
            { title: 'Model', key: 'model', values: models },
            { title: 'Aspect ratio', key: 'ratio', values: ratios },
          ] as const
        ).map((group) => (
          <fieldset key={group.key}>
            <legend>{t(group.title)}</legend>
            {['All', ...group.values].map((value) => (
              <label className="filter-radio" key={value}>
                <input
                  type="radio"
                  name={group.key}
                  checked={state[group.key] === value}
                  onChange={() => state.set({ [group.key]: value })}
                />
                <span>{t(value)}</span>
                {state[group.key] === value && <Check size={16} />}
              </label>
            ))}
          </fieldset>
        ))}
        <div className="drawer-footer">
          <Button variant="outline" onClick={state.resetFilters}>
            {t('Reset')}{' '}
          </Button>
          <Button onClick={() => setOpen(false)}>{t('Show {count} prompts', { count })}</Button>
        </div>
      </Modal>
    </div>
  )
}
