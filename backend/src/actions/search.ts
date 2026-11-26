import type { SearchGroup, SearchItem } from '@shared/api-contract'
import { hasArea } from '../context'
import { badRequest } from '../errors'
import type { Row } from '../store'
import { asPayload, str } from '../validate'
import { isLive } from './announcements'
import { isStaff, requireActor } from './common'
import { canRead } from './documents-store'
import { visibleTo } from './meetings'
import type { Handler } from './types'

const PER_GROUP = 5

function parseQuery(raw: unknown): string[] {
  const q = str(asPayload(raw), 'q', { max: 80, required: false, label: 'Carian' }).toLowerCase()
  const terms = q.split(' ').filter(Boolean)
  if (q.length < 2) throw badRequest('Taip sekurang-kurangnya 2 aksara.')
  return terms.slice(0, 6)
}

/** Every term must appear somewhere in the searched text (AND search). */
const matches = (terms: string[], ...fields: string[]): boolean => {
  const hay = fields.join(' ').toLowerCase()
  return terms.every((t) => hay.includes(t))
}

/** Title matches rank above matches elsewhere; then newest-first order of insertion is kept. */
function rank<T extends { title: string }>(terms: string[], items: T[]): T[] {
  const score = (i: T) => (terms.every((t) => i.title.toLowerCase().includes(t)) ? 0 : 1)
  return [...items].sort((a, b) => score(a) - score(b)).slice(0, PER_GROUP)
}

function group(kind: string, terms: string[], items: SearchItem[]): SearchGroup[] {
  return items.length ? [{ kind, items: rank(terms, items) }] : []
}

const SHORT = (s: string, n = 90) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

export const searchHandlers: { 'search.global': Handler<'search.global'>; 'public.search': Handler<'public.search'> } = {
  'search.global': {
    access: { kind: 'roles', roles: ['member', 'secretariat', 'suak'] },
    write: false,
    run: (raw, ctx): SearchGroup[] => {
      const terms = parseQuery(raw)
      const actor = requireActor(ctx)
      const store = ctx.store
      const staff = isStaff(actor)
      const out: SearchGroup[] = []

      // Reference requests and issued numbers
      const reqs = store.all('reference_requests').filter((r) => staff || r.applicant_id === actor.profile.id)
      const regByReq = new Map(store.all('reference_register').map((g) => [g.request_id, g.reference_number]))
      out.push(
        ...group(
          'e-surat',
          terms,
          reqs
            .filter((r) => matches(terms, r.subject, r.recipient, r.letter_type, regByReq.get(r.id) ?? '', `PRM-${r.id.slice(-6)}`))
            .map((r) => ({ id: r.id, title: r.subject, subtitle: [regByReq.get(r.id), r.status].filter(Boolean).join(' · '), href: `/workspace/e-surat?open=${r.id}` })),
        ),
      )

      out.push(
        ...group(
          'e-mesyuarat',
          terms,
          store
            .all('meetings')
            .filter((m) => visibleTo(ctx, m) && matches(terms, m.title, m.location, m.meeting_type))
            .map((m) => ({ id: m.id, title: m.title, subtitle: `${m.meeting_type} · ${m.starts_at.slice(0, 10)}`, href: `/workspace/e-mesyuarat/${m.id}` })),
        ),
      )

      if (hasArea(actor, 'nome.prepare') || hasArea(actor, 'nome.send')) {
        out.push(
          ...group(
            'nome',
            terms,
            store
              .all('notices')
              .filter((n) => matches(terms, n.subject, n.body))
              .map((n) => ({ id: n.id, title: n.subject, subtitle: n.status, href: `/workspace/nome/${n.id}` })),
          ),
        )
      }

      out.push(
        ...group(
          'templat',
          terms,
          store
            .all('templates')
            .filter((t) => (t.status !== 'archived' || hasArea(actor, 'templates.manage')) && matches(terms, t.title, t.description, t.category))
            .map((t) => ({ id: t.id, title: t.title, subtitle: t.category, href: `/workspace/templat?q=${encodeURIComponent(t.title)}` })),
        ),
      )

      out.push(
        ...group(
          'opr',
          terms,
          store
            .all('opr_reports')
            .filter((o) => (staff || o.created_by === actor.profile.id) && matches(terms, o.title))
            .map((o) => ({ id: o.id, title: o.title, subtitle: `${o.program_date} · ${o.status}`, href: `/workspace/e-opr/${o.id}` })),
        ),
      )

      out.push(
        ...group(
          'e-arkib',
          terms,
          store
            .all('archive_documents')
            .filter((d: Row) => canRead(ctx, d) && (d.status || 'active') === 'active' && matches(terms, d.title, d.reference_number, d.category, d.description))
            .map((d) => ({ id: d.id, title: d.title, subtitle: [d.reference_number, d.category].filter(Boolean).join(' · '), href: `/workspace/e-arkib?q=${encodeURIComponent(d.title)}` })),
        ),
      )

      out.push(
        ...group(
          'papan-notis',
          terms,
          store
            .all('announcements')
            .filter((a) => isLive(a, ctx.now) && (a.visibility === 'internal' || a.visibility === 'public') && matches(terms, a.title, a.body))
            .map((a) => ({ id: a.id, title: a.title, subtitle: SHORT(a.body, 70), href: '/workspace/papan-notis' })),
        ),
      )

      // Finding people is a SUAK tool (user management); nobody else can search the member list.
      if (actor.roles.includes('suak')) {
        out.push(
          ...group(
            'pengguna',
            terms,
            store
              .all('profiles')
              .filter((p) => matches(terms, p.full_name, p.email))
              .map((p) => ({ id: p.id, title: p.full_name, subtitle: p.email, href: `/workspace/pengurusan/pengguna?q=${encodeURIComponent(p.email)}` })),
          ),
        )
      }
      return out
    },
  },

  'public.search': {
    access: { kind: 'public' },
    write: false,
    run: (raw, ctx): SearchGroup[] => {
      const terms = parseQuery(raw)
      const store = ctx.store
      // Same published-only rules as the public pages themselves.
      return [
        ...group(
          'pengumuman',
          terms,
          store
            .all('announcements')
            .filter((a) => a.visibility === 'public' && isLive(a, ctx.now) && matches(terms, a.title, a.body, a.title_en, a.body_en))
            .map((a) => ({ id: a.id, title: a.title, subtitle: SHORT(a.body, 70), href: '/pengumuman' })),
        ),
        ...group(
          'templat',
          terms,
          store
            .all('templates')
            .filter((t) => t.access_level === 'public' && t.status !== 'archived' && matches(terms, t.title, t.description))
            .map((t) => ({ id: t.id, title: t.title, subtitle: t.category, href: '/templat' })),
        ),
        ...group(
          'arkib',
          terms,
          store
            .all('archive_documents')
            .filter((d) => d.visibility === 'public' && (d.status || 'active') === 'active' && d.public_file_id && matches(terms, d.title, d.reference_number, d.category))
            .map((d) => ({ id: d.id, title: d.title, subtitle: d.reference_number || d.category, href: '/arkib' })),
        ),
      ]
    },
  },
}
