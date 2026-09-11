import { useI18n } from '../lib/i18n'
import { useState } from 'react'
import { X } from 'lucide-react'
export function TagInput({
  value,
  onChange,
}: {
  value: string[]
  onChange: (tags: string[]) => void
}) {
  const { t } = useI18n()

  const [input, setInput] = useState('')
  function add() {
    const tag = input.trim().replace(/^#/, '')
    if (tag && !value.includes(tag) && value.length < 12) onChange([...value, tag])
    setInput('')
  }
  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span key={tag}>
          {tag}
          <button
            type="button"
            aria-label={t('Remove tag {tag}', { tag })}
            onClick={() => onChange(value.filter((t) => t !== tag))}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        aria-label={t('Tags')}
        value={input}
        maxLength={40}
        placeholder={value.length ? t('Add another…') : t('Type a tag and press Enter…')}
        onChange={(e) => setInput(e.target.value)}
        onBlur={add}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          }
          if (e.key === 'Backspace' && !input) onChange(value.slice(0, -1))
        }}
      />
    </div>
  )
}
