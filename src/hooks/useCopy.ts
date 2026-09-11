import { t } from '../lib/i18n'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
export function useCopy() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(t('Prompt copied'))
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error(t('Copy failed. Select the prompt text and copy it manually.'))
    }
  }
  return { copied, copy }
}
