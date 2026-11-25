import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query'
import type { ActionMap, ActionName, DownloadResult } from '@shared/api-contract'
import { useAuth } from '@/app/auth-context'
import { useToast } from '@/components/ui/toast'
import { callApi, type ApiError } from '@/lib/api'
import { saveFile, toBlob } from '@/lib/files'

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

/** Downloads a file produced by the gateway (base64 → browser save). Errors surface as toasts. */
export function useDownloader() {
  const { getToken } = useAuth()
  const toast = useToast()
  return async <A extends ActionName>(action: A, payload: ActionMap[A]['payload'], pdfOpen = false): Promise<void> => {
    try {
      const result = (await callApi(action, payload, { token: await getToken() })) as unknown as DownloadResult
      if (pdfOpen && result.mimeType === 'application/pdf') window.open(URL.createObjectURL(toBlob(result)), '_blank', 'noopener')
      else saveFile(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Muat turun gagal.')
    }
  }
}
