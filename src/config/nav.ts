import { BadgeCheck, Building2, FileClock, Hash, KeyRound, Megaphone, ScrollText, Settings2, Users, type LucideIcon } from 'lucide-react'
import type { RoleKey } from '@shared/domain'
import { MODULES, workspacePath } from './modules'
import { PUBLIC_NAV } from './site'
import { t } from '@/i18n'

export interface NavPage {
  to: string
  label: string
  icon: LucideIcon
  /** Extra words that should find this page in search. */
  keywords?: string
}

const has = (roles: readonly RoleKey[], allowed: readonly RoleKey[]) => roles.some((r) => allowed.includes(r))

/** Workspace destinations visible to these roles (sidebar/rail/dock/search all read this one list). */
export function workspaceModules(roles: readonly RoleKey[]): NavPage[] {
  return MODULES.filter((m) => has(roles, m.navRoles)).map((m) => ({ to: workspacePath(m), label: m.name, icon: m.icon, keywords: m.summary }))
}

export function boardPage(): NavPage {
  return { to: '/workspace/papan-notis', label: t('Papan Notis'), icon: Megaphone, keywords: 'pengumuman notis announcements board' }
}

/** Every place search can jump to, including Pengurusan sections. */
export function allWorkspacePages(roles: readonly RoleKey[]): NavPage[] {
  const admin: NavPage[] = []
  if (has(roles, ['suak'])) {
    admin.push(
      { to: '/workspace/pengurusan/pengguna', label: t('Pengguna'), icon: Users, keywords: 'users peranan roles akaun' },
      { to: '/workspace/pengurusan/sesi', label: t('Sesi JPP'), icon: Building2, keywords: 'session legasi' },
      { to: '/workspace/pengurusan/nombor', label: t('Nombor rujukan'), icon: Hash, keywords: 'reference series format' },
      { to: '/workspace/pengurusan/dokumen', label: t('Jenis dokumen'), icon: FileClock, keywords: 'surat sijil templat jana letter certificate' },
      { to: '/workspace/pengurusan/kumpulan', label: t('Kumpulan penerima'), icon: KeyRound, keywords: 'groups nome' },
      { to: '/workspace/pengurusan/tetapan', label: t('Tetapan'), icon: Settings2, keywords: 'settings logo favicon jenama brand warna visibility halaman' },
    )
  }
  if (has(roles, ['suak', 'system_admin'])) admin.push({ to: '/workspace/pengurusan/audit', label: t('Log audit'), icon: ScrollText, keywords: 'audit log sejarah' })
  return [{ to: '/workspace', label: t('Papan Pemuka'), icon: BadgeCheck, keywords: 'utama home' }, boardPage(), ...workspaceModules(roles).filter((m) => m.to !== '/workspace'), ...admin]
}

export const publicSearchPages = (): { to: string; label: string; keywords?: string }[] => [
  { to: '/', label: t('Utama'), keywords: 'home' },
  ...PUBLIC_NAV.map((n) => ({ to: n.to, label: n.label })),
  { to: '/privasi', label: t('Dasar Privasi'), keywords: 'privacy' },
  { to: '/log-masuk', label: t('Log Masuk'), keywords: 'login sign in' },
]
