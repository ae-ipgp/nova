import { describe, expect, it } from 'vitest'
import { file, PNG_B64 } from './fakes'
import { Gateway, SUAK } from './harness'

const png = (name = 'logo.png') => file(name, 'image/png', PNG_B64)

describe('brand: logo, favicon and colours', () => {
  it('only SUAK can change the brand', () => {
    const gw = Gateway.withSuak()
    const sec = gw.member('sek', ['secretariat'])
    expect(gw.errorCode('admin.brand.set', { logo: png() }, sec)).toBe('FORBIDDEN')
    expect(gw.errorCode('admin.brand.set', { primary: '#123456' }, gw.member('sys', ['system_admin']))).toBe('FORBIDDEN')
  })

  it('stores the logo and favicon in Drive, bumps the version and serves them publicly', () => {
    const gw = Gateway.withSuak()
    expect(gw.ok('public.brand', {})).toEqual({ version: '0', logo: null, favicon: null })
    const r = gw.ok('admin.brand.set', { logo: png('a.png'), favicon: png('f.png') }, SUAK.id)
    expect(r.version).toBe('1')
    expect(r.logo?.mimeType).toBe('image/png')
    expect(gw.ok('public.brand', {}).favicon?.base64).toBe(PNG_B64)
    expect(gw.ok('site.config', {}).settings.brand_version).toBe('1')
    expect(gw.rows('audit_logs').some((a) => a.action === 'brand.set')).toBe(true)
  })

  it('replacing or removing an image trashes the old Drive file', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.brand.set', { logo: png() }, SUAK.id)
    const first = gw.rows('system_settings').find((s) => s.key === 'brand_logo_id')!.value_json.split('"').join('')
    gw.ok('admin.brand.set', { logo: png('b.png') }, SUAK.id)
    expect(gw.services.trashed.has(first)).toBe(true)
    const r = gw.ok('admin.brand.set', { removeLogo: true }, SUAK.id)
    expect(r.logo).toBeNull()
    expect(r.version).toBe('3')
  })

  it('does not bump the version when nothing changed', () => {
    const gw = Gateway.withSuak()
    gw.ok('admin.brand.set', { primary: '#14507f' }, SUAK.id)
    expect(gw.ok('admin.brand.set', { primary: '#14507F' }, SUAK.id).version).toBe('1')
  })

  it('rejects non-images, disguised files, SVG and oversized images', () => {
    const gw = Gateway.withSuak()
    expect(gw.errorCode('admin.brand.set', { logo: file('x.svg', 'image/svg+xml', btoa('<svg onload=alert(1)/>')) }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.errorCode('admin.brand.set', { logo: file('x.png', 'image/png', btoa('not a png at all')) }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.errorCode('admin.brand.set', { logo: file('big.png', 'image/png', btoa('\x89PNG\r\n\x1a\n' + 'x'.repeat(450_000))) }, SUAK.id)).toBe('BAD_REQUEST')
  })

  it('validates colours and refuses a primary colour that makes white button text unreadable', () => {
    const gw = Gateway.withSuak()
    expect(gw.errorCode('admin.brand.set', { primary: 'blue' }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.errorCode('admin.brand.set', { primary: '#ffee00' }, SUAK.id)).toBe('BAD_REQUEST')
    expect(gw.ok('admin.brand.set', { primary: '#14507f', accent: '#e0c060' }, SUAK.id).version).toBe('1')
    const s = gw.ok('site.config', {}).settings
    expect(s).toMatchObject({ brand_primary: '#14507f', brand_accent: '#e0c060' })
    expect(s).not.toHaveProperty('brand_logo_id')
    expect(gw.ok('admin.brand.set', { primary: '' }, SUAK.id).version).toBe('2') // reset to default
  })

  it('brand keys cannot be written through the generic settings form', () => {
    const gw = Gateway.withSuak()
    expect(gw.errorCode('admin.settings.set', { values: { brand_logo_id: 'file-x' } }, SUAK.id)).toBe('BAD_REQUEST')
  })
})
