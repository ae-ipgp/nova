/**
 * Contract between the web app and the Apps Script gateway (ADR-0001).
 *
 * Transport: one POST endpoint. Body is JSON sent as text/plain so the browser
 * makes a "simple" CORS request (Apps Script cannot answer preflight).
 * Apps Script cannot set HTTP status codes, so every response is an envelope.
 */
import type {
  AccountStatus,
  Area,
  AssignableRole,
  AttendanceStatus,
  MeetingStatus,
  NoticeType,
  OprStyle,
  ReferenceRequestStatus,
  RoleKey,
  SessionStatus,
  VisibilityLevel,
} from './domain'

export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'BUSY',
  'INTERNAL',
  'NOT_CONFIGURED',
] as const
export type ApiErrorCode = (typeof API_ERROR_CODES)[number]

export interface ApiError {
  code: ApiErrorCode
  message: string
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export interface ApiRequest<A extends ActionName = ActionName> {
  action: A
  payload: ActionMap[A]['payload']
  /** Supabase access token (JWT). Sent in the body, not a header, to avoid CORS preflight. */
  token?: string
}

// ---------------------------------------------------------------------------
// Payload and result types
// ---------------------------------------------------------------------------

export interface HealthResult {
  status: 'ok'
  schemaVersion: number | null
  configured: boolean
  time: string
}

/** Public projection of a JPP session (jpp_sessions.publicColumns). */
export interface PublicSession {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface SessionInfo extends PublicSession {
  status: SessionStatus
}

/**
 * - active:       registered, account active, may use the workspace
 * - unregistered: valid DELIMa sign-in, but SUAK has not registered this email
 * - inactive:     registered, but suspended or deactivated
 */
export type AccessStatus = 'active' | 'unregistered' | 'inactive'

export interface MeResult {
  email: string
  status: AccessStatus
  profile: { id: string; fullName: string; accountStatus: AccountStatus } | null
  roles: RoleKey[]
  activeSession: PublicSession | null
  membership: { position: string; bureau: string } | null
  /** Delegated areas ("Jika diberi"); SUAK implicitly holds all. */
  areas: Area[]
}

export interface UserSummary {
  profileId: string
  email: string
  fullName: string
  accountStatus: AccountStatus
  /** True once the person has signed in at least once. */
  linked: boolean
  roles: AssignableRole[]
  areas: Area[]
  position: string
  bureau: string
  publicListing: boolean
}

export interface RegisterUserPayload {
  email: string
  fullName: string
  roles: AssignableRole[]
  /** Optional membership in the active JPP session. */
  position?: string
  bureau?: string
  publicListing?: boolean
}

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

export interface FilePayload {
  name: string
  mimeType: string
  base64: string
}
export interface DownloadResult {
  name: string
  mimeType: string
  base64: string
}
export interface FileRef {
  id: string
  name: string
  mimeType: string
}
export interface Person {
  profileId: string
  name: string
}

// ---------------------------------------------------------------------------
// Public portal
// ---------------------------------------------------------------------------

export interface SiteConfig {
  settings: Record<string, string>
  activeSession: PublicSession | null
}

export interface PublicAnnouncement {
  id: string
  title: string
  body: string
  publishAt: string
  category: string
  pinned: boolean
}

export interface PublicMeetingAttendance {
  id: string
  title: string
  meetingType: string
  startsAt: string
  counts: { present: number; late: number; excused: number; absent: number }
  /** Only present when SUAK set the public mode to "named"; never includes reasons. */
  rows?: { name: string; position: string; bureau: string; status: AttendanceStatus }[]
}
export interface PublicAttendance {
  mode: 'aggregate' | 'named'
  meetings: PublicMeetingAttendance[]
}

export interface PublicTemplate {
  id: string
  category: string
  title: string
  description: string
  version: string
  updatedAt: string
  fileName: string
}
export interface PublicDocument {
  id: string
  title: string
  category: string
  referenceNumber: string
  publishedAt: string
  fileName: string
}
export interface PublicLeader {
  name: string
  position: string
  bureau: string
}
export interface VerifyResult {
  found: boolean
  status?: 'issued' | 'voided'
  issuedAt?: string
  typeName?: string
}

// ---------------------------------------------------------------------------
// Administration
// ---------------------------------------------------------------------------

export interface SettingField {
  key: string
  label: string
  kind: 'text' | 'textarea' | 'boolean' | 'select'
  options?: string[]
  help?: string
  max: number
  public: boolean
}
export interface SettingsResult {
  fields: SettingField[]
  values: Record<string, string>
}
export interface AuditEntry {
  id: string
  at: string
  actor: string
  action: string
  entityType: string
  entityId: string
  before: string
  after: string
}
export interface SeriesView {
  id: string
  prefix: string
  pattern: string
  year: number
  nextSequence: number
  padding: number
  active: boolean
  effectiveDate: string
  version: number
  /** What the next number would look like (preview only; never reserved). */
  preview: string
}
export interface SeriesPayload {
  id?: string
  prefix: string
  pattern: string
  year: number
  nextSequence: number
  padding: number
  active: boolean
}
export interface DocumentTypeView {
  id: string
  code: string
  name: string
  kind: 'letter' | 'certificate'
  description: string
  fields: { key: string; label: string; required: boolean; type: 'text' | 'textarea' | 'date'; max?: number }[]
  bodyTemplate: string
  isDemo: boolean
  active: boolean
}
export interface DocumentTypePayload {
  id?: string
  code: string
  name: string
  kind: 'letter' | 'certificate'
  description: string
  fields: DocumentTypeView['fields']
  bodyTemplate: string
  active: boolean
}
export interface GroupView {
  id: string
  name: string
  profileIds: string[]
  active: boolean
}

// ---------------------------------------------------------------------------
// M02 e-Surat
// ---------------------------------------------------------------------------

export interface RefRequestView {
  id: string
  /** Temporary application ID — NOT an official reference number (LTR-03). */
  applicationId: string
  status: ReferenceRequestStatus
  letterType: string
  subject: string
  recipient: string
  purpose: string
  letterDate: string
  documentTypeId: string
  documentTypeName: string
  fields: Record<string, string>
  applicant: Person
  createdAt: string
  reviewedAt: string
  reviewNote: string
  referenceNumber: string
  voided: boolean
  hasPdf: boolean
}
export interface RefRequestDetail extends RefRequestView {
  history: { at: string; actor: string; action: string }[]
}
export interface RefRequestPayload {
  id?: string
  letterType: string
  subject: string
  recipient: string
  purpose: string
  letterDate: string
  documentTypeId?: string
  fields?: Record<string, string>
  submit: boolean
}
export interface RegisterEntry {
  id: string
  referenceNumber: string
  requestId: string
  subject: string
  recipient: string
  letterType: string
  issuedAt: string
  issuedBy: string
  voidedAt: string
  voidReason: string
}
export interface CorrespondenceEntry {
  id: string
  direction: 'in' | 'out'
  referenceNumber: string
  subject: string
  sender: string
  recipient: string
  letterDate: string
  note: string
  file: FileRef | null
  createdAt: string
}
export interface CorrespondencePayload {
  direction: 'in' | 'out'
  subject: string
  sender: string
  recipient: string
  letterDate: string
  note?: string
  referenceNumber?: string
  file?: FilePayload
}

// ---------------------------------------------------------------------------
// M03 e-Mesyuarat
// ---------------------------------------------------------------------------

export interface MeetingView {
  id: string
  title: string
  meetingType: string
  startsAt: string
  endsAt: string
  location: string
  link: string
  status: MeetingStatus
  cancelReason: string
  published: boolean
  inviteeCount: number
  verifiedCount: number
}
export interface InviteeView {
  memberId: string
  name: string
  position: string
  bureau: string
  status: AttendanceStatus
  /** Private reason: only returned to users who may manage attendance. */
  reason: string
  verified: boolean
  verifiedBy: string
  verifiedAt: string
  exemptReason: string
  exemptUntil: string
}
export interface AgendaItem {
  sequence: number
  title: string
  presenter: string
  notes: string
}
export interface MinutesView {
  version: number
  content: string
  approvalStatus: 'draft' | 'submitted' | 'approved'
  approvedAt: string
}
export interface ActionView {
  id: string
  meetingId: string
  meetingTitle: string
  description: string
  ownerId: string
  ownerName: string
  dueDate: string
  status: 'open' | 'done'
  overdue: boolean
}
export interface MeetingDetail {
  meeting: MeetingView
  invitees: InviteeView[]
  agenda: AgendaItem[]
  minutes: MinutesView | null
  actions: ActionView[]
  canManage: boolean
  canVerify: boolean
}
export interface MeetingPayload {
  id?: string
  title: string
  meetingType: string
  startsAt: string
  endsAt: string
  location: string
  link?: string
  /** Members invited (profile ids of active jpp_members). Omit to invite every active member. */
  memberIds?: string[]
}
export interface AttendanceSummaryRow {
  memberId: string
  name: string
  position: string
  bureau: string
  present: number
  late: number
  excused: number
  absent: number
  exempted: number
  pending: number
  attended: number
  eligible: number
  percent: number | null
}
export interface MemberOption {
  memberId: string
  name: string
  position: string
  bureau: string
}

// ---------------------------------------------------------------------------
// M04 NoMe
// ---------------------------------------------------------------------------

export type NoticeStatus = 'draft' | 'ready' | 'scheduled' | 'sent' | 'partial' | 'failed' | 'cancelled'
export interface RecipientSpec {
  all?: boolean
  roles?: AssignableRole[]
  bureaus?: string[]
  groupIds?: string[]
  profileIds?: string[]
}
export interface NoticeView {
  id: string
  type: NoticeType
  subject: string
  body: string
  eventAt: string
  location: string
  link: string
  meetingId: string
  status: NoticeStatus
  scheduledAt: string
  sentAt: string
  recipientSpec: RecipientSpec
  recipientCount: number
  sentCount: number
  failedCount: number
  createdAt: string
  createdBy: string
}
export interface NoticePayload {
  id?: string
  type: NoticeType
  subject: string
  body: string
  eventAt?: string
  location?: string
  link?: string
  meetingId?: string
  recipientSpec: RecipientSpec
  scheduledAt?: string
}
export interface RecipientPreview {
  count: number
  people: { profileId: string; name: string; emailMasked: string }[]
}
export interface NoticePreview {
  subject: string
  html: string
  text: string
  recipients: RecipientPreview
  quotaRemaining: number
}
export interface DeliveryRow {
  id: string
  name: string
  emailMasked: string
  status: 'pending' | 'sent' | 'failed'
  error: string
  sentAt: string
}

// ---------------------------------------------------------------------------
// M05 Templat / M06 e-OPR / M07 e-Arkib
// ---------------------------------------------------------------------------

export interface TemplateView {
  id: string
  category: string
  title: string
  description: string
  version: string
  accessLevel: 'internal' | 'public'
  status: 'active' | 'archived'
  fileName: string
  mimeType: string
  sizeBytes: number
  updatedAt: string
}
export interface TemplatePayload {
  id?: string
  category: string
  title: string
  description: string
  accessLevel: 'internal' | 'public'
  file?: FilePayload
}

export interface OprContent {
  programName: string
  organiser: string
  date: string
  time: string
  venue: string
  background: string
  objectives: string
  execution: string
  participantCount: string
  targetGroup: string
  parties: string
  outcome: string
  impact: string
  images: { fileId: string; caption: string; credit: string }[]
  strengths: string
  issues: string
  suggestions: string
  preparedBy: string
}
export type OprStatusView = 'draft' | 'submitted' | 'revision_requested' | 'approved'
export interface OprView {
  id: string
  title: string
  programDate: string
  status: OprStatusView
  style: OprStyle
  version: number
  content: OprContent
  owner: Person
  reviewNote: string
  updatedAt: string
  hasFinal: boolean
  canEdit: boolean
  canReview: boolean
}
export interface OprPayload {
  id?: string
  style: OprStyle
  content: OprContent
}

export interface ArchiveView {
  id: string
  title: string
  category: string
  referenceNumber: string
  module: string
  description: string
  visibility: VisibilityLevel
  status: 'active' | 'archived'
  fileName: string
  mimeType: string
  version: number
  sessionName: string
  createdAt: string
  publishedAt: string
  owner: string
}
export interface ArchiveQuery {
  q?: string
  module?: string
  category?: string
  visibility?: VisibilityLevel
  status?: 'active' | 'archived'
  from?: string
  to?: string
}
export interface ArchiveUploadPayload {
  title: string
  category: string
  description?: string
  referenceNumber?: string
  visibility: 'private' | 'internal'
  file: FilePayload
}

// ---------------------------------------------------------------------------
// Papan Notis (Announcements) & dashboard
// ---------------------------------------------------------------------------

export interface AnnouncementView {
  id: string
  title: string
  body: string
  category: string
  visibility: VisibilityLevel
  status: 'draft' | 'published' | 'archived'
  pinned: boolean
  publishAt: string
  expiresAt: string
  createdAt: string
  author: string
  /** Published within the last 3 days (TERKINI). */
  recent: boolean
}
export interface AnnouncementPayload {
  id?: string
  title: string
  body: string
  category: string
  visibility: 'internal' | 'public'
  pinned: boolean
  publishAt?: string
  expiresAt?: string
  status: 'draft' | 'published' | 'archived'
}

export interface DashboardSummary {
  pendingReferences: number
  myReferenceByStatus: Partial<Record<ReferenceRequestStatus, number>>
  nextMeeting: MeetingView | null
  openActions: ActionView[]
  oprInProgress: number
  correspondenceThisMonth: number
  board: AnnouncementView[]
  recentActivity: { at: string; actor: string; action: string; entityType: string }[]
}

// ---------------------------------------------------------------------------
// Action map
// ---------------------------------------------------------------------------

type Empty = Record<string, never>

/**
 * Every gateway action. Each phase adds its actions here first so client and
 * server stay in lockstep. Access rules live in backend/src/actions.
 */
export interface ActionMap {
  // system & public
  'system.health': { payload: Empty; result: HealthResult }
  'session.active': { payload: Empty; result: PublicSession | null }
  'site.config': { payload: Empty; result: SiteConfig }
  'public.announcements': { payload: Empty; result: PublicAnnouncement[] }
  'public.attendance': { payload: Empty; result: PublicAttendance }
  'public.templates': { payload: Empty; result: PublicTemplate[] }
  'public.templates.download': { payload: { id: string }; result: DownloadResult }
  'public.archive': { payload: Empty; result: PublicDocument[] }
  'public.archive.download': { payload: { id: string }; result: DownloadResult }
  'public.leaders': { payload: Empty; result: { session: PublicSession | null; leaders: PublicLeader[] } }
  'public.verify': { payload: { reference: string }; result: VerifyResult }

