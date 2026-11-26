import { useQuery, type UseQueryOptions } from '@tanstack/react-query'
import type { ActionMap, ActionName } from '@shared/api-contract'
import { callApi } from '@/lib/api'
import { isApiConfigured } from '@/lib/env'

/** Anonymous read of a public gateway action. Only public actions work without a token. */
export function usePublic<A extends ActionName>(
  action: A,
  payload: ActionMap[A]['payload'] = {} as ActionMap[A]['payload'],
  options: Pick<UseQueryOptions<ActionMap[A]['result'], Error>, 'enabled' | 'placeholderData'> = {},
) {
  return useQuery<ActionMap[A]['result'], Error>({
    queryKey: ['gateway', action, payload],
    queryFn: ({ signal }) => callApi(action, payload, { signal }),
    enabled: isApiConfigured && (options.enabled ?? true),
    placeholderData: options.placeholderData,
    staleTime: 2 * 60_000,
    retry: 1,
  })
}
