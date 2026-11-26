import type { TableStore } from './store'

/**
 * Non-secret configuration kept in the system_settings sheet. Anything unknown is
 * "Belum ditetapkan oleh pentadbir" — nothing institutional is invented (CLAUDE.md).
 */
export interface SettingDef {
  key: string
  public: boolean
  fallback: string
  label: string
  kind: 'text' | 'textarea' | 'boolean' | 'select'
  options?: readonly string[]
  max: number
  help?: string
  /** Written only by a dedicated action (e.g. brand upload), never by the generic settings form. */
  managed?: boolean
}

import { PUBLIC_PAGE_KEYS, VISIBILITY_STATES, WORKSPACE_PAGE_KEYS } from '@shared/domain'

export const NOT_SET = 'Belum ditetapkan oleh pentadbir'

export const SETTING_DEFS: SettingDef[] = [
  { key: 'org_name', public: true, fallback: 'JPP IPGKKB', label: 'Nama organisasi', kind: 'text', max: 120 },
  { key: 'contact_email', public: true, fallback: '', label: 'E-mel perhubungan', kind: 'text', max: 120 },
  { key: 'contact_phone', public: true, fallback: '', label: 'Telefon perhubungan', kind: 'text', max: 40 },
  { key: 'contact_address', public: true, fallback: '', label: 'Alamat', kind: 'textarea', max: 300 },
  { key: 'social_instagram', public: true, fallback: '', label: 'Pautan Instagram (https)', kind: 'text', max: 200 },
  { key: 'social_facebook', public: true, fallback: '', label: 'Pautan Facebook (https)', kind: 'text', max: 200 },
  { key: 'social_tiktok', public: true, fallback: '', label: 'Pautan TikTok (https)', kind: 'text', max: 200 },
  { key: 'about_text', public: true, fallback: '', label: 'Teks Mengenai JPP', kind: 'textarea', max: 3000 },
  { key: 'privacy_text', public: true, fallback: '', label: 'Dasar privasi', kind: 'textarea', max: 8000, help: 'Perlu diluluskan oleh pihak institusi sebelum diterbitkan.' },
  { key: 'privacy_effective_date', public: true, fallback: '', label: 'Tarikh berkuat kuasa dasar privasi', kind: 'text', max: 20 },
  { key: 'maintenance_mode', public: true, fallback: 'false', label: 'Mod penyelenggaraan', kind: 'boolean', max: 5, help: 'Pengguna biasa tidak boleh menghantar; SUAK masih boleh.' },
  { key: 'maintenance_message', public: true, fallback: '', label: 'Mesej penyelenggaraan', kind: 'textarea', max: 300 },
  { key: 'letter_categories', public: false, fallback: 'Surat keluar\nSurat jemputan\nSurat permohonan\nSurat edaran\nLain-lain', label: 'Kategori surat (satu setiap baris)', kind: 'textarea', max: 600, help: 'Digunakan dalam permohonan nombor rujukan.' },
  { key: 'brand_version', public: true, fallback: '0', label: 'Versi jenama', kind: 'text', max: 12, managed: true },
  { key: 'brand_logo_id', public: false, fallback: '', label: 'Fail logo', kind: 'text', max: 80, managed: true },
  { key: 'brand_favicon_id', public: false, fallback: '', label: 'Fail favicon', kind: 'text', max: 80, managed: true },
  { key: 'brand_primary', public: true, fallback: '', label: 'Warna utama', kind: 'text', max: 7, managed: true },
  { key: 'brand_accent', public: true, fallback: '', label: 'Warna aksen', kind: 'text', max: 7, managed: true },
  { key: 'canned_replies', public: false, fallback: '', label: 'Jawapan sedia (satu setiap baris)', kind: 'textarea', max: 1500, help: 'Pilihan sekali-klik apabila menolak, membatalkan atau meminta pembetulan.' },
  { key: 'notifications_enabled', public: false, fallback: 'true', label: 'Hantar e-mel sistem (status permohonan, peringatan)', kind: 'boolean', max: 5 },
  { key: 'app_url', public: false, fallback: '', label: 'Alamat laman NO.VA (https) untuk pautan dalam e-mel', kind: 'text', max: 200 },
  { key: 'letterhead_line1', public: false, fallback: 'JPP IPGKKB', label: 'Kepala surat — baris 1', kind: 'text', max: 120 },
  { key: 'letterhead_line2', public: false, fallback: '', label: 'Kepala surat — baris 2', kind: 'text', max: 160 },
  { key: 'letterhead_line3', public: false, fallback: '', label: 'Kepala surat — alamat', kind: 'text', max: 200 },
  { key: 'signatory_title', public: false, fallback: 'Setiausaha Agung Kehormat', label: 'Jawatan penandatangan', kind: 'text', max: 100 },
  { key: 'verify_url', public: false, fallback: '', label: 'URL semakan keaslian (cth. https://nova.example/semak)', kind: 'text', max: 200 },
  { key: 'mail_sender_name', public: false, fallback: 'JPP IPGKKB · NO.VA', label: 'Nama pengirim e-mel', kind: 'text', max: 80 },
  { key: 'mail_reply_to', public: false, fallback: '', label: 'Alamat balas (Reply-To)', kind: 'text', max: 120 },
  { key: 'late_counts_as_present', public: false, fallback: 'true', label: 'Lewat dikira hadir', kind: 'boolean', max: 5, help: 'Keputusan SUAK/JPP (§16 #4). Lewat sentiasa dipaparkan berasingan.' },
  { key: 'public_attendance_mode', public: true, fallback: 'aggregate', label: 'Paparan kehadiran awam', kind: 'select', options: ['aggregate', 'named'], max: 10, help: 'aggregate = statistik sahaja (lalai, lebih selamat); named = nama + status. Perlu semakan privasi (§16 #5).' },
]

