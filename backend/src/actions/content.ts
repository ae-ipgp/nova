import type { ContentItem, ContentKind } from '@shared/api-contract'
import { badRequest } from '../errors'
import type { HandlerContext } from '../context'
import type { Row } from '../store'
import { asPayload, str } from '../validate'
import { requireActor } from './common'
import type { Handler } from './types'
import { readFile } from './uploads'

/**
 * Admin-edited page content. Every editable spot on a page has a stable key ("home.hero.title");
 * a row here overrides the built-in wording. SUAK only; the public reads texts, links and lists, and
 * fetches photos/files separately (by version) so the content list stays small.
 */
const KINDS: readonly ContentKind[] = ['text', 'image', 'file', 'list']
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,59}$/
const MAX_ROWS = 400
const MAX_TEXT = 4000
const MAX_JSON = 20_000
const MAX_LIST_ITEMS = 60
const MAX_FIELD = 1500
const MAX_CONTENT_IMAGE = 1_500_000

/** Links must be https, an internal path, mailto: or tel: — never javascript: or data:. */
export const isSafeLink = (u: string): boolean => /^(https:\/\/[^\s]+|\/(?!\/)[^\s]*|mailto:[^\s]+|tel:[+0-9()\s-]+)$/.test(u)

const toItem = (r: Row): ContentItem => ({ id: r.id, kind: (KINDS as readonly string[]).includes(r.kind) ? (r.kind as ContentKind) : 'text', ms: r.ms, en: r.en, url: r.url, json: r.json, version: r.version || '1', hidden: r.hidden === 'true' })

function cleanList(json: string): string {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    throw badRequest('Senarai tidak sah.')
  }
  if (!Array.isArray(data) || data.length > MAX_LIST_ITEMS) throw badRequest('Senarai tidak sah (maksimum 60 item).')
  const out = data.map((it) => {
    if (typeof it !== 'object' || it === null || Array.isArray(it)) throw badRequest('Senarai tidak sah.')
    const o: Record<string, string> = {}
    for (const [k, v] of Object.entries(it as Record<string, unknown>)) {
      if (!/^[a-zA-Z]{1,20}$/.test(k) || typeof v !== 'string') throw badRequest('Senarai tidak sah.')
      if (v.length > MAX_FIELD) throw badRequest('Teks dalam senarai terlalu panjang.')
      if (k === 'url' && v && !isSafeLink(v)) throw badRequest('Pautan mesti bermula dengan https://')
      o[k] = v
    }
    return o
  })
  const s = JSON.stringify(out)
  if (s.length > MAX_JSON) throw badRequest('Senarai terlalu panjang.')
  return s
}

function pageText(p: Record<string, unknown>, key: string): string {
  const v = p[key]
  if (v === undefined || v === null) return ''
  if (typeof v !== 'string') throw badRequest('Teks tidak sah.')
  if (v.length > MAX_TEXT) throw badRequest('Teks terlalu panjang (maksimum 4,000 aksara).')
  return v.trim()
}

export const contentHandlers: {
  'public.content': Handler<'public.content'>
  'public.content.file': Handler<'public.content.file'>
  'admin.content.set': Handler<'admin.content.set'>
  'admin.content.reset': Handler<'admin.content.reset'>
} = {
  'public.content': { access: { kind: 'public' }, write: false, run: (_p, { store }) => store.all('site_content').filter((r) => r.kind).map(toItem) },

  'public.content.file': {
    access: { kind: 'public' },
    write: false,
    run: (raw, ctx) => {
      const id = str(asPayload(raw), 'id', { max: 60, label: 'ID' })
      const row = ctx.store.find('site_content', (r) => r.id === id)
      const f = row?.file_id ? ctx.services.files.read(row.file_id) : null
      return f ? { name: f.name, mimeType: f.mimeType, base64: f.base64 } : null
    },
  },

  'admin.content.set': {
    access: { kind: 'roles', roles: ['suak'] },
    write: true,
    run: (raw, ctx: HandlerContext) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const id = str(p, 'id', { max: 60, label: 'ID kandungan' })
      if (!ID_RE.test(id)) throw badRequest('ID kandungan tidak sah.')
      const kind = p.kind as ContentKind
      if (!KINDS.includes(kind)) throw badRequest('Jenis kandungan tidak sah.')
      const existing = ctx.store.find('site_content', (r) => r.id === id)
      if (!existing && ctx.store.all('site_content').length >= MAX_ROWS) throw badRequest('Terlalu banyak kandungan disunting.')

      const url = typeof p.url === 'string' ? p.url.trim() : ''
      if (url && !isSafeLink(url)) throw badRequest('Pautan mesti bermula dengan https://, / (halaman dalaman), mailto: atau tel:')
      const json = kind === 'list' ? cleanList(typeof p.json === 'string' ? p.json : '[]') : ''

      let fileId = existing?.file_id ?? ''
      if (p.removeFile === true && fileId) {
        ctx.services.files.trash(fileId)
        fileId = ''
      }
      if (kind === 'image' || kind === 'file') {
        const file = readFile(p, 'file', { images: kind === 'image', maxBytes: kind === 'image' ? MAX_CONTENT_IMAGE : undefined })
        if (file) {
          const old = fileId
          fileId = ctx.services.files.save('awam', `${id}-${file.name}`, file.mimeType, file.base64)
          if (old) ctx.services.files.trash(old)
        }
      }

      const row = {
        id,
        kind,
        ms: pageText(p, 'ms'),
        en: pageText(p, 'en'),
        url,
        file_id: fileId,
        json,
        hidden: p.hidden === true ? 'true' : '',
        version: String((Number(existing?.version) || 0) + 1),
        updated_at: ctx.now.toISOString(),
        updated_by: actor.profile.id,
      }
      const saved = existing ? ctx.store.update('site_content', existing.id, row) : ctx.store.insert('site_content', row)
      ctx.audit('content.set', 'site_content', id, existing ? { ms: existing.ms, en: existing.en, url: existing.url } : null, { kind, ms: row.ms.slice(0, 120), en: row.en.slice(0, 120), url })
      return toItem(saved)
    },
  },

  'admin.content.reset': {
    access: { kind: 'roles', roles: ['suak'] },
    write: true,
    run: (raw, ctx) => {
      requireActor(ctx)
      const id = str(asPayload(raw), 'id', { max: 60, label: 'ID kandungan' })
      const existing = ctx.store.find('site_content', (r) => r.id === id)
      if (existing?.kind) {
        if (existing.file_id) ctx.services.files.trash(existing.file_id)
        ctx.store.update('site_content', existing.id, { kind: '', ms: '', en: '', url: '', file_id: '', json: '', hidden: '', version: String((Number(existing.version) || 0) + 1), updated_at: ctx.now.toISOString(), updated_by: ctx.actor?.profile.id ?? '' })
        ctx.audit('content.reset', 'site_content', id, { ms: existing.ms, en: existing.en }, null)
      }
      return { id }
    },
  },
}