  // identity & administration
  'auth.me': { payload: Empty; result: MeResult }
  'dashboard.summary': { payload: Empty; result: DashboardSummary }
  'admin.users.list': { payload: Empty; result: UserSummary[] }
  'admin.users.register': { payload: RegisterUserPayload; result: UserSummary }
  'admin.users.setStatus': {
    payload: { profileId: string; status: Exclude<AccountStatus, 'invited'> }
    result: UserSummary
  }
  'admin.users.setMembership': {
    payload: { profileId: string; position: string; bureau: string; publicListing: boolean }
    result: UserSummary
  }
  'admin.roles.grant': { payload: { profileId: string; role: AssignableRole }; result: UserSummary }
  'admin.roles.revoke': { payload: { profileId: string; role: AssignableRole }; result: UserSummary }
  'admin.areas.grant': { payload: { profileId: string; area: Area }; result: UserSummary }
  'admin.areas.revoke': { payload: { profileId: string; area: Area }; result: UserSummary }
  'admin.sessions.list': { payload: Empty; result: SessionInfo[] }
  'admin.sessions.create': { payload: { name: string; startDate: string; endDate: string }; result: SessionInfo }
  'admin.sessions.activate': { payload: { sessionId: string }; result: SessionInfo[] }
  'admin.settings.get': { payload: Empty; result: SettingsResult }
  'admin.settings.set': { payload: { values: Record<string, string> }; result: SettingsResult }
  'admin.audit.list': { payload: { action?: string; limit?: number }; result: AuditEntry[] }
  'admin.series.list': { payload: Empty; result: SeriesView[] }
  'admin.series.save': { payload: SeriesPayload; result: SeriesView[] }
  'admin.doctypes.list': { payload: Empty; result: DocumentTypeView[] }
  'admin.doctypes.save': { payload: DocumentTypePayload; result: DocumentTypeView[] }
  'admin.groups.list': { payload: Empty; result: GroupView[] }
  'admin.groups.save': { payload: { id?: string; name: string; profileIds: string[]; active: boolean }; result: GroupView[] }

