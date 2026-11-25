import type { NoticeStatus, OprStatusView } from '@shared/api-contract'
import type { AttendanceStatus, ReferenceRequestStatus } from '@shared/domain'
import type { StatusTone } from '@/types/domain'

type Ui = { label: string; tone: StatusTone }

export const REF_STATUS_UI: Record<ReferenceRequestStatus, Ui> = {
  draft: { label: 'Draf', tone: 'draft' },
  submitted: { label: 'Dihantar', tone: 'pending' },
  approved: { label: 'Diluluskan', tone: 'approved' },
  rejected: { label: 'Ditolak', tone: 'rejected' },
  cancelled: { label: 'Dibatalkan', tone: 'archived' },
}

export const NOTICE_STATUS_UI: Record<NoticeStatus, Ui> = {
  draft: { label: 'Draf', tone: 'draft' },
  ready: { label: 'Sedia dihantar', tone: 'pending' },
  scheduled: { label: 'Dijadualkan', tone: 'pending' },
  sent: { label: 'Dihantar', tone: 'issued' },
  partial: { label: 'Separa', tone: 'rejected' },
  failed: { label: 'Gagal', tone: 'rejected' },
  cancelled: { label: 'Dibatalkan', tone: 'archived' },
}

export const OPR_STATUS_UI: Record<OprStatusView, Ui> = {
  draft: { label: 'Draf', tone: 'draft' },
  submitted: { label: 'Menunggu semakan', tone: 'pending' },
  revision_requested: { label: 'Perlu pembetulan', tone: 'rejected' },
  approved: { label: 'Disahkan', tone: 'approved' },
}

export const ATTENDANCE_UI: Record<AttendanceStatus, Ui> = {
  present: { label: 'Hadir', tone: 'approved' },
  late: { label: 'Lewat', tone: 'pending' },
  excused: { label: 'Bersebab', tone: 'issued' },
  absent_without_reason: { label: 'Tanpa sebab', tone: 'rejected' },
  pending: { label: 'Belum direkod', tone: 'draft' },
  exempted: { label: 'Dikecualikan', tone: 'archived' },
}
