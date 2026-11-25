import { escapeHtml } from '@shared/template-render'
import type { NoticeType } from '@shared/domain'
import { NOTICE_TYPE_LABELS } from '@shared/domain'

export interface ComposeInput {
  type: NoticeType
  subject: string
  body: string
  eventAt: string
  location: string
  link: string
  orgName: string
  recipientName: string
}

const myt = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kuala_Lumpur' }).format(d)
}

/**
 * One message per recipient. Everything user-written is HTML-escaped; no attachments or
 * documents are ever embedded (Blueprint §11, HiPER lessons: no phishing-like wording,
 * no auto-generated headers, full HTML document with a plain-text alternative).
 */
export function composeNotice(i: ComposeInput): { subject: string; html: string; text: string } {
  const details: [string, string][] = []
  if (i.eventAt) details.push(['Tarikh & masa', myt(i.eventAt)])
  if (i.location) details.push(['Lokasi', i.location])
  if (i.link) details.push(['Pautan', i.link])

  const bodyHtml = i.body
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px 0;line-height:1.55;">${escapeHtml(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
  const rows = details
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#63758a;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:4px 0;">${k === 'Pautan' ? `<a href="${escapeHtml(v)}">${escapeHtml(v)}</a>` : escapeHtml(v)}</td></tr>`)
    .join('')
  const html = `<!DOCTYPE html><html lang="ms"><head><meta charset="utf-8"><title>${escapeHtml(i.subject)}</title></head>
<body style="margin:0;padding:0;background:#f3f7fb;font-family:Arial,Helvetica,sans-serif;color:#172638;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #d9e2ec;border-radius:8px;">
<tr><td style="padding:16px 24px;background:#102d4f;color:#ffffff;font-size:13px;letter-spacing:1px;">${escapeHtml(i.orgName)} · ${escapeHtml(NOTICE_TYPE_LABELS[i.type])}</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0 0 16px 0;font-size:20px;color:#102d4f;">${escapeHtml(i.subject)}</h1>
<p style="margin:0 0 12px 0;">Kepada ${escapeHtml(i.recipientName)},</p>
${bodyHtml}
${rows ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 12px 0;font-size:14px;">${rows}</table>` : ''}
</td></tr>
<tr><td style="padding:14px 24px;border-top:1px solid #d9e2ec;font-size:12px;color:#63758a;">Dihantar oleh ${escapeHtml(i.orgName)} melalui NO.VA kepada ahli yang berdaftar. Anda boleh membalas e-mel ini untuk berhubung dengan Sekretariat.</td></tr>
</table></td></tr></table></body></html>`

  const text = [
    i.subject,
    '',
    `Kepada ${i.recipientName},`,
    '',
    i.body.trim(),
    ...(details.length ? ['', ...details.map(([k, v]) => `${k}: ${k === 'Tarikh & masa' ? myt(i.eventAt) : v}`)] : []),
    '',
    `— ${i.orgName} (NO.VA)`,
  ].join('\n')

  return { subject: i.subject, html, text }
}
