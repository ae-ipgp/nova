/** Product identity and public navigation (Blueprint §05). */
export const SITE = {
  name: 'NO.VA',
  fullName: 'NO.VA — Digital Secretariat',
  organisation: 'JPP IPGKKB',
  organisationLong: 'Jawatankuasa Perwakilan Pelajar IPGKKB',
  tagline: 'One platform. One Secretariat. One official record.',
  heroHeadline: 'The Secretariat, in Motion.',
  heroSubheading:
    'Satu ruang digital untuk menyelaras persuratan, mesyuarat, dokumentasi dan rekod rasmi JPP IPGKKB — dengan proses yang lebih jelas, tersusun dan boleh dijejak.',
  /** DEMO value — the active session must be confirmed by SUAK (§14). */
  demoSessionLabel: 'Legasi Ke-72 · Sesi 2026/2027',
} as const

export interface NavLink {
  to: string
  label: string
}

export const PUBLIC_NAV: readonly NavLink[] = [
  { to: '/mengenai', label: 'Mengenai JPP' },
  { to: '/kehadiran', label: 'Kehadiran' },
  { to: '/pengumuman', label: 'Pengumuman' },
  { to: '/templat', label: 'Templat' },
  { to: '/arkib', label: 'Arkib Awam' },
]
