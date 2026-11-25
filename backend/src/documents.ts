import { escapeHtml, renderPlain, textToHtml } from '@shared/template-render'

/**
 * HTML builders for server-rendered PDFs. Apps Script's HTML→PDF converter supports
 * only basic CSS, so layouts use tables and inline-safe properties (no flex/grid).
 * Content is sized to fit both A4 and Letter (≤ 180 mm wide, ≤ 245 mm tall).
 * No salutation, closing phrase or motto is added here: official wording belongs to the approved
 * template body (Blueprint §16 #7), never to the code.
 */
const BASE_CSS = `
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #172638; margin: 0; }
  p { margin: 0 0 8pt 0; line-height: 1.45; }
  h1, h2, h3 { margin: 0; }
  table { border-collapse: collapse; }
  td, th { vertical-align: top; }
  .muted { color: #63758a; }
  .small { font-size: 8.5pt; }
`

export function wrapHtml(title: string, css: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${BASE_CSS}${css}</style></head><body>${body}</body></html>`
}

export interface LetterInput {
  letterheadLines: string[]
  referenceNumber: string
  dateText: string
  recipient: string
  subject: string
  bodyTemplate: string
  values: Record<string, string>
  signatoryName: string
  signatoryTitle: string
  verifyLine: string
  isDemo: boolean
  kind: 'letter' | 'certificate'
}

export function renderLetterHtml(i: LetterInput): string {
  const lines = i.letterheadLines.filter(Boolean)
  const head = lines
    .map((l, idx) => `<div style="${idx === 0 ? 'font-size:15pt;font-weight:bold;color:#102d4f;' : 'font-size:9.5pt;color:#63758a;'}">${escapeHtml(l)}</div>`)
    .join('')
  const demo = i.isDemo
    ? `<div style="border:1.5pt solid #b64a4a;color:#b64a4a;padding:5pt 8pt;margin-bottom:10pt;font-size:9pt;font-weight:bold;text-align:center;">CONTOH (DEMO) — TEMPLAT BELUM DILULUSKAN SUAK. BUKAN DOKUMEN RASMI.</div>`
    : ''
  const body = textToHtml(renderPlain(i.bodyTemplate, i.values))
  if (i.kind === 'certificate') {
    return wrapHtml(
      i.subject,
      '',
      `<div style="border:3pt double #102d4f;padding:26pt 30pt;">
        ${demo}
        <div style="text-align:center;">${head}<div style="height:18pt"></div>
        <div style="font-size:22pt;font-weight:bold;color:#102d4f;letter-spacing:1pt;">${escapeHtml(i.subject)}</div>
        <div style="height:14pt"></div></div>
        <div style="text-align:center;font-size:12pt;">${body}</div>
        <div style="height:22pt"></div>
        <div style="text-align:center;"><div style="border-top:1pt solid #172638;width:210pt;margin:0 auto;padding-top:4pt;font-weight:bold;">${escapeHtml(i.signatoryName)}</div>
        <div>${escapeHtml(i.signatoryTitle)}</div></div>
        <div style="height:14pt"></div>
        <div class="small muted" style="text-align:center;">Rujukan: ${escapeHtml(i.referenceNumber)} · ${escapeHtml(i.dateText)}<br>${escapeHtml(i.verifyLine)}</div>
      </div>`,
    )
  }
  return wrapHtml(
    i.subject,
    '',
    `<div style="padding:6pt 4pt;">
      ${demo}
      <table width="100%"><tr><td style="border-bottom:2pt solid #102d4f;padding-bottom:8pt;">${head}</td></tr></table>
      <div style="height:10pt"></div>
      <table width="100%"><tr>
        <td><b>Rujukan Kami:</b> ${escapeHtml(i.referenceNumber)}</td>
        <td style="text-align:right;"><b>Tarikh:</b> ${escapeHtml(i.dateText)}</td></tr></table>
      <div style="height:10pt"></div>
      <p style="white-space:pre-line;">${escapeHtml(i.recipient)}</p>
      <p style="font-weight:bold;text-transform:uppercase;margin-top:10pt;">${escapeHtml(i.subject)}</p>
      ${body}
      <div style="height:22pt"></div>
      <p><b>${escapeHtml(i.signatoryName)}</b><br>${escapeHtml(i.signatoryTitle)}</p>
      <div style="height:12pt"></div>
      <table width="100%"><tr><td style="border-top:0.75pt solid #d9e2ec;padding-top:5pt;" class="small muted">
        Dokumen ini dijana oleh NO.VA selepas kelulusan SUAK dan tidak memerlukan tandatangan basah. ${escapeHtml(i.verifyLine)}</td></tr></table>
    </div>`,
  )
}
