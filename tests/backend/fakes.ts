import type { FileService, MailMessage, MailService, PdfService, Services, StoredFile } from '../../backend/src/services'

export class FakeServices implements Services {
  readonly store = new Map<string, StoredFile>()
  readonly trashed = new Set<string>()
  readonly sent: MailMessage[] = []
  readonly rendered: string[] = []
  failFor = new Set<string>()
  quota = 100
  pdfShouldFail = false
  private n = 0

  readonly files: FileService = {
    save: (folder, name, mimeType, base64) => {
      const id = `file-${folder}-${++this.n}`
      this.store.set(id, { id, name, mimeType, base64 })
      return id
    },
    read: (id) => (this.trashed.has(id) ? null : (this.store.get(id) ?? null)),
    copy: (id, folder, name) => {
      const src = this.store.get(id)!
      const copy = `file-${folder}-${++this.n}`
      this.store.set(copy, { ...src, id: copy, name })
      return copy
    },
    trash: (id) => void this.trashed.add(id),
  }

  readonly mail: MailService = {
    send: (m) => {
      if (this.failFor.has(m.to)) return { ok: false, error: 'Invalid address' }
      this.sent.push(m)
      this.quota--
      return { ok: true }
    },
    remainingQuota: () => this.quota,
  }

  readonly pdf: PdfService = {
    htmlToPdf: (html) => {
      if (this.pdfShouldFail) throw new Error('renderer down')
      this.rendered.push(html)
      return btoa(`%PDF-1.4 fake ${html.length}`)
    },
  }
}

/** Tiny valid-looking files for upload tests. */
export const PDF_B64 = btoa('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n')
export const PNG_B64 = btoa('\x89PNG\r\n\x1a\n' + 'x'.repeat(40))
export const file = (name: string, mimeType: string, base64: string) => ({ name, mimeType, base64 })
