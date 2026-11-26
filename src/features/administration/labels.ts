import { getLang } from '@/lib/prefs'
import type { AccountStatus, AssignableRole, SessionStatus } from '@shared/domain'
import type { StatusTone } from '@/types/domain'

export const ACCOUNT_STATUS_UI: Record<AccountStatus, { label: string; tone: StatusTone }> = {
  invited: { label: 'Dijemput', tone: 'pending' },
  active: { label: 'Aktif', tone: 'approved' },
  suspended: { label: 'Digantung', tone: 'rejected' },
  deactivated: { label: 'Dinyahaktif', tone: 'archived' },
}

export const SESSION_STATUS_UI: Record<SessionStatus, { label: string; tone: StatusTone }> = {
  planned: { label: 'Dirancang', tone: 'draft' },
  active: { label: 'Aktif', tone: 'approved' },
  archived: { label: 'Diarkib', tone: 'archived' },
}

export const ROLE_DESCRIPTIONS: Record<AssignableRole, string> = {
  member: 'Melihat ruang dalaman terhad dan menghantar permohonan.',
  secretariat: 'Mengurus rekod operasi kesetiausahaan mengikut skop tugas.',
  suak: 'Kuasa pentadbiran penuh, termasuk kelulusan nombor rujukan.',
  system_admin: 'Konfigurasi teknikal sahaja; tiada kuasa kelulusan kandungan.',
}

export function formatDate(iso: string): string {
  if (!iso) return 'Belum ditetapkan'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat(getLang() === 'en' ? 'en-MY' : 'ms-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(y, m - 1, d))
}
