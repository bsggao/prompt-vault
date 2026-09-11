import { useUI } from '../store/ui'
import { zh } from './messages'

export type Language = 'en' | 'zh'
type Variables = Record<string, string | number>
export function translate(language: Language, key: string, variables: Variables = {}) {
  const message = language === 'zh' ? (zh[key] ?? key) : key
  return message.replace(/\{(\w+)\}/g, (match, name: string) => String(variables[name] ?? match))
}

// Read current preferences at call time, including after an asynchronous upload finishes.
export function t(key: string, variables?: Variables) {
  return translate(useUI.getState().language, key, variables)
}

export function useI18n() {
  const language = useUI((state) => state.language)
  return { language, locale: language === 'zh' ? 'zh-CN' : 'en-US', t }
}