  // M02 e-Surat
  'ref.options': { payload: Empty; result: { types: DocumentTypeView[]; categories: string[] } }
  'ref.request.list': { payload: { scope: 'mine' | 'all' }; result: RefRequestView[] }
  'ref.request.get': { payload: { id: string }; result: RefRequestDetail }
  'ref.request.save': { payload: RefRequestPayload; result: RefRequestView }
  'ref.request.cancel': { payload: { id: string }; result: RefRequestView }
  'ref.approve': { payload: { id: string; note?: string }; result: RefRequestView }
  'ref.reject': { payload: { id: string; reason: string }; result: RefRequestView }
  'ref.void': { payload: { id: string; reason: string }; result: RefRequestView }
  'ref.pdf': { payload: { id: string }; result: DownloadResult }
  'ref.register': { payload: Empty; result: RegisterEntry[] }
  'corr.list': { payload: { direction?: 'in' | 'out' }; result: CorrespondenceEntry[] }
  'corr.create': { payload: CorrespondencePayload; result: CorrespondenceEntry }
  'corr.file': { payload: { id: string }; result: DownloadResult }

  // M03 e-Mesyuarat
  'mtg.members': { payload: Empty; result: MemberOption[] }
  'mtg.list': { payload: Empty; result: MeetingView[] }
  'mtg.get': { payload: { id: string }; result: MeetingDetail }
  'mtg.save': { payload: MeetingPayload; result: MeetingDetail }
  'mtg.cancel': { payload: { id: string; reason: string }; result: MeetingDetail }
  'mtg.publish': { payload: { id: string; publish: boolean }; result: MeetingDetail }
  'mtg.exempt': { payload: { meetingId: string; memberId: string; reason: string; until?: string; clear?: boolean }; result: MeetingDetail }
  'mtg.attendance.set': {
    payload: { meetingId: string; entries: { memberId: string; status: AttendanceStatus; reason?: string }[]; editReason?: string }
    result: MeetingDetail
  }
  'mtg.attendance.verify': { payload: { meetingId: string }; result: MeetingDetail }
  'mtg.agenda.save': { payload: { meetingId: string; items: Omit<AgendaItem, 'sequence'>[] }; result: MeetingDetail }
  'mtg.minutes.save': { payload: { meetingId: string; content: string; submit: boolean }; result: MeetingDetail }
  'mtg.minutes.approve': { payload: { meetingId: string }; result: MeetingDetail }
  'mtg.action.save': {
    payload: { id?: string; meetingId: string; description: string; ownerId: string; dueDate: string; status: 'open' | 'done' }
    result: MeetingDetail
  }
  'mtg.summary': { payload: Empty; result: AttendanceSummaryRow[] }

