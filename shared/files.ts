/** Upload rules for the Drive-backed file store (ADR-0001). Files travel as base64 inside the gateway's 10 MB request cap. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const MAX_IMAGE_BYTES = 1_500_000

export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const
export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}
export const extensionFor = (mime: string): string => EXT[mime] ?? 'bin'

/** Decoded size of a base64 string without decoding it. */
export function base64Bytes(b64: string): number {
  const clean = b64.replace(/\s/g, '')
  const pad = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0
  return Math.floor((clean.length * 3) / 4) - pad
}

export const isBase64 = (s: string): boolean => /^[A-Za-z0-9+/]*={0,2}$/.test(s.replace(/\s/g, ''))

/** Strip path characters and control characters; keep the visible name short. */
export function safeFileName(name: string, fallback: string): string {
  let cleaned = ''
  for (const ch of name) if (ch.charCodeAt(0) >= 0x20 && !'\\/<>:"|?*'.includes(ch)) cleaned += ch
  const base = cleaned.trim().slice(0, 100)
  return base || fallback
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** First `n` decoded bytes (no atob in Apps Script). */
export function base64Head(b64: string, n = 12): number[] {
  const clean = b64.replace(/\s/g, '').replace(/=+$/, '')
  const out: number[] = []
  let bits = 0
  let acc = 0
  for (let i = 0; i < clean.length && out.length < n; i++) {
    const v = B64.indexOf(clean[i])
    if (v < 0) break
    acc = (acc << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((acc >> bits) & 0xff)
    }
  }
  return out
}

/** The declared MIME type must match the real content (a renamed .exe is not a PDF). */
export function matchesMagic(mime: string, b64: string): boolean {
  const h = base64Head(b64, 12)
  const eq = (...bytes: number[]) => bytes.every((b, i) => h[i] === b)
  switch (mime) {
    case 'application/pdf':
      return eq(0x25, 0x50, 0x44, 0x46)
    case 'image/png':
      return eq(0x89, 0x50, 0x4e, 0x47)
    case 'image/jpeg':
      return eq(0xff, 0xd8, 0xff)
    case 'image/webp':
      return eq(0x52, 0x49, 0x46, 0x46) && h[8] === 0x57 && h[9] === 0x45 && h[10] === 0x42 && h[11] === 0x50
    default:
      // Office Open XML files are ZIP containers
      return mime.startsWith('application/vnd.openxmlformats-officedocument.') && eq(0x50, 0x4b)
  }
}
