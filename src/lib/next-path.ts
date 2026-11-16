const KEY = 'nova.auth.next'

/**
 * Only same-site, in-app paths are allowed as post-login destinations
 * (prevents open redirects such as `//evil.example` or `https://…`).
 */
export function safeNextPath(value: string | null | undefined, fallback = '/workspace'): string {
  if (!value || typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) < 0x20) return fallback
  return value
}

export function rememberNextPath(path: string): void {
  try {
    sessionStorage.setItem(KEY, safeNextPath(path))
  } catch {
    /* storage unavailable — fall back to the default destination */
  }
}

export function takeNextPath(): string {
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return safeNextPath(value)
  } catch {
    return '/workspace'
  }
}
