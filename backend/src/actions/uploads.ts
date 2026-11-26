import type { FilePayload } from '@shared/api-contract'
import { base64Bytes, DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES, isBase64, MAX_FILE_BYTES, MAX_IMAGE_BYTES, matchesMagic, safeFileName } from '@shared/files'
import { badRequest } from '../errors'
import type { Payload } from '../validate'

/**
 * Validates an uploaded file payload: size, allow-listed type, base64 integrity and
 * that the bytes really are what the type claims (Blueprint §11).
 */
export function readFile(p: Payload, key: string, opts: { images?: boolean; required?: boolean; maxBytes?: number } = {}): FilePayload | null {
  const raw = p[key]
  if (raw === undefined || raw === null) {
    if (opts.required) throw badRequest('Fail diperlukan.')
    return null
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) throw badRequest('Fail tidak sah.')
  const f = raw as Record<string, unknown>
  if (typeof f.mimeType !== 'string' || typeof f.base64 !== 'string' || typeof f.name !== 'string') throw badRequest('Fail tidak sah.')
  const allowed = (opts.images ? IMAGE_MIME_TYPES : DOCUMENT_MIME_TYPES) as readonly string[]
  if (!allowed.includes(f.mimeType)) throw badRequest(opts.images ? 'Hanya imej JPG, PNG atau WebP dibenarkan.' : 'Jenis fail tidak dibenarkan (PDF, DOCX, XLSX, PPTX, PNG, JPG, WebP sahaja).')
  const base64 = f.base64.replace(/\s/g, '')
  if (!base64 || !isBase64(base64)) throw badRequest('Kandungan fail tidak sah.')
  const limit = opts.maxBytes ?? (opts.images ? MAX_IMAGE_BYTES : MAX_FILE_BYTES)
  if (base64Bytes(base64) > limit) throw badRequest(`Fail terlalu besar (maksimum ${(limit / 1_000_000).toFixed(1)} MB).`)
  if (!matchesMagic(f.mimeType, base64)) throw badRequest('Kandungan fail tidak sepadan dengan jenisnya.')
  return { name: safeFileName(f.name, 'fail'), mimeType: f.mimeType, base64 }
}
