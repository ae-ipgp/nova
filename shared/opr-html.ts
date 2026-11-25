import type { OprContent } from './api-contract'
import type { OprStyle } from './domain'
import { escapeHtml } from './template-render'

/**
 * One-Page Report layout (e-OPR). Shared by the web preview (iframe) and the server PDF so
 * "what you preview is what you export" (OPR-03/04). Table-based, conservative CSS so it
 * survives Apps Script's HTML→PDF converter; sized for A4 and Letter.
 */
/**
 * One-page budget, measured by rendering worst-case reports in Chromium (A4, 12 mm margins) with ~12%
 * headroom for the different renderer Apps Script uses. Photos take real space, so the allowance
 * drops once any photo is attached.
 */
export const OPR_NARRATIVE_LIMIT_TEXT_ONLY = 4000
export const OPR_NARRATIVE_LIMIT_WITH_PHOTOS = 2500
export const narrativeLimit = (imageCount: number): number => (imageCount > 0 ? OPR_NARRATIVE_LIMIT_WITH_PHOTOS : OPR_NARRATIVE_LIMIT_TEXT_ONLY)

export const EMPTY_OPR: OprContent = {
  programName: '', organiser: '', date: '', time: '', venue: '', background: '', objectives: '', execution: '', participantCount: '', targetGroup: '',
  parties: '', outcome: '', impact: '', images: [], strengths: '', issues: '', suggestions: '', preparedBy: '',
}

export const OPR_TEXT_LIMITS: Record<Exclude<keyof OprContent, 'images'>, number> = {
  programName: 120, organiser: 120, date: 10, time: 40, venue: 150, background: 900, objectives: 700, execution: 900, participantCount: 20,
  targetGroup: 150, parties: 300, outcome: 700, impact: 500, strengths: 400, issues: 400, suggestions: 400, preparedBy: 100,
}

const NARRATIVE_KEYS = ['background', 'objectives', 'execution', 'outcome', 'impact', 'strengths', 'issues', 'suggestions'] as const
export const narrativeLength = (c: OprContent): number => NARRATIVE_KEYS.reduce((n, k) => n + c[k].length, 0)

interface Theme {
  accent: string
  head: string
  headText: string
  font: string
  rule: string
  box: string
}
const THEMES: Record<OprStyle, Theme> = {
  corporate: { accent: '#1769aa', head: '#102d4f', headText: '#ffffff', font: 'Arial, Helvetica, sans-serif', rule: '#d9e2ec', box: '#f3f7fb' },
  editorial: { accent: '#102d4f', head: '#ffffff', headText: '#102d4f', font: 'Georgia, "Times New Roman", serif', rule: '#d4b77a', box: '#ffffff' },
  infographic: { accent: '#2c86d9', head: '#2c86d9', headText: '#ffffff', font: 'Arial, Helvetica, sans-serif', rule: '#dcebfa', box: '#dcebfa' },
}

const fmtDate = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return new Intl.DateTimeFormat('ms-MY', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(Date.UTC(+m[1], +m[2] - 1, +m[3]))
}

const para = (t: string): string => escapeHtml(t).replace(/\n/g, '<br>')

export interface OprRenderOptions {
  style: OprStyle
  /** fileId → data: URI (already shrunk). Missing images are skipped. */
  images: Record<string, string>
  orgName: string
  /** "DRAF" watermark text, or '' for the final copy. */
  watermark: string
  footer: string
}

