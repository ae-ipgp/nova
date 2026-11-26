import type { AuditEntry, DocumentTypeView, GroupView, SeriesView, SettingsResult } from '@shared/api-contract'
import { formatReference, validatePattern } from '@shared/reference-format'
import { extractPlaceholders, BUILT_IN_KEYS } from '@shared/template-render'
import { badRequest, conflict, notFound } from '../errors'
import { allSettings, isKnownSetting, SETTING_DEFS, settingDef } from '../settings'
import type { Row, TableStore } from '../store'
import { asPayload, str } from '../validate'
import { nameOf, requireActor } from './common'
import { mytYear, toDocType } from './reference'
import type { Handler } from './types'

const SUAK_ONLY = { kind: 'roles', roles: ['suak'] } as const
const SUAK_OR_ADMIN = { kind: 'roles', roles: ['suak', 'system_admin'] } as const

function settingsView(store: TableStore): SettingsResult {
  return {
    fields: SETTING_DEFS.map((d) => ({ key: d.key, label: d.label, kind: d.kind, options: d.options ? [...d.options] : undefined, help: d.help, max: d.max, public: d.public })),
    values: allSettings(store, false),
  }
}

function seriesView(store: TableStore, now: Date): SeriesView[] {
  return store
    .all('reference_series')
    .sort((a, b) => Number(b.year) - Number(a.year))
    .map((s) => {
      const year = Number(s.year)
      return {
        id: s.id,
        prefix: s.prefix,
        pattern: s.format_pattern,
        year,
        nextSequence: Number(s.next_sequence) || 1,
        padding: Number(s.padding) || 0,
        active: s.active === 'true',
        effectiveDate: s.effective_date,
        version: Number(s.version) || 1,
        preview: formatReference({ prefix: s.prefix, pattern: s.format_pattern, year: year || mytYear(now), sequence: Number(s.next_sequence) || 1, padding: Number(s.padding) || 0 }),
      }
    })
}

const docTypes = (store: TableStore): DocumentTypeView[] => store.all('document_types').map(toDocType).sort((a, b) => a.name.localeCompare(b.name, 'ms'))
const groups = (store: TableStore): GroupView[] =>
  store.all('notice_groups').map((g) => ({ id: g.id, name: g.name, profileIds: safeIds(g.profile_ids_json), active: g.active !== 'false' })).sort((a, b) => a.name.localeCompare(b.name, 'ms'))

