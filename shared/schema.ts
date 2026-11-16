/**
 * NO.VA data schema on Google Sheets (ADR-0001).
 *
 * Each entry is one tab. Blueprint §10 tables map 1:1 to tabs; file paths
 * become Google Drive file IDs. Columns are addressed by HEADER NAME, never by
 * position, so setup can append new columns without breaking existing data.
 *
 * Rules enforced by the Apps Script gateway (not by Sheets itself):
 *  - `unique`: checked inside the script lock before every insert/update.
 *  - `appendOnly`: rows are never edited or deleted (status/void columns instead).
 *  - `restricted`: columns never returned to roles below the documented access.
 *  - `publicColumns`: the ONLY columns a public (anonymous) query may return,
 *    and only for rows whose visibility/status marks them published.
 */

export type Workbook = 'data' | 'audit'

export interface SheetDef {
  name: string
  workbook: Workbook
  columns: readonly string[]
  appendOnly?: boolean
  unique?: readonly (readonly string[])[]
  restricted?: readonly string[]
  publicColumns?: readonly string[]
}

/** Bump when columns or tabs change; setup records it in system_settings. */
export const SCHEMA_VERSION = 1

const ROW = ['id', 'created_at', 'updated_at', 'created_by'] as const

export const SHEETS = [
  // Identity & organisation ----------------------------------------------
  {
    name: 'profiles',
    workbook: 'data',
    // SUAK registers a member by DELIMa email (registration by SUAK only). user_id (the
    // Supabase Auth user id) is linked on the member's first sign-in.
    columns: ['id', 'user_id', 'full_name', 'email', 'phone', 'account_status', 'created_at', 'updated_at'],
    unique: [['user_id'], ['email']],
    restricted: ['email', 'phone'],
  },
  {
    name: 'roles',
    workbook: 'data',
    columns: ['id', 'role_key', 'role_name'],
    unique: [['role_key']],
  },
  {
    name: 'user_roles',
    workbook: 'data',
    columns: ['id', 'user_id', 'role_key', 'granted_by', 'granted_at', 'revoked_by', 'revoked_at'],
  },
  {
    name: 'jpp_sessions',
    workbook: 'data',
    columns: [...ROW, 'name', 'start_date', 'end_date', 'status'],
    publicColumns: ['id', 'name', 'start_date', 'end_date', 'status'],
  },
  {
    name: 'jpp_members',
    workbook: 'data',
    columns: [...ROW, 'session_id', 'profile_id', 'position', 'bureau', 'membership_status'],
    unique: [['session_id', 'profile_id']],
  },

  // M02 e-Surat ------------------------------------------------------------
  {
    name: 'reference_series',
    workbook: 'data',
    // Format is configuration, never hard-coded (§08A, §14).
    columns: [...ROW, 'prefix', 'format_pattern', 'year', 'next_sequence', 'padding', 'active', 'effective_date', 'version'],
  },
  {
    name: 'reference_requests',
    workbook: 'data',
    columns: [
      ...ROW, 'session_id', 'applicant_id', 'letter_type', 'subject', 'recipient', 'purpose',
      'letter_date', 'attachment_file_id', 'status', 'reviewed_by', 'reviewed_at', 'review_note',
    ],
  },
  {
    name: 'reference_register',
    workbook: 'data',
    appendOnly: true,
    columns: ['id', 'request_id', 'series_id', 'reference_number', 'issued_at', 'issued_by', 'voided_at', 'voided_by', 'void_reason'],
    unique: [['reference_number'], ['request_id']],
  },
  {
    name: 'correspondence',
    workbook: 'data',
    columns: [...ROW, 'session_id', 'direction', 'reference_id', 'subject', 'sender', 'recipient', 'letter_date', 'drive_file_id'],
  },

  // M03 e-Mesyuarat ----------------------------------------------------------
  {
    name: 'meetings',
    workbook: 'data',
    columns: [...ROW, 'session_id', 'title', 'meeting_type', 'starts_at', 'ends_at', 'location', 'organiser_id', 'status', 'published_at', 'published_by'],
    publicColumns: ['id', 'session_id', 'title', 'meeting_type', 'starts_at', 'published_at'],
  },
  {
    name: 'meeting_invitees',
    workbook: 'data',
    columns: ['id', 'meeting_id', 'member_id', 'eligibility_snapshot', 'created_at'],
    unique: [['meeting_id', 'member_id']],
  },
  {
    name: 'attendance_records',
    workbook: 'data',
    columns: [...ROW, 'meeting_id', 'member_id', 'status', 'reason_private', 'verified_by', 'verified_at', 'published'],
    unique: [['meeting_id', 'member_id']],
    restricted: ['reason_private'],
    // Name/position come from a join done by the gateway, never from this sheet directly.
    publicColumns: ['meeting_id', 'member_id', 'status'],
  },
  {
    name: 'meeting_agendas',
    workbook: 'data',
    columns: [...ROW, 'meeting_id', 'sequence', 'title', 'presenter', 'notes', 'drive_file_id'],
  },
  {
    name: 'meeting_minutes',
    workbook: 'data',
    columns: [...ROW, 'meeting_id', 'version', 'content', 'approval_status', 'approved_by', 'approved_at'],
  },
  {
    name: 'meeting_actions',
    workbook: 'data',
    columns: [...ROW, 'meeting_id', 'description', 'owner_id', 'due_date', 'status'],
  },

  // M04 NoMe ---------------------------------------------------------------
  {
    name: 'notices',
    workbook: 'data',
    columns: [...ROW, 'session_id', 'notice_type', 'subject', 'body', 'status', 'scheduled_at', 'approved_by', 'approved_at', 'sent_at'],
  },
  {
    name: 'notice_recipients',
    workbook: 'data',
    columns: ['id', 'notice_id', 'email', 'recipient_name', 'delivery_status', 'idempotency_key', 'sent_at', 'error'],
    unique: [['idempotency_key']],
    restricted: ['email'],
  },
  {
    name: 'email_logs',
    workbook: 'audit',
    appendOnly: true,
    columns: ['id', 'notice_id', 'recipient_id', 'event_type', 'detail', 'occurred_at'],
  },

  // M05–M07 Documents --------------------------------------------------------
  {
    name: 'templates',
    workbook: 'data',
    columns: [...ROW, 'category', 'title', 'version', 'access_level', 'drive_file_id', 'status'],
    publicColumns: ['id', 'category', 'title', 'version', 'updated_at'],
  },
  {
    name: 'opr_reports',
    workbook: 'data',
    columns: [...ROW, 'session_id', 'title', 'program_date', 'status', 'content_json', 'version', 'final_file_id', 'approved_by', 'approved_at'],
  },
  {
    name: 'archive_documents',
    workbook: 'data',
    columns: [...ROW, 'session_id', 'module', 'title', 'category', 'reference_number', 'drive_file_id', 'public_file_id', 'visibility', 'status', 'version', 'published_at', 'published_by'],
    publicColumns: ['id', 'title', 'category', 'reference_number', 'public_file_id', 'published_at'],
  },

  // Public portal & system -----------------------------------------------------
  {
    name: 'announcements',
    workbook: 'data',
    columns: [...ROW, 'title', 'body', 'visibility', 'status', 'publish_at'],
    publicColumns: ['id', 'title', 'body', 'publish_at'],
  },
  {
    name: 'system_settings',
    workbook: 'data',
    // Non-secret configuration only. Secrets live in Apps Script Script Properties.
    columns: ['key', 'value_json', 'updated_by', 'updated_at'],
    unique: [['key']],
  },
  {
    name: 'audit_logs',
    workbook: 'audit',
    appendOnly: true,
    columns: ['id', 'actor_id', 'action', 'entity_type', 'entity_id', 'before_json', 'after_json', 'created_at'],
  },
] as const satisfies readonly SheetDef[]

export type SheetName = (typeof SHEETS)[number]['name']

export function getSheetDef(name: SheetName): SheetDef {
  const def = SHEETS.find((s) => s.name === name)
  if (!def) throw new Error(`Unknown sheet: ${name}`)
  return def
}

/** Drive folder layout created under the NO.VA root folder. */
export const DRIVE_FOLDERS = {
  surat: 'e-Surat',
  mesyuarat: 'e-Mesyuarat',
  templat: 'Templat',
  opr: 'e-OPR',
  arkib: 'e-Arkib',
  /** Only copies of PUBLISHED documents live here, shared "anyone with link — view". */
  awam: 'Awam (diterbitkan)',
  sandaran: 'Sandaran',
} as const
