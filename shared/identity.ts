/**
 * Sign-in identity rules (ADR-0002). Users sign in with their DELIMa Google
 * account; only this Google Workspace domain is accepted.
 *
 * The domain check is necessary but NOT sufficient: the gateway also requires
 * the email to belong to an active profile registered by SUAK.
 */
export const ALLOWED_EMAIL_DOMAIN = 'moe-dl.edu.my'

/** Exact-domain match. Rejects look-alikes such as `x@evil-moe-dl.edu.my` or `x@moe-dl.edu.my.evil.com`. */
export function isAllowedEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false
  const normalised = email.trim().toLowerCase()
  const at = normalised.lastIndexOf('@')
  if (at <= 0 || normalised.indexOf('@') !== at) return false
  return normalised.slice(at + 1) === ALLOWED_EMAIL_DOMAIN
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}
