import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import esErrors from './locales/es/errors.json'

/**
 * Languages the UI can be rendered in. To add one: create `locales/<lng>/errors.json`,
 * register it in `resources` below and append the code here.
 */
export const SUPPORTED_LANGUAGES = ['es'] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export const DEFAULT_LANGUAGE: SupportedLanguage = 'es'
export const LANGUAGE_STORAGE_KEY = 'pyramid_language'
export const DEFAULT_NAMESPACE = 'errors'

const resources = {
  es: { errors: esErrors },
} satisfies Record<SupportedLanguage, Record<string, object>>

function isSupportedLanguage(value: string | null): value is SupportedLanguage {
  return value !== null && (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
}

/** Single place the active language is read from; falls back to the default when unavailable. */
export function getStoredLanguage(): SupportedLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    return isSupportedLanguage(stored) ? stored : DEFAULT_LANGUAGE
  } catch {
    return DEFAULT_LANGUAGE
  }
}

/** Switches the active language and remembers the choice. */
export async function setLanguage(language: SupportedLanguage): Promise<void> {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Storage may be blocked; the language still changes for this session.
  }
  await i18n.changeLanguage(language)
}

void i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  ns: [DEFAULT_NAMESPACE],
  defaultNS: DEFAULT_NAMESPACE,
  interpolation: { escapeValue: false },
  initAsync: false,
})

export default i18n
