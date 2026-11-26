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
  /** With appendOnly: the only columns that may still be updated (e.g. voiding a reference number). */
  mutableColumns?: readonly string[]
  unique?: readonly (readonly string[])[]
  restricted?: readonly string[]
  publicColumns?: readonly string[]
}

/** Bump when columns or tabs change; setup records it in system_settings. */
export const SCHEMA_VERSION = 4

const ROW = ['id', 'created_at', 'updated_at', 'created_by'] as const

export const SHEETS = [
  // Identity & organisation ----------------------------------------------
  {
    name: 'profiles',
    workbook: 'data',
    // SUAK registers a member by DELIMa email (registration by SUAK only). user_id (the
    // Supabase Auth user id) is linked on the member's first sign-in.
    columns: ['id', 'user_id', 'full_name', 'email', 'phone', 'account_status', 'created_at', 'updated_at', 'notify_off'],
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
    // v2: roles are keyed by profile_id so SUAK can assign them before first sign-in.
    // `user_id` (v1) is unused and kept only because columns are never removed.
    columns: ['id', 'user_id', 'role_key', 'granted_by', 'granted_at', 'revoked_by', 'revoked_at', 'profile_id'],
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
    // public_listing: SUAK opts a member into the public "Mengenai JPP" leadership list.
    columns: [...ROW, 'session_id', 'profile_id', 'position', 'bureau', 'membership_status', 'public_listing'],
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
      // v3: optional generated document (letter/certificate) for this request
      'document_type_id', 'fields_json', 'pdf_file_id',
    ],
  },
  {
    name: 'reference_register',
    workbook: 'data',
    appendOnly: true,
    // Numbers are never edited or removed; voiding only fills these columns (LTR-06/07).
    mutableColumns: ['voided_at', 'voided_by', 'void_reason'],
    columns: ['id', 'request_id', 'series_id', 'reference_number', 'issued_at', 'issued_by', 'voided_at', 'voided_by', 'void_reason'],
    unique: [['reference_number'], ['request_id']],
  },
  {
    name: 'correspondence',
    workbook: 'data',
    columns: [...ROW, 'session_id', 'direction', 'reference_id', 'subject', 'sender', 'recipient', 'letter_date', 'drive_file_id', 'file_name', 'mime_type', 'note'],
  },

  // M03 e-Mesyuarat ----------------------------------------------------------
  {
    name: 'meetings',
    workbook: 'data',
    columns: [...ROW, 'session_id', 'title', 'meeting_type', 'starts_at', 'ends_at', 'location', 'organiser_id', 'status', 'published_at', 'published_by', 'link', 'cancel_reason'],
    publicColumns: ['id', 'session_id', 'title', 'meeting_type', 'starts_at', 'published_at'],
  },
  {
    name: 'meeting_invitees',
    workbook: 'data',
    // eligibility_snapshot freezes name/position/bureau at invitation so later changes never rewrite history.
    columns: ['id', 'meeting_id', 'member_id', 'eligibility_snapshot', 'created_at', 'exempt_reason', 'exempt_until'],
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
    columns: [...ROW, 'meeting_id', 'description', 'owner_id', 'due_date', 'status', 'last_reminded_on'],
  },

  // M04 NoMe ---------------------------------------------------------------
  {
    name: 'notices',
    workbook: 'data',
    columns: [
      ...ROW, 'session_id', 'notice_type', 'subject', 'body', 'status', 'scheduled_at', 'approved_by', 'approved_at', 'sent_at',
      // v3
      'recipient_spec_json', 'event_at', 'location', 'link', 'meeting_id', 'recipient_count', 'sent_count', 'failed_count',
    ],
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
    columns: [...ROW, 'category', 'title', 'version', 'access_level', 'drive_file_id', 'status', 'description', 'file_name', 'mime_type', 'size_bytes'],
    publicColumns: ['id', 'category', 'title', 'version', 'updated_at', 'description', 'file_name'],
  },
  {
    name: 'opr_reports',
    workbook: 'data',
    columns: [
      ...ROW, 'session_id', 'title', 'program_date', 'status', 'content_json', 'version', 'final_file_id', 'approved_by', 'approved_at',
      // v3
      'style', 'review_note', 'reviewed_by', 'submitted_at', 'archive_id',
      // Ids of every image uploaded for this report. Only these may be attached or read back.
      'image_ids',
    ],
  },
  {
    name: 'opr_versions',
    workbook: 'data',
    appendOnly: true,
    columns: ['id', 'opr_id', 'version', 'content_json', 'saved_by', 'saved_at'],
  },
  {
    name: 'archive_documents',
    workbook: 'data',
    columns: [
      ...ROW, 'session_id', 'module', 'title', 'category', 'reference_number', 'drive_file_id', 'public_file_id', 'visibility', 'status', 'version', 'published_at', 'published_by',
      // v3
      'description', 'file_name', 'mime_type', 'source_type', 'source_id',
    ],
    publicColumns: ['id', 'title', 'category', 'reference_number', 'published_at', 'file_name'],
  },

  // Public portal & system -----------------------------------------------------
  {
    name: 'announcements',
    workbook: 'data',
    columns: [...ROW, 'title', 'body', 'visibility', 'status', 'publish_at', 'category', 'pinned', 'expires_at', 'title_en', 'body_en'],
    publicColumns: ['id', 'title', 'body', 'publish_at', 'category', 'pinned', 'title_en', 'body_en'],
  },
  {
    name: 'system_settings',
    workbook: 'data',
    // Non-secret configuration only. Secrets live in Apps Script Script Properties.
    columns: ['id', 'key', 'value_json', 'updated_by', 'updated_at'],
    unique: [['key']],
  },
  // v3 ------------------------------------------------------------------------
  {
    name: 'profile_areas',
    workbook: 'data',
    // Delegated capabilities ("Jika diberi", Blueprint §06). Reference approval can never be delegated.
    columns: ['id', 'profile_id', 'area', 'granted_by', 'granted_at', 'revoked_by', 'revoked_at'],
  },
  {
    name: 'document_types',
    workbook: 'data',
    // Letter / certificate definitions. Wording is SUAK's to approve; is_demo marks unapproved samples (§14).
    columns: [...ROW, 'code', 'name', 'kind', 'description', 'fields_json', 'body_template', 'is_demo', 'active'],
    unique: [['code']],
  },
  {
    name: 'notice_groups',
    workbook: 'data',
    columns: [...ROW, 'name', 'profile_ids_json', 'active'],
    unique: [['name']],
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
