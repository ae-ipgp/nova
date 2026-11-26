import type { VisibilityState } from '@shared/domain'
import { useAuth } from '@/app/auth-context'
import { useSite } from '@/hooks/use-site'

/** HiPER-style page visibility (Tetapan): Diterbitkan / Akan datang / Dikunci / Disembunyikan. */
export type Scope = 'pub' | 'ws'

export const PUBLIC_PAGE_OF_PATH: Record<string, string> = {
  '/organisasi': 'organisasi',
  '/kehadiran': 'kehadiran',
  '/pengumuman': 'pengumuman',
  '/templat': 'templat',
  '/arkib': 'arkib',
  '/semak': 'semak',
}

/** Workspace slug → settings key (e-surat → e_surat). */
export const wsKey = (slug: string): string => slug.replace(/-/g, '_')

export function useVisibility() {
  const { site } = useSite()
  const { roles } = useAuth()
  const isSuak = roles.includes('suak')
  const stateOf = (scope: Scope, page: string): VisibilityState => {
    const v = site.settings[`vis_${scope}_${page}`]
    return v === 'soon' || v === 'locked' || v === 'hidden' ? v : 'published'
  }
  return {
    stateOf,
    /** Hidden pages disappear from navigation (SUAK still sees them, so they can be managed). */
    isListed: (scope: Scope, page: string) => stateOf(scope, page) !== 'hidden' || (scope === 'ws' && isSuak),
    isSuak,
  }
}
