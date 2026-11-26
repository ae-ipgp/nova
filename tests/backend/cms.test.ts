import { describe, expect, it } from 'vitest'
import { file, PNG_B64 } from './fakes'
import { Gateway, SUAK } from './harness'

describe('admin-edited content', () => {
  it('only SUAK can edit or reset content', () => {
    const gw = Gateway.withSuak()
    const sec = gw.member('sek', ['secretariat'])
    expect(gw.errorCode('admin.content.set', { id: 'home.hero.title', kind: 'text', ms: 'x' }, sec)).toBe('FORBIDDEN')
    expect(gw.errorCode('admin.content.reset', { id: 'home.hero.title' }, gw.member('sys', ['system_admin']))).toBe('FORBIDDEN')
    expect(gw.errorCode('admin.content.set', { id: 'home.hero.title', kind: 'text', ms: 'x' })).toBe('UNAUTHENTICATED')
  })

  it('saves a text override, shows it publicly, and versions every change', () => {
    const gw = Gateway.withSuak()
    expect(gw.ok('public.content', {})).toEqual([])
    const a = gw.ok('admin.content.set', { id: 'home.hero.title', kind: 'text', ms: 'Tajuk baharu', en: 'New title', url: '/log-masuk' }, SUAK.id)
    expect(a).toMatchObject({ id: 'home.hero.title', ms: 'Tajuk baharu', en: 'New title', url: '/log-masuk', version: '1', hidden: false })
    const b = gw.ok('admin.content.set', { id: 'home.hero.title', kind: 'text', ms: 'Lagi', hidden: true }, SUAK.id)
    expect(b.version).toBe('2')
    expect(b.hidden).toBe(true)
    expect(gw.ok('public.content', {})).toHaveLength(1)
    expect(gw.rows('audit_logs').some((r) => r.action === 'content.set')).toBe(true)
  })

  it('public rows never expose the Drive file id or who edited', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.content.set', { id: 'org.chart', kind: 'image', file: file('carta.png', 'image/png', PNG_B64) }, SUAK.id)
    const keys = Object.keys(gw.ok('public.content', {})[0]!).sort()
    expect(keys).toEqual(['en', 'hidden', 'id', 'json', 'kind', 'ms', 'url', 'version'])
    expect(gw.ok('public.content.file', { id: 'org.chart' })?.base64).toBe(PNG_B64)
  })

  it('replacing a photo trashes the old file; reset removes the override and its file', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.content.set', { id: 'org.chart', kind: 'image', file: file('a.png', 'image/png', PNG_B64) }, SUAK.id)
    const first = gw.rows('site_content')[0]!.file_id
    gw.ok('admin.content.set', { id: 'org.chart', kind: 'image', file: file('b.png', 'image/png', PNG_B64) }, SUAK.id)
    expect(gw.services.trashed.has(first)).toBe(true)
    const second = gw.rows('site_content')[0]!.file_id
    gw.ok('admin.content.reset', { id: 'org.chart' }, SUAK.id)
    expect(gw.services.trashed.has(second)).toBe(true)
    expect(gw.ok('public.content', {})).toEqual([])
    expect(gw.ok('public.content.file', { id: 'org.chart' })).toBeNull()
  })

  it('rejects unsafe links, bad ids, disguised files and malformed lists', () => {
    const gw = Gateway.withSuak()
    const set = (p: Record<string, unknown>) => gw.errorCode('admin.content.set', { id: 'a.b', kind: 'text', ...p }, SUAK.id)
    expect(set({ url: 'javascript:alert(1)' })).toBe('BAD_REQUEST')
    expect(set({ url: '//evil.example' })).toBe('BAD_REQUEST')
    expect(set({ url: 'data:text/html,x' })).toBe('BAD_REQUEST')
    expect(set({ id: 'Bad Id!' })).toBe('BAD_REQUEST')
    expect(set({ kind: 'nope' })).toBe('BAD_REQUEST')
    expect(set({ ms: 'x'.repeat(4001) })).toBe('BAD_REQUEST')
    expect(set({ kind: 'image', file: file('x.png', 'image/png', btoa('not a png at all')) })).toBe('BAD_REQUEST')
    expect(set({ kind: 'list', json: '{"a":1}' })).toBe('BAD_REQUEST')
    expect(set({ kind: 'list', json: JSON.stringify([{ title: 'x', url: 'javascript:1' }]) })).toBe('BAD_REQUEST')
    for (const ok of ['https://jpp.example/x', '/organisasi', 'mailto:a@b.my', 'tel:+60123456789']) expect(set({ url: ok })).not.toBe('BAD_REQUEST')
  })

  it('stores a list as cleaned JSON', () => {
    const gw = Gateway.withSuak()
    const r = gw.ok('admin.content.set', { id: 'org.legacy', kind: 'list', json: JSON.stringify([{ title: 'Legasi Ke-71', text: 'Ringkasan' }]) }, SUAK.id)
    expect(JSON.parse(r.json)).toEqual([{ title: 'Legasi Ke-71', text: 'Ringkasan' }])
  })
})

describe('visitor counter', () => {
  it('counts one per call, publicly, without storing anything about the visitor', () => {
    const gw = Gateway.withSuak()
    expect(gw.ok('site.config', {}).settings.visitor_count).toBe('0')
    expect(gw.ok('public.visit', {}).total).toBe(1)
    expect(gw.ok('public.visit', {}).total).toBe(2)
    expect(gw.ok('site.config', {}).settings.visitor_count).toBe('2')
  })

  it('cannot be set through the settings form', () => {
    const gw = Gateway.withSuak()
    expect(gw.errorCode('admin.settings.set', { values: { visitor_count: '99999' } }, SUAK.id)).toBe('BAD_REQUEST')
  })
})
