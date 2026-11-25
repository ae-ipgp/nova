import { useQuery } from '@tanstack/react-query'
import type { SiteConfig } from '@shared/api-contract'
import { callApi } from '@/lib/api'
import { isApiConfigured } from '@/lib/env'

const EMPTY: SiteConfig = { settings: {}, activeSession: null }

/** Public site configuration (contacts, maintenance flag, texts). Cached; works signed out. */
export function useSite() {
  const q = useQuery({
    queryKey: ['gateway', 'site.config', {}],
    queryFn: ({ signal }) => callApi('site.config', {}, { signal }),
    enabled: isApiConfigured,
    staleTime: 5 * 60_000,
    retry: 1,
  })
  return { site: q.data ?? EMPTY, loaded: q.isSuccess, failed: q.isError }
}
