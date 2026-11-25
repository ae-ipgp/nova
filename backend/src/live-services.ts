import { DRIVE_FOLDERS } from '@shared/schema'
import { getProp, PROP } from './config'
import type { FileService, FolderKey, MailService, PdfService, Services } from './services'

/** Google-backed services (Drive, Mail, HTML→PDF). Only constructed inside Apps Script. */
function folder(key: FolderKey): GoogleAppsScript.Drive.Folder {
  const rootId = getProp(PROP.driveRootFolderId)
  if (!rootId) throw new Error('Drive not configured. Run setupSpreadsheet.')
  const root = DriveApp.getFolderById(rootId)
  const name = DRIVE_FOLDERS[key]
  const it = root.getFoldersByName(name)
  return it.hasNext() ? it.next() : root.createFolder(name)
}

const files: FileService = {
  save(key, name, mimeType, base64) {
    const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, name)
    return folder(key).createFile(blob).getId()
  },
  read(fileId) {
    try {
      const f = DriveApp.getFileById(fileId)
      if (f.isTrashed()) return null
      const blob = f.getBlob()
      return { id: fileId, name: f.getName(), mimeType: blob.getContentType() ?? 'application/octet-stream', base64: Utilities.base64Encode(blob.getBytes()) }
    } catch {
      return null
    }
  },
  copy(fileId, key, name) {
    return DriveApp.getFileById(fileId).makeCopy(name, folder(key)).getId()
  },
  trash(fileId) {
    try {
      DriveApp.getFileById(fileId).setTrashed(true)
    } catch {
      /* already gone */
    }
  },
}

const mail: MailService = {
  send(m) {
    try {
      MailApp.sendEmail({ to: m.to, subject: m.subject, body: m.text, htmlBody: m.html, name: m.senderName, replyTo: m.replyTo, noReply: !m.replyTo })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'Gagal menghantar' }
    }
  },
  remainingQuota: () => MailApp.getRemainingDailyQuota(),
}

const pdf: PdfService = {
  htmlToPdf(html) {
    const blob = Utilities.newBlob(html, 'text/html', 'document.html').getAs('application/pdf')
    return Utilities.base64Encode(blob.getBytes())
  },
}

export const liveServices: Services = { files, mail, pdf }