export function safeIds(json: string): string[] {
  try {
    const v = JSON.parse(json) as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const adminConfigHandlers: {
  'admin.settings.get': Handler<'admin.settings.get'>
  'admin.settings.set': Handler<'admin.settings.set'>
  'admin.audit.list': Handler<'admin.audit.list'>
  'admin.series.list': Handler<'admin.series.list'>
  'admin.series.save': Handler<'admin.series.save'>
  'admin.doctypes.list': Handler<'admin.doctypes.list'>
  'admin.doctypes.save': Handler<'admin.doctypes.save'>
  'admin.groups.list': Handler<'admin.groups.list'>
  'admin.groups.save': Handler<'admin.groups.save'>
} = {
  'admin.settings.get': { access: SUAK_ONLY, write: false, run: (_p, { store }) => settingsView(store) },

  'admin.settings.set': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const values = asPayload(asPayload(raw).values)
      const changed: Record<string, { from: string; to: string }> = {}
      for (const [key, value] of Object.entries(values)) {
        if (!isKnownSetting(key)) throw badRequest(`Tetapan tidak dikenali: ${key}`)
        const def = settingDef(key)!
        if (def.managed) throw badRequest('Tetapan ini diuruskan secara berasingan.')
        if (typeof value !== 'string') throw badRequest(`${def.label} tidak sah.`)
        const v = value.trim()
        if (v.length > def.max) throw badRequest(`${def.label} terlalu panjang.`)
        if (def.kind === 'boolean' && v !== 'true' && v !== 'false') throw badRequest(`${def.label} tidak sah.`)
        if (def.kind === 'select' && !def.options?.includes(v)) throw badRequest(`${def.label} tidak sah.`)
        if (key.startsWith('social_') && v && !/^https:\/\/[^\s]+$/.test(v)) throw badRequest(`${def.label} mesti bermula dengan https://`)
        if (key === 'verify_url' && v && !/^https:\/\/[^\s]+$/.test(v)) throw badRequest(`${def.label} mesti bermula dengan https://`)
        if ((key === 'contact_email' || key === 'mail_reply_to') && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw badRequest(`${def.label} tidak sah.`)
        const existing = ctx.store.find('system_settings', (r) => r.key === key)
        const before = existing ? (JSON.parse(existing.value_json || '""') as string) : def.fallback
        if (before === v) continue
        const row = { key, value_json: JSON.stringify(v), updated_by: actor.profile.id, updated_at: ctx.now.toISOString() }
        if (existing) ctx.store.update('system_settings', existing.id || key, row)
        else ctx.store.insert('system_settings', { id: key, ...row })
        changed[key] = { from: before, to: key === 'privacy_text' || key === 'about_text' ? `(${v.length} aksara)` : v }
      }
      if (Object.keys(changed).length) ctx.audit('settings.set', 'settings', 'site', null, changed)
      return settingsView(ctx.store)
    },
  },

  'admin.audit.list': {
    access: SUAK_OR_ADMIN,
    write: false,
    run: (raw, { store }): AuditEntry[] => {
      const p = asPayload(raw)
      const action = typeof p.action === 'string' ? p.action.slice(0, 60) : ''
      const limit = Math.min(Math.max(Number(p.limit) || 200, 1), 500)
      return store
        .all('audit_logs')
        .filter((a) => !action || a.action.startsWith(action))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, limit)
        .map((a) => ({
          id: a.id,
          at: a.created_at,
          actor: nameOf(store, a.actor_id) || a.actor_id,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          before: a.before_json,
          after: a.after_json,
        }))
    },
  },

  'admin.series.list': { access: SUAK_ONLY, write: false, run: (_p, ctx) => seriesView(ctx.store, ctx.now) },

  'admin.series.save': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const prefix = str(p, 'prefix', { max: 60, required: false, label: 'Awalan' })
      const pattern = str(p, 'pattern', { max: 120, label: 'Format' })
      const patternError = validatePattern(pattern)
      if (patternError) throw badRequest(patternError)
      const year = Number(p.year)
      if (!Number.isInteger(year) || year < 2000 || year > 2100) throw badRequest('Tahun tidak sah.')
      const nextSequence = Number(p.nextSequence)
      if (!Number.isInteger(nextSequence) || nextSequence < 1 || nextSequence > 9_999_999) throw badRequest('Turutan seterusnya tidak sah.')
      const padding = Number(p.padding)
      if (!Number.isInteger(padding) || padding < 0 || padding > 8) throw badRequest('Padding tidak sah (0–8).')
      const active = p.active === true
      const now = ctx.now.toISOString()
      const id = typeof p.id === 'string' && p.id ? p.id : ''

      let before: Row | undefined
      if (id) {
        before = ctx.store.get('reference_series', id)
        if (!before) throw notFound('Siri tidak ditemui.')
      }
      // Only one active series per year, so issuance is never ambiguous.
      if (active) {
        for (const s of ctx.store.all('reference_series')) {
          if (s.id !== id && s.active === 'true' && Number(s.year) === year) ctx.store.update('reference_series', s.id, { active: 'false', updated_at: now })
        }
      }
      const formatChanged = !before || before.prefix !== prefix || before.format_pattern !== pattern || Number(before.padding) !== padding
      const row = {
        prefix,
        format_pattern: pattern,
        year: String(year),
        next_sequence: String(nextSequence),
        padding: String(padding),
        active: active ? 'true' : 'false',
        updated_at: now,
        version: String((before ? Number(before.version) || 1 : 0) + (formatChanged ? 1 : 0) || 1),
      }
      if (before) ctx.store.update('reference_series', id, row)
      else ctx.store.insert('reference_series', { id: ctx.uuid(), created_at: now, created_by: actor.profile.id, effective_date: now.slice(0, 10), ...row })
      // The format is institutional configuration: record who changed it and from what (§14).
      ctx.audit('series.save', 'reference_series', id || 'new', before ? { pattern: before.format_pattern, prefix: before.prefix, next: before.next_sequence } : null, { pattern, prefix, year, nextSequence, active })
      return seriesView(ctx.store, ctx.now)
    },
  },

  'admin.doctypes.list': { access: SUAK_ONLY, write: false, run: (_p, { store }) => docTypes(store) },

  'admin.doctypes.save': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const code = str(p, 'code', { max: 30, label: 'Kod' }).toUpperCase()
      if (!/^[A-Z0-9_-]+$/.test(code)) throw badRequest('Kod hanya huruf besar, nombor, - dan _.')
      const name = str(p, 'name', { max: 100, label: 'Nama' })
      const kind = p.kind === 'certificate' ? 'certificate' : 'letter'
      const description = str(p, 'description', { max: 300, required: false })
      const bodyTemplate = typeof p.bodyTemplate === 'string' ? p.bodyTemplate.trim() : ''
      if (!bodyTemplate) throw badRequest('Kandungan templat diperlukan.')
      if (bodyTemplate.length > 6000) throw badRequest('Templat terlalu panjang.')
      const rawFields = Array.isArray(p.fields) ? p.fields : []
      if (rawFields.length > 20) throw badRequest('Terlalu banyak medan (maksimum 20).')
      const fields = rawFields.map((f) => {
        const o = (f ?? {}) as Record<string, unknown>
        const key = typeof o.key === 'string' ? o.key : ''
        const label = typeof o.label === 'string' ? o.label.trim() : ''
        if (!/^[a-z][a-z0-9_]*$/.test(key) || (BUILT_IN_KEYS as readonly string[]).includes(key)) throw badRequest(`Kunci medan tidak sah: "${key}" (huruf kecil/nombor/_; bukan ${BUILT_IN_KEYS.join(', ')}).`)
        if (!label || label.length > 80) throw badRequest(`Label medan "${key}" tidak sah.`)
        return { key, label, required: o.required !== false, type: o.type === 'textarea' || o.type === 'date' ? o.type : 'text', max: typeof o.max === 'number' ? Math.min(Math.max(o.max, 1), 2000) : undefined }
      })
      const keys = new Set(fields.map((f) => f.key))
      if (keys.size !== fields.length) throw badRequest('Kunci medan mesti unik.')
      const unknown = extractPlaceholders(bodyTemplate).filter((k) => !keys.has(k) && !(BUILT_IN_KEYS as readonly string[]).includes(k) && k !== 'tujuan')
      if (unknown.length) throw badRequest(`Templat menggunakan medan yang tidak ditakrif: ${unknown.map((k) => `{{${k}}}`).join(', ')}`)

      const now = ctx.now.toISOString()
      const id = typeof p.id === 'string' && p.id ? p.id : ''
      const row = { code, name, kind, description, fields_json: JSON.stringify(fields), body_template: bodyTemplate, is_demo: 'false', active: p.active === false ? 'false' : 'true', updated_at: now }
      const dup = ctx.store.find('document_types', (t) => t.code.toUpperCase() === code && t.id !== id)
      if (dup) throw conflict('Kod telah digunakan.')
      if (id) {
        const before = ctx.store.get('document_types', id)
        if (!before) throw notFound('Jenis dokumen tidak ditemui.')
        ctx.store.update('document_types', id, row)
        ctx.audit('doctype.save', 'document_type', id, { name: before.name, demo: before.is_demo }, { name })
      } else {
        const created = ctx.store.insert('document_types', { id: ctx.uuid(), created_at: now, created_by: actor.profile.id, ...row })
        ctx.audit('doctype.create', 'document_type', created.id, null, { name })
      }
      return docTypes(ctx.store)
    },
  },

  'admin.groups.list': { access: { kind: 'roles', roles: ['suak', 'system_admin', 'secretariat'] }, write: false, run: (_p, { store }) => groups(store) },

  'admin.groups.save': {
    access: SUAK_ONLY,
    write: true,
    run: (raw, ctx) => {
      const actor = requireActor(ctx)
      const p = asPayload(raw)
      const name = str(p, 'name', { max: 80, label: 'Nama kumpulan' })
      const ids = Array.isArray(p.profileIds) ? [...new Set(p.profileIds.filter((x): x is string => typeof x === 'string'))] : []
      if (ids.length > 300) throw badRequest('Terlalu banyak ahli dalam kumpulan.')
      for (const id of ids) if (!ctx.store.get('profiles', id)) throw badRequest('Ahli kumpulan tidak sah.')
      const id = typeof p.id === 'string' && p.id ? p.id : ''
      if (ctx.store.find('notice_groups', (g) => g.name.toLowerCase() === name.toLowerCase() && g.id !== id)) throw conflict('Nama kumpulan telah wujud.')
      const now = ctx.now.toISOString()
      const row = { name, profile_ids_json: JSON.stringify(ids), active: p.active === false ? 'false' : 'true', updated_at: now }
      if (id) {
        if (!ctx.store.get('notice_groups', id)) throw notFound('Kumpulan tidak ditemui.')
        ctx.store.update('notice_groups', id, row)
      } else {
        ctx.store.insert('notice_groups', { id: ctx.uuid(), created_at: now, created_by: actor.profile.id, ...row })
      }
      ctx.audit('group.save', 'notice_group', id || 'new', null, { name, members: ids.length })
      return groups(ctx.store)
    },
  },
}