const PAGE_LABEL: Record<string, string> = {
  mengenai: 'Mengenai JPP', kehadiran: 'Kehadiran', pengumuman: 'Pengumuman', templat: 'Templat', arkib: 'Arkib Awam', semak: 'Semak Keaslian',
  e_surat: 'e-Surat', e_mesyuarat: 'e-Mesyuarat', nome: 'NoMe', e_opr: 'e-OPR', e_arkib: 'e-Arkib', papan_notis: 'Papan Notis',
}

/** Page visibility (HiPER): Diterbitkan / Akan datang / Dikunci / Disembunyikan for each page and module. */
export const visibilityKey = (scope: 'pub' | 'ws', page: string): string => `vis_${scope}_${page}`
const VISIBILITY_DEFS: SettingDef[] = [
  ...PUBLIC_PAGE_KEYS.map((k) => ({ key: visibilityKey('pub', k), public: true, fallback: 'published', label: `Halaman awam: ${PAGE_LABEL[k]}`, kind: 'select' as const, options: VISIBILITY_STATES, max: 10 })),
  ...WORKSPACE_PAGE_KEYS.map((k) => ({ key: visibilityKey('ws', k), public: true, fallback: 'published', label: `Modul ruang kerja: ${PAGE_LABEL[k] ?? k}`, kind: 'select' as const, options: VISIBILITY_STATES, max: 10, help: k === 'templat' ? 'Templat dalaman' : undefined })),
]
SETTING_DEFS.push(...VISIBILITY_DEFS)

const DEF_BY_KEY = new Map(SETTING_DEFS.map((d) => [d.key, d]))
export const isKnownSetting = (key: string): boolean => DEF_BY_KEY.has(key)
export const settingDef = (key: string): SettingDef | undefined => DEF_BY_KEY.get(key)

export function getSetting(store: TableStore, key: string): string {
  const row = store.find('system_settings', (r) => r.key === key)
  if (row) {
    try {
      const v = JSON.parse(row.value_json) as unknown
      if (typeof v === 'string') return v
    } catch {
      /* fall through to fallback */
    }
  }
  return DEF_BY_KEY.get(key)?.fallback ?? ''
}

export const getBool = (store: TableStore, key: string): boolean => getSetting(store, key) === 'true'

export function allSettings(store: TableStore, onlyPublic: boolean): Record<string, string> {
  const out: Record<string, string> = {}
  for (const d of SETTING_DEFS) if (!onlyPublic || d.public) out[d.key] = getSetting(store, d.key)
  return out
}
