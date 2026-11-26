import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyTheme, resolveTheme } from '@/lib/prefs'

/** Parses `--color-x: value;` declarations from a CSS block. */
function vars(block: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const m of block.matchAll(/--color-([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim()
  return out
}
const tokens = readFileSync('src/styles/tokens.css', 'utf8')
const themesCss = readFileSync('src/styles/themes.css', 'utf8')
const base = vars(tokens.slice(tokens.indexOf('@theme'), tokens.indexOf('/* Typography */')))
const block = (name: string) => vars(themesCss.slice(themesCss.indexOf(`[data-theme='${name}']`)).split('}')[0])
const THEMES: Record<string, Record<string, string>> = { mutiara: base, lazuardi: { ...base, ...block('lazuardi') }, zamrud: { ...base, ...block('zamrud') } }

type RGBA = [number, number, number, number]
function parse(c: string): RGBA {
  const rgb = /rgb\((\d+) (\d+) (\d+)(?: \/ ([\d.]+))?\)/.exec(c)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3], rgb[4] === undefined ? 1 : +rgb[4]]
  const h = c.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]
}
const over = (fg: RGBA, bg: RGBA): RGBA => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as RGBA
const lum = ([r, g, b]: RGBA) => {
  const f = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
function contrast(fg: string, bg: string, under: string): number {
  const surface = over(parse(bg), parse(under))
  const [a, b] = [lum(over(parse(fg), surface)), lum(surface)].sort((x, y) => y - x)
  return (a + 0.05) / (b + 0.05)
}

describe('theme contrast (WCAG AA, every theme)', () => {
  for (const [name, t] of Object.entries(THEMES)) {
    describe(name, () => {
      const pairs: [string, string, string][] = [
        ['ink', 'paper', 'paper'], ['ink', 'ice', 'ice'], ['slate', 'paper', 'paper'], ['slate', 'ice', 'ice'],
        ['heading', 'paper', 'paper'], ['heading', 'ice', 'ice'], ['link', 'paper', 'paper'], ['link', 'ice', 'ice'],
        ['white', 'blue', 'paper'], ['white', 'danger', 'paper'], ['ink', 'soft', 'paper'], ['link', 'soft', 'paper'],
        ['amber', 'amber-100', 'paper'], ['green', 'green-100', 'paper'], ['red', 'red-100', 'paper'], ['teal', 'teal-100', 'paper'], ['link', 'blue-100', 'paper'],
        ['white', 'navy', 'paper'], ['sky', 'navy', 'paper'],
      ]
      it.each(pairs)('%s on %s ≥ 4.5', (fg, bg, under) => {
        expect(contrast(t[fg], t[bg], t[under]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
      })
    })
  }

  it('overrides only existing tokens, so no theme can introduce an unknown colour', () => {
    for (const name of ['lazuardi', 'zamrud']) for (const key of Object.keys(block(name))) expect(Object.keys(base), `${name}: --color-${key}`).toContain(key)
  })
})

describe('theme resolution', () => {
  it('maps Automatik to the device and keeps explicit choices', () => {
    expect(resolveTheme('auto', true)).toBe('lazuardi')
    expect(resolveTheme('auto', false)).toBe('mutiara')
    expect(resolveTheme('zamrud', true)).toBe('zamrud')
  })
  it('applies the theme to the document with the right colour-scheme', () => {
    applyTheme('lazuardi')
    expect(document.documentElement.dataset.theme).toBe('lazuardi')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    applyTheme('mutiara')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
  it('respects reduced motion and ships the no-flash boot script', () => {
    expect(readFileSync('src/styles/index.css', 'utf8')).toContain('prefers-reduced-motion: reduce')
    expect(readFileSync('public/theme-boot.js', 'utf8')).toContain("'nova.theme'")
    expect(readFileSync('index.html', 'utf8')).toContain('/theme-boot.js')
  })
})
