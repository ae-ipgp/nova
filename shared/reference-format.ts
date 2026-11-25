/**
 * Reference-number formatting (Blueprint §08A). The pattern is SUAK's configuration
 * (reference_series sheet) and is never hard-coded. Tokens: {PREFIX} {YEAR} {SEQ}.
 */
export interface SeriesFormat {
  prefix: string
  pattern: string
  year: number
  sequence: number
  padding: number
}

export const PATTERN_TOKENS = ['{PREFIX}', '{YEAR}', '{SEQ}'] as const

/** A usable pattern must contain {SEQ} (otherwise numbers would collide) and only known tokens. */
export function validatePattern(pattern: string): string | null {
  if (!pattern.trim()) return 'Format nombor diperlukan.'
  if (pattern.length > 120) return 'Format terlalu panjang.'
  if (!pattern.includes('{SEQ}')) return 'Format mesti mengandungi {SEQ}.'
  const unknown = (pattern.match(/\{[^}]*\}/g) ?? []).filter((t) => !(PATTERN_TOKENS as readonly string[]).includes(t))
  if (unknown.length) return `Token tidak dikenali: ${unknown.join(', ')}.`
  return null
}

export function formatReference(f: SeriesFormat): string {
  const seq = String(f.sequence).padStart(Math.max(0, f.padding), '0')
  return f.pattern.split('{PREFIX}').join(f.prefix).split('{YEAR}').join(String(f.year)).split('{SEQ}').join(seq)
}
