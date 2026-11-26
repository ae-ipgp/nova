import type { BrandResult } from '@shared/api-contract'
import { isHexColour, primaryIsReadable } from '@shared/colour'
import { badRequest } from '../errors'
import type { HandlerContext } from '../context'
import { getSetting } from '../settings'
import { asPayload } from '../validate'
import { requireActor } from './common'
import type { Handler } from './types'
import { readFile } from './uploads'

/** Logos and favicons stay small: they are sent to every visitor's browser. */
const MAX_BRAND_BYTES = 400_000

function setSetting(ctx: HandlerContext, key: string, value: string, by: string) {
  const row = { key, value_json: JSON.stringify(value), updated_by: by, updated_at: ctx.now.toISOString() }
  const existing = ctx.store.find('system_settings', (r) => r.key === key)
  if (existing) ctx.store.update('system_settings', existing.id || key, row)
  else ctx.store.insert('system_settings', { id: key, ...row })
}

function readBrand(ctx: HandlerContext): BrandResult {
  const load = (key: string) => {
    const id = getSetting(ctx.store, key)
    const f = id ? ctx.services.files.read(id) : null
    return f ? { name: f.name, mimeType: f.mimeType, base64: f.base64 } : null
  }
  return { version: getSetting(ctx.store, 'brand_version'), logo: load('brand_logo_id'), favicon: load('brand_favicon_id') }
}

export const brandHandlers: { 'public.brand': Handler<'public.brand'>; 'admin.brand.set': Handler<'admin.brand.set'> } = {
  'public.brand': { access: { kind: 'public' }, write: false, run: (_p, ctx) => readBrand(ctx) },

  'admin.brand.set': {
    access: { kind: 'roles', roles: ['suak'] },
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const by = actor.profile.id
      const changes: string[] = []

      for (const [field, key, remove] of [
        ['logo', 'brand_logo_id', p.removeLogo === true],
        ['favicon', 'brand_favicon_id', p.removeFavicon === true],
      ] as const) {
        const file = readFile(p, field, { images: true, maxBytes: MAX_BRAND_BYTES })
        if (!file && !remove) continue
        const old = getSetting(ctx.store, key)
        const id = file ? ctx.services.files.save('awam', `${field}-${file.name}`, file.mimeType, file.base64) : ''
        setSetting(ctx, key, id, by)
        if (old) ctx.services.files.trash(old)
        changes.push(file ? `${field} diganti` : `${field} dibuang`)
      }

      for (const [field, key] of [['primary', 'brand_primary'], ['accent', 'brand_accent']] as const) {
        if (!(field in p)) continue
        const v = typeof p[field] === 'string' ? (p[field] as string).trim() : ''
        if (v && !isHexColour(v)) throw badRequest('Warna mesti dalam format #RRGGBB.')
        if (field === 'primary' && v && !primaryIsReadable(v)) throw badRequest('Warna utama terlalu cerah: teks putih pada butang tidak cukup jelas. Pilih warna yang lebih gelap.')
        if (getSetting(ctx.store, key) !== v.toLowerCase()) {
          setSetting(ctx, key, v.toLowerCase(), by)
          changes.push(`${field} ${v || 'lalai'}`)
        }
      }

      if (changes.length) {
        setSetting(ctx, 'brand_version', String((Number(getSetting(ctx.store, 'brand_version')) || 0) + 1), by)
        ctx.audit('brand.set', 'settings', 'brand', null, { changes })
      }
      return readBrand(ctx)
    },
  },
}
