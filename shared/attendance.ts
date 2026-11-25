import type { AttendanceStatus } from './domain'

/**
 * Attendance rate with an explicit, visible denominator (MTG-10, Blueprint §08B):
 *   rate = counted-as-attended ÷ meetings the member was eligible to attend × 100
 * - Exempted meetings leave the denominator (MTG-09) and are never mixed into other statuses.
 * - Pending (unverified) meetings are excluded from the denominator until verified.
 * - `lateCounts` is SUAK's decision (§16 #4). Late is always reported separately.
 */
export interface AttendanceSummary {
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

export function summariseAttendance(statuses: readonly AttendanceStatus[], lateCounts = true): AttendanceSummary {
  const n = (s: AttendanceStatus) => statuses.filter((x) => x === s).length
  const present = n('present')
  const late = n('late')
  const excused = n('excused')
  const absent = n('absent_without_reason')
  const exempted = n('exempted')
  const pending = n('pending')
  const attended = present + (lateCounts ? late : 0)
  const eligible = present + late + excused + absent
  return { present, late, excused, absent, exempted, pending, attended, eligible, percent: eligible === 0 ? null : Math.round((attended / eligible) * 1000) / 10 }
}
