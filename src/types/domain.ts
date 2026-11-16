/**
 * Domain vocabulary from Blueprint v1.0 (§06 roles, §14 seed statuses).
 * Role, account and session vocabulary is shared with the gateway (shared/domain.ts);
 * the remaining unions are used from Phase 2 onwards.
 */
export {
  ACCOUNT_STATUSES,
  ASSIGNABLE_ROLES,
  ROLE_KEYS,
  ROLE_LABELS,
  SESSION_STATUSES,
  type AccountStatus,
  type AssignableRole,
  type RoleKey,
  type SessionStatus,
} from '@shared/domain'

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
