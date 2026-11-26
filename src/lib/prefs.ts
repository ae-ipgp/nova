import { useSyncExternalStore } from 'react'

/** User preferences kept on the device: theme, language, sound. (HiPER: Mutiara / Lazuardi / Zamrud / Automatik.) */
export type ThemePref = 'auto' | 'mutiara' | 'lazuardi' | 'zamrud'
export type ThemeName = Exclude<ThemePref, 'auto'>
export type Lang = 'ms' | 'en'

export const THEME_PREFS: readonly ThemePref[] = ['auto', 'mutiara', 'lazuardi', 'zamrud']
export const THEME_LABEL: Record<ThemePref, string> = { auto: 'Automatik', mutiara: 'Mutiara', lazuardi: 'Lazuardi', zamrud: 'Zamrud' }
export const THEME_HINT: Record<ThemePref, string> = {
  auto: 'Ikut peranti anda',
  mutiara: 'Cerah, mutiara',
  lazuardi: 'Gelap, lazuardi',
  zamrud: 'Cerah, zamrud',
}

const KEYS = { theme: 'nova.theme', lang: 'nova.lang', sound: 'nova.sound' } as const

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable: preference lasts for this tab only */
  }
}

const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l))

export const isThemePref = (v: unknown): v is ThemePref => THEME_PREFS.includes(v as ThemePref)
export const isLang = (v: unknown): v is Lang => v === 'ms' || v === 'en'

export function readTheme(): ThemePref {
  const v = read(KEYS.theme)
  return isThemePref(v) ? v : 'auto'
}

let langCache: Lang | null = null

export function readLang(): Lang {
  const v = read(KEYS.lang)
  if (isLang(v)) return v
  // First visit: follow the browser, defaulting to Malay (the institution's working language).
  return typeof navigator !== 'undefined' && /^en\b/i.test(navigator.language) ? 'en' : 'ms'
}

/** Current language without touching storage (called for every translated string). */
export const getLang = (): Lang => (langCache ??= readLang())
/** Tests only: forget the cached language so the next read comes from storage. */
export const resetLangCache = (): void => {
  langCache = null
}

export const readSound = (): boolean => read(KEYS.sound) === '1'

export function resolveTheme(pref: ThemePref, prefersDark: boolean): ThemeName {
  return pref === 'auto' ? (prefersDark ? 'lazuardi' : 'mutiara') : pref
}

const prefersDark = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches

export function applyTheme(pref: ThemePref): void {
  const name = resolveTheme(pref, prefersDark())
  const root = document.documentElement
  root.dataset.theme = name
  root.style.colorScheme = name === 'lazuardi' ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', name === 'lazuardi' ? '#0a1424' : name === 'zamrud' ? '#0c3a31' : '#102d4f')
}

export function setThemePref(pref: ThemePref): void {
  write(KEYS.theme, pref)
  applyTheme(pref)
  emit()
}

export function setLangPref(lang: Lang): void {
  langCache = lang
  write(KEYS.lang, lang)
  document.documentElement.lang = lang
  emit()
}

export function setSoundPref(on: boolean): void {
  write(KEYS.sound, on ? '1' : '0')
  emit()
}

export const useThemePref = (): ThemePref => useSyncExternalStore(subscribe, readTheme, () => 'auto' as ThemePref)
export const useLangPref = (): Lang => useSyncExternalStore(subscribe, getLang, () => 'ms' as Lang)
export const useSoundPref = (): boolean => useSyncExternalStore(subscribe, readSound, () => false)

/** Called once at startup and whenever the device's colour scheme changes (matters for "Automatik"). */
export function initPrefs(): void {
  applyTheme(readTheme())
  document.documentElement.lang = getLang()
  if (typeof matchMedia === 'function') {
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => readTheme() === 'auto' && applyTheme('auto'))
  }
}
