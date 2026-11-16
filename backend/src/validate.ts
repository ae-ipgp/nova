import { badRequest } from './errors'

export type Payload = Record<string, unknown>

export function asPayload(value: unknown): Payload {
  if (value === undefined || value === null) return {}
  if (typeof value !== 'object' || Array.isArray(value)) throw badRequest('Data permintaan tidak sah.')
  return value as Payload
}

export function str(p: Payload, key: string, opts: { max?: number; required?: boolean; label?: string } = {}): string {
  const { max = 200, required = true, label = key } = opts
  const raw = p[key]
  if (raw === undefined || raw === null || raw === '') {
    if (required) throw badRequest(`${label} diperlukan.`)
    return ''
  }
  if (typeof raw !== 'string') throw badRequest(`${label} tidak sah.`)
  const value = raw.trim().replace(/\s+/g, ' ')
  if (required && !value) throw badRequest(`${label} diperlukan.`)
  if (value.length > max) throw badRequest(`${label} melebihi ${max} aksara.`)
  return value
}

export function oneOf<T extends string>(p: Payload, key: string, allowed: readonly T[], label = key): T {
  const value = p[key]
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) throw badRequest(`${label} tidak sah.`)
  return value as T
}

export function listOf<T extends string>(p: Payload, key: string, allowed: readonly T[], label = key): T[] {
  const value = p[key]
  if (!Array.isArray(value)) throw badRequest(`${label} tidak sah.`)
  const out = [...new Set(value)]
  for (const v of out) if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) throw badRequest(`${label} tidak sah.`)
  return out as T[]
}

/** Calendar date in YYYY-MM-DD that actually exists. */
export function isoDate(p: Payload, key: string, label = key): string {
  const value = str(p, key, { max: 10, label })
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) throw badRequest(`${label} mesti dalam format TTTT-BB-HH.`)
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  if (d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) throw badRequest(`${label} tidak wujud.`)
  return value
}
