/**
 * Letter/certificate bodies use {{placeholder}} fields. Rendering is plain text →
 * escaped HTML, so user-entered values can never inject markup into a generated PDF.
 */
export interface FieldDef {
  key: string
  label: string
  required: boolean
  type: 'text' | 'textarea' | 'date'
  max?: number
}

export const BUILT_IN_KEYS = ['rujukan', 'tarikh', 'pemohon', 'jawatan', 'sesi'] as const

export function extractPlaceholders(body: string): string[] {
  const found: string[] = []
  const re = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) if (!found.includes(m[1])) found.push(m[1])
  return found
}

export function renderPlain(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g, (_m, key: string) => values[key] ?? '')
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/** Escaped, paragraph-aware HTML from plain text (blank line = paragraph, newline = <br>). */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

export function parseFields(json: string): FieldDef[] {
  try {
    const raw = JSON.parse(json) as unknown
    if (!Array.isArray(raw)) return []
    return raw.flatMap((f): FieldDef[] => {
      if (!f || typeof f !== 'object') return []
      const o = f as Record<string, unknown>
      if (typeof o.key !== 'string' || !/^[a-z][a-z0-9_]*$/.test(o.key) || typeof o.label !== 'string') return []
      const type = o.type === 'textarea' || o.type === 'date' ? o.type : 'text'
      return [{ key: o.key, label: o.label.slice(0, 80), required: o.required !== false, type, max: typeof o.max === 'number' ? Math.min(o.max, 2000) : undefined }]
    })
  } catch {
    return []
  }
}
