import { toCsv } from '@shared/csv'
import { SCHEMA_VERSION, SHEETS } from '@shared/schema'
import type { Services } from './services'
import type { TableStore } from './store'

/**
 * Backup export: one ZIP with a CSV per sheet (both workbooks), a manifest and restore notes.
 * Restore is deliberate and manual (import each CSV into its tab); nothing is ever deleted by an export.
 */
export function buildBackupZip(store: TableStore, services: Services, now: Date): string {
  const files: { name: string; content: string }[] = []
  const counts: Record<string, number> = {}
  for (const def of SHEETS) {
    const rows = store.all(def.name)
    counts[def.name] = rows.length
    files.push({ name: `${def.workbook}/${def.name}.csv`, content: toCsv(def.columns, rows.map((r) => def.columns.map((c) => r[c] ?? ''))) })
  }
  files.push({ name: 'manifest.json', content: JSON.stringify({ app: 'NoVA', schemaVersion: SCHEMA_VERSION, exportedAt: now.toISOString(), rows: counts }, null, 2) })
  files.push({
    name: 'BACA-SAYA.txt',
    content: [
      'NoVA — sandaran / backup',
      '',
      'BM: Setiap fail CSV ialah satu tab dalam hamparan "NoVA — Data" (folder data) atau "NoVA — Audit" (folder audit).',
      'Untuk memulihkan: buka hamparan, pilih tab, Fail > Import > Muat naik CSV > "Gantikan helaian semasa". Jangan ubah baris pengepala.',
      'Fail Drive (PDF, lampiran, imej) tidak termasuk dalam ZIP ini; ia kekal dalam folder "NoVA" di Drive.',
      '',
      'EN: Each CSV is one tab of the "NoVA — Data" or "NoVA — Audit" spreadsheet.',
      'To restore: open the spreadsheet, select the tab, File > Import > Upload CSV > "Replace current sheet". Keep the header row.',
      'Drive files (PDFs, attachments, images) are not in this ZIP; they stay in the "NoVA" Drive folder.',
      '',
      'Kandungan ini mengandungi data peribadi (e-mel, alasan kehadiran). Simpan dengan selamat. / Contains personal data. Store securely.',
    ].join('\n'),
  })
  return services.archive.zip(files)
}

/** Keeps the newest `keep` backup copies per workbook; returns the ones to delete. */
export function backupsToDelete(files: { id: string; name: string; createdMs: number }[], keep = 12): string[] {
  const byKind = new Map<string, typeof files>()
  for (const f of files) {
    const kind = f.name.startsWith('NoVA — Data') ? 'data' : f.name.startsWith('NoVA — Audit') ? 'audit' : ''
    if (!kind) continue // never touch anything we didn't name ourselves
    byKind.set(kind, [...(byKind.get(kind) ?? []), f])
  }
  return [...byKind.values()].flatMap((list) => [...list].sort((a, b) => b.createdMs - a.createdMs).slice(keep).map((f) => f.id))
}
