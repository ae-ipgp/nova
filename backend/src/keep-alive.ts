export type FetchLike = (
  url: string,
  options: { method: 'get'; headers: Record<string, string>; muteHttpExceptions: true },
) => { getResponseCode(): number }

/**
 * Supabase free-tier projects are paused after a period of inactivity, which
 * would stop logins. A daily time-driven trigger calls the Auth health endpoint
 * so the project always sees traffic.
 */
export function pingSupabase(fetch: FetchLike, supabaseUrl: string, anonKey: string): number {
  const url = `${supabaseUrl.replace(/\/+$/, '')}/auth/v1/health`
  return fetch(url, { method: 'get', headers: { apikey: anonKey }, muteHttpExceptions: true }).getResponseCode()
}