  // M04 NoMe
  'notice.list': { payload: Empty; result: NoticeView[] }
  'notice.get': { payload: { id: string }; result: NoticeView }
  'notice.save': { payload: NoticePayload; result: NoticeView }
  'notice.recipients': { payload: { spec: RecipientSpec }; result: RecipientPreview }
  'notice.preview': { payload: { id: string }; result: NoticePreview }
  'notice.markReady': { payload: { id: string }; result: NoticeView }
  'notice.send': { payload: { id: string; confirmCount: number }; result: NoticeView }
  'notice.retry': { payload: { id: string }; result: NoticeView }
  'notice.cancel': { payload: { id: string }; result: NoticeView }
  'notice.deliveries': { payload: { id: string }; result: DeliveryRow[] }

  // M05 / M06 / M07
  'tpl.list': { payload: Empty; result: TemplateView[] }
  'tpl.save': { payload: TemplatePayload; result: TemplateView }
  'tpl.archive': { payload: { id: string; archived: boolean }; result: TemplateView }
  'tpl.download': { payload: { id: string }; result: DownloadResult }
  'opr.list': { payload: { scope: 'mine' | 'all' }; result: OprView[] }
  'opr.get': { payload: { id: string }; result: OprView }
  'opr.save': { payload: OprPayload; result: OprView }
  'opr.image.add': { payload: { oprId: string; file: FilePayload }; result: { fileId: string } }
  'opr.image.get': { payload: { oprId: string; fileId: string }; result: DownloadResult }
  'opr.submit': { payload: { id: string }; result: OprView }
  'opr.review': { payload: { id: string; decision: 'approve' | 'revise'; note?: string }; result: OprView }
  'opr.pdf': { payload: { id: string }; result: DownloadResult }
  'arc.list': { payload: ArchiveQuery; result: ArchiveView[] }
  'arc.upload': { payload: ArchiveUploadPayload; result: ArchiveView }
  'arc.download': { payload: { id: string }; result: DownloadResult }
  'arc.setVisibility': { payload: { id: string; visibility: VisibilityLevel }; result: ArchiveView }
  'arc.setStatus': { payload: { id: string; status: 'active' | 'archived' }; result: ArchiveView }

  // Papan Notis / Pengumuman
  'ann.list': { payload: { scope: 'board' | 'manage' }; result: AnnouncementView[] }
  'ann.save': { payload: AnnouncementPayload; result: AnnouncementView }
}

export type ActionName = keyof ActionMap
