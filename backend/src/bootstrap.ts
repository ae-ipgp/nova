import { ROLE_LABELS, ASSIGNABLE_ROLES } from '@shared/domain'
import { isAllowedEmail, normaliseEmail } from '@shared/identity'
import { activeRolesOf, makeAudit } from './context'
import type { TableStore } from './store'

export interface BootstrapInput {
  suakEmail: string
  suakName: string
  now: Date
  uuid(): string
}

export interface BootstrapResult {
  rolesSeeded: number
  suak: 'created' | 'exists'
  session: 'created' | 'exists'
  documentTypes: number
}

/**
 * DEMO letter/certificate definitions (§14). Wording is placeholder text only — SUAK must replace it
 * with the approved institutional format (Blueprint §16 #7). Generated PDFs from an unapproved
 * (is_demo) type carry a visible "CONTOH" banner.
 */
const DEMO_TYPES = [
  {
    code: 'JEMPUTAN-DEMO',
    name: 'Surat jemputan (CONTOH)',
    kind: 'letter',
    description: 'Contoh sahaja. Gantikan dengan format rasmi yang diluluskan.',
    fields: [
      { key: 'program', label: 'Nama program', required: true, type: 'text', max: 150 },
      { key: 'tarikh_program', label: 'Tarikh program', required: true, type: 'date' },
      { key: 'tempat', label: 'Tempat', required: true, type: 'text', max: 150 },
    ],
    body: '[CONTOH — GANTIKAN DENGAN FORMAT RASMI]\n\nJemputan ke {{program}} pada {{tarikh_program}} bertempat di {{tempat}}.\n\nPemohon: {{pemohon}}',
  },
  {
    code: 'PENGESAHAN-DEMO',
    name: 'Surat pengesahan (CONTOH)',
    kind: 'letter',
    description: 'Contoh sahaja. Gantikan dengan format rasmi yang diluluskan.',
    fields: [
      { key: 'nama_penerima', label: 'Nama penerima', required: true, type: 'text', max: 120 },
      { key: 'perkara', label: 'Perkara yang disahkan', required: true, type: 'textarea', max: 600 },
    ],
    body: '[CONTOH — GANTIKAN DENGAN FORMAT RASMI]\n\nSurat ini mengesahkan bahawa {{nama_penerima}}: {{perkara}}.',
  },
  {
    code: 'SIJIL-DEMO',
    name: 'Sijil penghargaan (CONTOH)',
    kind: 'certificate',
    description: 'Contoh sahaja. Gantikan dengan reka letak sijil rasmi.',
    fields: [
      { key: 'nama_penerima', label: 'Nama penerima', required: true, type: 'text', max: 120 },
      { key: 'program', label: 'Program', required: true, type: 'text', max: 150 },
    ],
    body: '[CONTOH]\n\nDianugerahkan kepada\n\n{{nama_penerima}}\n\nkerana sumbangan dalam {{program}}.',
  },
] as const

/**
 * First-run data, run by the owner from the Apps Script editor (never via the
 * web). Creates the role catalogue, the first SUAK (so someone can log in and
 * register everyone else) and a clearly labelled DEMO session.
 * Safe to run again: it never adds a second SUAK or session.
 */
export function bootstrap(store: TableStore, input: BootstrapInput): BootstrapResult {
  if (!isAllowedEmail(input.suakEmail)) throw new Error('BOOTSTRAP_SUAK_EMAIL must be a @moe-dl.edu.my address')
  const now = input.now.toISOString()
  const audit = makeAudit(store, input.now, input.uuid, () => 'system:bootstrap')

  let rolesSeeded = 0
  for (const key of ASSIGNABLE_ROLES) {
    if (!store.find('roles', (r) => r.role_key === key)) {
      store.insert('roles', { id: input.uuid(), role_key: key, role_name: ROLE_LABELS[key] })
      rolesSeeded++
    }
  }

  const hasSuak = store
    .all('profiles')
    .some((p) => (p.account_status === 'active' || p.account_status === 'invited') && activeRolesOf(store, p.id).includes('suak'))
  let suak: BootstrapResult['suak'] = 'exists'
  if (!hasSuak) {
    const email = normaliseEmail(input.suakEmail)
    const existing = store.find('profiles', (p) => normaliseEmail(p.email) === email)
    const profile =
      existing ??
      store.insert('profiles', { id: input.uuid(), email, full_name: input.suakName || 'SUAK', account_status: 'invited', created_at: now, updated_at: now })
    store.insert('user_roles', { id: input.uuid(), profile_id: profile.id, role_key: 'suak', granted_by: 'system:bootstrap', granted_at: now })
    audit('bootstrap.suak', 'profile', profile.id, null, { email })
    suak = 'created'
  }

  let session: BootstrapResult['session'] = 'exists'
  if (!store.all('jpp_sessions').length) {
    // DEMO (§14): name and dates must be confirmed and replaced by SUAK.
    const row = store.insert('jpp_sessions', {
      id: input.uuid(),
      name: 'Legasi Ke-72 · Sesi 2026/2027 (DEMO)',
      start_date: '',
      end_date: '',
      status: 'active',
      created_at: now,
      updated_at: now,
      created_by: 'system:bootstrap',
    })
    audit('bootstrap.session', 'jpp_session', row.id, null, { name: row.name })
    session = 'created'
  }

  let documentTypes = 0
  for (const t of DEMO_TYPES) {
    if (store.find('document_types', (d) => d.code === t.code)) continue
    store.insert('document_types', {
      id: input.uuid(),
      code: t.code,
      name: t.name,
      kind: t.kind,
      description: t.description,
      fields_json: JSON.stringify(t.fields),
      body_template: t.body,
      is_demo: 'true',
      active: 'true',
      created_at: now,
      updated_at: now,
      created_by: 'system:bootstrap',
    })
    documentTypes++
  }

  return { rolesSeeded, suak, session, documentTypes }
}
