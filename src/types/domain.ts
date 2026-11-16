/**
 * Domain vocabulary from Blueprint v1.0 (§06 roles, §14 seed statuses).
 * These are type-level contracts only. The Google Sheets data (Phase 1+) is the source
 * of truth; keep these unions in sync with shared/schema.ts and the gateway.
 */

export const ROLE_KEYS = ['public', 'member', 'secretariat', 'suak', 'system_admin'] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

export const ROLE_LABELS: Record<RoleKey, string> = {
  public: 'Pelawat Awam',
  member: 'Ahli JPP',
  secretariat: 'Sekretariat',
  suak: 'SUAK',
  system_admin: 'Pentadbir Sistem',
}

export const ACCOUNT_STATUSES = ['invited', 'active', 'suspended', 'deactivated'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

export const REFERENCE_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'approved',
  'rejected',
  'voided',
] as const
export type ReferenceStatus = (typeof REFERENCE_STATUSES)[number]

export const ATTENDANCE_STATUSES = [
  'present',
  'late',
  'excused',
  'absent_without_reason',
  'pending',
  'exempted',
] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const OPR_STATUSES = [
  'draft',
  'submitted',
  'revision_requested',
  'approved',
  'published',
  'archived',
] as const
export type OprStatus = (typeof OPR_STATUSES)[number]

export const NOTICE_TYPES = [
  'meeting_notice',
  'reminder',
  'reschedule',
  'cancellation',
  'minutes_distribution',
  'announcement',
] as const
export type NoticeType = (typeof NOTICE_TYPES)[number]

export const VISIBILITIES = ['private', 'internal', 'public'] as const
export type Visibility = (typeof VISIBILITIES)[number]

/** Semantic status tones — §04 "Semantic status colours". */
export type StatusTone = 'draft' | 'pending' | 'approved' | 'rejected' | 'issued' | 'archived'
