/** Vocabulary shared by the web app and the gateway (Blueprint §06, §14). */

export const ROLE_KEYS = ['public', 'member', 'secretariat', 'suak', 'system_admin'] as const
export type RoleKey = (typeof ROLE_KEYS)[number]

/** Roles that can be granted to an account (public is the anonymous visitor). */
export const ASSIGNABLE_ROLES = ['member', 'secretariat', 'suak', 'system_admin'] as const satisfies readonly RoleKey[]
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number]

export const ROLE_LABELS: Record<RoleKey, string> = {
  public: 'Pelawat Awam',
  member: 'Ahli JPP',
  secretariat: 'Sekretariat',
  suak: 'SUAK',
  system_admin: 'Pentadbir Sistem',
}

/** invited = registered by SUAK, not signed in yet. */
export const ACCOUNT_STATUSES = ['invited', 'active', 'suspended', 'deactivated'] as const
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]

/**
 * Delegated areas ("Jika diberi"). SUAK holds all of them implicitly.
 * Reference-number approval is deliberately NOT an area: only SUAK may approve (Blueprint §06, LTR-04).
 */
export const AREAS = ['nome.prepare', 'nome.send', 'opr.approve', 'templates.manage', 'meetings.verify'] as const
export type Area = (typeof AREAS)[number]

export const AREA_LABELS: Record<Area, string> = {
  'nome.prepare': 'Sediakan NoMe',
  'nome.send': 'Hantar NoMe',
  'opr.approve': 'Sahkan OPR',
  'templates.manage': 'Urus templat',
  'meetings.verify': 'Sahkan kehadiran',
}

export const SESSION_STATUSES = ['planned', 'active', 'archived'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]

export const ATTENDANCE_STATUSES = ['present', 'late', 'excused', 'absent_without_reason', 'pending', 'exempted'] as const
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  present: 'Hadir',
  late: 'Lewat',
  excused: 'Bersebab',
  absent_without_reason: 'Tanpa sebab',
  pending: 'Belum disahkan',
  exempted: 'Dikecualikan',
}

export const MEETING_TYPES = ['Mesyuarat AMT', 'Mesyuarat AMM', 'Mesyuarat Khas', 'Mesyuarat Biro'] as const
export type MeetingType = (typeof MEETING_TYPES)[number]

export const MEETING_STATUSES = ['scheduled', 'cancelled', 'completed'] as const
export type MeetingStatus = (typeof MEETING_STATUSES)[number]

export const NOTICE_TYPES = ['meeting_notice', 'reminder', 'reschedule', 'cancellation', 'minutes_distribution', 'announcement'] as const
export type NoticeType = (typeof NOTICE_TYPES)[number]
export const NOTICE_TYPE_LABELS: Record<NoticeType, string> = {
  meeting_notice: 'Notis mesyuarat',
  reminder: 'Peringatan',
  reschedule: 'Perubahan jadual',
  cancellation: 'Pembatalan',
  minutes_distribution: 'Edaran minit',
  announcement: 'Pengumuman',
}

export const REFERENCE_REQUEST_STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'cancelled'] as const
export type ReferenceRequestStatus = (typeof REFERENCE_REQUEST_STATUSES)[number]

export const OPR_STYLES = ['corporate', 'editorial', 'infographic'] as const
export type OprStyle = (typeof OPR_STYLES)[number]

export const VISIBILITY = ['private', 'internal', 'public'] as const
export type VisibilityLevel = (typeof VISIBILITY)[number]

export const ANNOUNCEMENT_CATEGORIES = ['Umum', 'Akademik', 'Program', 'Kebajikan', 'Sukan', 'Notis rasmi'] as const
