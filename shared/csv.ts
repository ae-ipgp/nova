/**
 * CSV for administrative exports. Cells starting with = + - @ are prefixed with an
 * apostrophe so Excel/Sheets never evaluate them as formulas (formula injection).
 */
const guard = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v)

export function toCsv(headers: readonly string[], rows: readonly (readonly (string | number | null | undefined)[])[]): string {
  const cell = (v: string | number | null | undefined) => {
    const s = guard(v === null || v === undefined ? '' : String(v))
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  // BOM so Excel opens UTF-8 (Malay names) correctly.
  return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n'
}
