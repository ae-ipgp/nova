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

export const SESSION_STATUSES = ['planned', 'active', 'archived'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]
