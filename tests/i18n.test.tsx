import { execFileSync, spawnSync } from 'node:child_process'
import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EN, t, translateServer } from '@/i18n'
import { setLangPref } from '@/lib/prefs'
import { renderRoute } from './render-route'

const run = (...args: string[]) => execFileSync('node', ['scripts/i18n.mjs', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('translation runtime', () => {
  it('returns the Malay source by default and English once selected', () => {
    expect(t('Simpan')).toBe('Simpan')
    setLangPref('en')
    expect(t('Simpan')).toBe('Save')
    setLangPref('ms')
  })

  it('fills {placeholders} in both languages', () => {
    expect(t('{n} ahli', { n: 3 })).toBe('3 ahli')
    setLangPref('en')
    expect(t('{n} ahli', { n: 3 })).toBe('3 members')
    expect(t('Satu ayat yang tiada terjemahan {x}', { x: 'ini' })).toBe('Satu ayat yang tiada terjemahan ini')
    setLangPref('ms')
  })

  it('translates gateway messages, including ones with values inside', () => {
    expect(translateServer('Sesi tidak ditemui.')).toBe('Sesi tidak ditemui.')
    setLangPref('en')
    expect(translateServer('Sesi tidak ditemui.')).toBe('The session was not found.')
    expect(translateServer('Tetapan tidak dikenali: foo_bar')).toBe('Unknown setting: foo_bar')
    expect(translateServer('Mesej baharu yang tiada dalam kamus.')).toBe('Mesej baharu yang tiada dalam kamus.')
    setLangPref('ms')
  })
})

describe('dictionary', () => {
  it('has an English entry for every message in the source and the gateway', () => {
    const missing = JSON.parse(run('missing')) as string[]
    expect(missing, `Add these to src/i18n/en/*.ts:\n${missing.join('\n')}`).toEqual([])
  })

  it('leaves no bare Malay text in components (everything visible goes through t())', () => {
    // `wrap` is a dry run: it must have nothing left to wrap and no sentence split around a value.
    const r = spawnSync('node', ['scripts/i18n.mjs', 'wrap'], { encoding: 'utf8' })
    expect(r.stderr).toContain('0 file(s) would change')
    expect(r.stderr).not.toMatch(/\[mixed\]/)
  })

  it('keeps the same {placeholders} in every translation', () => {
    for (const [ms, en] of Object.entries(EN)) expect(placeholders(en), ms).toEqual(placeholders(ms))
  })

  it('never translates to an empty string', () => {
    for (const [ms, en] of Object.entries(EN)) expect(en.trim(), ms).not.toBe('')
  })
})

describe('screens in English', () => {
  it('renders a public page in English when that language is chosen', () => {
    setLangPref('en')
    renderRoute('/kehadiran')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Meeting attendance records')
    setLangPref('ms')
  })

  it('keeps product names untranslated', () => {
    setLangPref('en')
    renderRoute('/')
    expect(screen.getAllByText('e-Mesyuarat').length).toBeGreaterThan(0)
    expect(screen.getAllByText('NoMe').length).toBeGreaterThan(0)
    setLangPref('ms')
  })
})
