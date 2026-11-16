import { createContext, useContext, useState, type ReactNode } from 'react'
import type { RoleKey } from '@/types/domain'

/**
 * PHASE 0 ONLY — lets reviewers preview navigation per role before real
 * authentication exists. This is not authorisation and grants no access.
 * Replace with the Supabase session/role provider in Phase 1.
 */
interface PreviewRoleValue {
  role: RoleKey
  setRole: (role: RoleKey) => void
}

const PreviewRoleContext = createContext<PreviewRoleValue | null>(null)

export function PreviewRoleProvider({ children, initialRole = 'suak' }: { children: ReactNode; initialRole?: RoleKey }) {
  const [role, setRole] = useState<RoleKey>(initialRole)
  return <PreviewRoleContext value={{ role, setRole }}>{children}</PreviewRoleContext>
}

// oxlint-disable-next-line react/only-export-components
export function usePreviewRole(): PreviewRoleValue {
  const ctx = useContext(PreviewRoleContext)
  if (!ctx) throw new Error('usePreviewRole must be used inside PreviewRoleProvider')
  return ctx
}
