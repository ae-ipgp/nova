import type { DRIVE_FOLDERS } from '@shared/schema'

export type FolderKey = keyof typeof DRIVE_FOLDERS

export interface StoredFile {
  id: string
  name: string
  mimeType: string
  base64: string
}

/** Drive access. Implemented over DriveApp in production and in memory in tests. */
export interface FileService {
  save(folder: FolderKey, name: string, mimeType: string, base64: string): string
  read(fileId: string): StoredFile | null
  /** Copies into a folder (used for the public copy of a published document). */
  copy(fileId: string, folder: FolderKey, name: string): string
  trash(fileId: string): void
}

export interface MailMessage {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  senderName: string
}

export interface MailService {
  /** Sends ONE message to ONE recipient. Never throws; returns the failure reason instead. */
  send(message: MailMessage): { ok: true } | { ok: false; error: string }
  remainingQuota(): number
}

export interface PdfService {
  /** HTML (A4) → PDF, base64. */
  htmlToPdf(html: string): string
}

export interface Services {
  files: FileService
  mail: MailService
  pdf: PdfService
}
