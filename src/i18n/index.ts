import { getLang } from '@/lib/prefs'

/**
 * Gettext-style translation. Malay is the source language: `t('Simpan')` returns the text itself in Malay
 * and the English dictionary entry in English. Missing English entries fall back to Malay, so a screen is never blank.
 * Documents, letters and e-mail wording are deliberately NOT translated here (they are institutional text).
 */
const modules = import.meta.glob<{ default: Record<string, string> }>('./en/*.ts', { eager: true })
export const EN: Record<string, string> = Object.assign({}, ...Object.values(modules).map((m) => m.default))

export type Vars = Record<string, string | number>

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : s)
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

export function t(ms: string, vars?: Vars): string {
  if (getLang() !== 'en') return fill(ms, vars)
  return fill(EN[ms] ?? EN[squash(ms)] ?? ms, vars)
}

/** True when a message has an English entry (used by the coverage tests). */
export const hasEnglish = (ms: string): boolean => ms in EN || squash(ms) in EN

const patterns: { re: RegExp; names: string[]; en: string }[] = []
let patternsFor = 0

function buildPatterns() {
  if (patternsFor === Object.keys(EN).length) return
  patterns.length = 0
  for (const [ms, en] of Object.entries(EN)) {
    if (!/\{\w+\}/.test(ms)) continue
    const names: string[] = []
    const src = ms.split(/(\{\w+\})/).map((part) => {
      const m = /^\{(\w+)\}$/.exec(part)
      if (!m) return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      names.push(m[1]!)
      return '(.+?)'
    })
    patterns.push({ re: new RegExp(`^${src.join('')}$`), names, en })
  }
  patternsFor = Object.keys(EN).length
}

/** Gateway messages arrive already formatted in Malay: exact match first, then templates such as "Tahun {year} tidak sah". */
export function translateServer(message: string): string {
  if (getLang() !== 'en') return message
  const hit = EN[message]
  if (hit) return hit
  buildPatterns()
  for (const p of patterns) {
    const m = p.re.exec(message)
    if (m) return fill(p.en, Object.fromEntries(p.names.map((n, i) => [n, m[i + 1]!])))
  }
  return message
}

/** The English dictionary entry for a Malay message ('' when there is none): used to pre-fill the content editor. */
export const englishOf = (ms: string): string => EN[ms] ?? EN[squash(ms)] ?? ''
