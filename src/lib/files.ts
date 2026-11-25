import type { DownloadResult, FilePayload } from '@shared/api-contract'
import { MAX_FILE_BYTES } from '@shared/files'

export class FileError extends Error {}

/** Reads a File as base64 (no data: prefix), enforcing the upload size cap up front. */
export function fileToPayload(file: File, maxBytes = MAX_FILE_BYTES): Promise<FilePayload> {
  if (file.size > maxBytes) return Promise.reject(new FileError(`Fail terlalu besar (maksimum ${(maxBytes / 1_000_000).toFixed(1)} MB).`))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new FileError('Fail tidak dapat dibaca.'))
    reader.onload = () => {
      const result = String(reader.result)
      resolve({ name: file.name, mimeType: file.type, base64: result.slice(result.indexOf(',') + 1) })
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Shrinks and centre-crops a photo to 4:3 before upload (max 1200 px, JPEG 0.82). HiPER's quota
 * crisis came from full-size pictures; this also keeps uploads inside the gateway's size cap.
 */
export async function shrinkImage(file: File, maxWidth = 1200): Promise<FilePayload> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new FileError('Hanya imej JPG, PNG atau WebP dibenarkan.')
  const bitmap = await createImageBitmap(file)
  const targetRatio = 4 / 3
  let sw = bitmap.width
  let sh = bitmap.height
  if (sw / sh > targetRatio) sw = Math.round(sh * targetRatio)
  else sh = Math.round(sw / targetRatio)
  const sx = Math.round((bitmap.width - sw) / 2)
  const sy = Math.round((bitmap.height - sh) / 2)
  const w = Math.min(maxWidth, sw)
  const h = Math.round(w / targetRatio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new FileError('Pelayar anda tidak menyokong pemprosesan imej.')
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, w, h)
  bitmap.close()
  const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.82))
  if (!blob) throw new FileError('Imej tidak dapat diproses.')
  return fileToPayload(new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }), 1_500_000)
}

export function toBlob(d: DownloadResult): Blob {
  const bin = atob(d.base64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: d.mimeType })
}

export function saveFile(d: DownloadResult): void {
  const url = URL.createObjectURL(toBlob(d))
  const a = document.createElement('a')
  a.href = url
  a.download = d.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function saveText(name: string, mimeType: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: `${mimeType};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export const dataUri = (d: DownloadResult): string => `data:${d.mimeType};base64,${d.base64}`
