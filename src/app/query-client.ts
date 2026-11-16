import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'

const NO_RETRY = new Set(['BAD_REQUEST', 'UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT', 'NOT_CONFIGURED'])

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Each gateway call costs ~1 s and Apps Script quota: cache aggressively.
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        retry: (count, err) => !(err instanceof ApiError && NO_RETRY.has(err.code)) && count < 2,
      },
      mutations: { retry: false },
    },
  })
}