export function renderOprHtml(c: OprContent, o: OprRenderOptions): string {
  const t = THEMES[o.style]
  const section = (title: string, text: string): string =>
    text.trim()
      ? `<div style="margin:0 0 6pt 0;"><div style="font-size:8pt;font-weight:bold;letter-spacing:0.6pt;text-transform:uppercase;color:${t.accent};border-bottom:0.75pt solid ${t.rule};padding-bottom:1.5pt;margin-bottom:2.5pt;">${escapeHtml(title)}</div><div style="font-size:8.6pt;line-height:1.38;">${para(text)}</div></div>`
      : ''
  const meta = (label: string, v: string): string =>
    v ? `<td style="padding:0 10pt 0 0;font-size:8pt;vertical-align:top;"><span style="color:${o.style === 'editorial' ? '#63758a' : 'inherit'};opacity:0.85;">${escapeHtml(label)}</span><br><b style="font-size:9pt;">${escapeHtml(v)}</b></td>` : ''

  const imgs = c.images.filter((i) => o.images[i.fileId])
  const w = imgs.length <= 2 ? 170 : imgs.length === 3 ? 150 : 120
  const imageRow = imgs.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" style="margin:2pt 0 6pt 0;"><tr>${imgs
        .map(
          (i) => `<td align="center" valign="top" style="padding:0 3pt;"><img src="${o.images[i.fileId]}" width="${w}" style="width:${w}pt;border:0.5pt solid ${t.rule};"><div style="font-size:6.8pt;color:#63758a;line-height:1.25;padding-top:1.5pt;">${escapeHtml(i.caption)}${i.credit ? ` <i>(${escapeHtml(i.credit)})</i>` : ''}</div></td>`,
        )
        .join('')}</tr></table>`
    : ''

  const header =
    o.style === 'editorial'
      ? `<div style="border-bottom:2pt solid ${t.rule};padding-bottom:5pt;margin-bottom:6pt;"><div style="font-size:7.5pt;letter-spacing:1.4pt;text-transform:uppercase;color:#63758a;">${escapeHtml(o.orgName)} · Laporan Satu Halaman</div><div style="font-size:17pt;font-weight:bold;color:${t.headText};line-height:1.15;padding-top:2pt;">${escapeHtml(c.programName || 'Tajuk program')}</div></div>`
      : `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:6pt;"><tr><td style="background:${t.head};color:${t.headText};padding:7pt 9pt;"><div style="font-size:7.5pt;letter-spacing:1.2pt;text-transform:uppercase;opacity:0.85;">${escapeHtml(o.orgName)} · Laporan Satu Halaman</div><div style="font-size:15pt;font-weight:bold;line-height:1.15;padding-top:2pt;">${escapeHtml(c.programName || 'Tajuk program')}</div></td></tr></table>`

  const metaRow = `<table cellpadding="0" cellspacing="0" style="margin-bottom:6pt;"><tr>${meta('Tarikh', fmtDate(c.date))}${meta('Masa', c.time)}${meta('Tempat', c.venue)}${meta('Penganjur', c.organiser)}</tr></table>`

  const stat = (label: string, v: string): string =>
    v ? `<td style="background:${t.box};padding:4pt 8pt;border:0.5pt solid ${t.rule};"><div style="font-size:12pt;font-weight:bold;color:${t.accent};">${escapeHtml(v)}</div><div style="font-size:6.8pt;color:#63758a;text-transform:uppercase;">${escapeHtml(label)}</div></td><td width="5"></td>` : ''
  const stats =
    c.participantCount || c.targetGroup
      ? `<table cellpadding="0" cellspacing="0" style="margin-bottom:6pt;"><tr>${stat('Peserta', c.participantCount)}${stat('Kumpulan sasaran', c.targetGroup)}</tr></table>`
      : ''
  const parties = c.parties ? section('Pihak terlibat', c.parties) : ''

  const body = `
    ${header}${metaRow}${stats}
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="52%" valign="top" style="padding-right:8pt;">${section('Latar belakang', c.background)}${section('Objektif', c.objectives)}${section('Pelaksanaan', c.execution)}${parties}</td>
      <td width="48%" valign="top">${section('Hasil / pencapaian', c.outcome)}${section('Impak', c.impact)}${section('Kekuatan', c.strengths)}${section('Isu / cabaran', c.issues)}${section('Cadangan penambahbaikan', c.suggestions)}</td>
    </tr></table>
    ${imageRow}
    <table width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:0.75pt solid ${t.rule};padding-top:3pt;font-size:7pt;color:#63758a;">Disediakan oleh: <b>${escapeHtml(c.preparedBy)}</b> · ${escapeHtml(o.footer)}</td></tr></table>`

  const wm = o.watermark
    ? `<div style="text-align:center;font-size:8pt;font-weight:bold;color:#b64a4a;letter-spacing:2pt;padding-bottom:3pt;">${escapeHtml(o.watermark)}</div>`
    : ''
  return `<!DOCTYPE html><html lang="ms"><head><meta charset="utf-8"><title>${escapeHtml(c.programName || 'OPR')}</title><style>@page{size:A4;margin:12mm}body{margin:0;font-family:${t.font};color:#172638;}table{border-collapse:collapse}</style></head><body><div style="position:relative;width:100%;max-width:186mm;margin:0 auto;">${wm}${body}</div></body></html>`
}
