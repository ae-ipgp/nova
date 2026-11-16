import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import type { ActionMap, ActionName } from '@shared/api-contract'
import { useAuth } from '@/app/auth-context'
import { callApi, type ApiError } from '@/lib/api'

export const gatewayKey = (action: ActionName, payload?: unknown) => ['gateway', action, payload ?? {}] as const

/** Reads through the gateway with the current user's token. */
export function useGatewayQuery<A extends ActionName>(
  action: A,
  payload: ActionMap[A]['payload'],
  options: Omit<UseQueryOptions<ActionMap[A]['result'], ApiError>, 'queryKey' | 'queryFn'> = {},
) {
  const { getToken } = useAuth()
  return useQuery<ActionMap[A]['result'], ApiError>({
    queryKey: gatewayKey(action, payload),
    queryFn: async ({ signal }) => callApi(action, payload, { token: await getToken(), signal }),
    ...options,
  })
}

/**
 * Writes through the gateway. `invalidate` lists actions whose cached reads
 * become stale on success.
 */
export function useGatewayMutation<A extends ActionName>(action: A, invalidate: readonly ActionName[] = []) {
  const { getToken, refresh } = useAuth()
  const queryClient = useQueryClient()
  return useMutation<ActionMap[A]['result'], ApiError, ActionMap[A]['payload']>({
    mutationFn: async (payload) => callApi(action, payload, { token: await getToken() }),
    onSuccess: async () => {
      await Promise.all(invalidate.map((a) => queryClient.invalidateQueries({ queryKey: ['gateway', a] })))
      // Role or session changes may affect the signed-in user's own access.
      await refresh()
    },
  })
}
