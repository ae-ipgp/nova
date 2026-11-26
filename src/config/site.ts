/** Product identity and public navigation (Blueprint §05). */
export const SITE = {
  name: 'NoVA',
  fullName: 'NoVA — Notion of Virtual Assistance',
  organisation: 'JPP IPGKKB',
  organisationLong: 'Pejabat Setiausaha Agung Kehormat',
  tagline: 'Berwibawa, berintegriti',
  heroHeadline: 'Inovasi Maya, untuk Legasi',
  heroSubheading:
    'Satu ruang digital untuk menyelaras persuratan, mesyuarat, dokumentasi dan rekod rasmi JPP IPGKKB.',
  /** DEMO value — the active session must be confirmed by SUAK (§14). */
  demoSessionLabel: 'Legasi Ke-72 · Sesi 2026/2027',
} as const

export interface NavLink {
  to: string
  label: string
}

export const PUBLIC_NAV: readonly NavLink[] = [
  { to: '/organisasi', label: 'Organisasi' },
  { to: '/kehadiran', label: 'Kehadiran' },
  { to: '/pengumuman', label: 'Pengumuman' },
  { to: '/templat', label: 'Templat' },
  { to: '/arkib', label: 'Arkib Awam' },
  { to: '/semak', label: 'Semak Keaslian' },
]
