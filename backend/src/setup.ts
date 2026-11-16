import type { SheetDef } from '@shared/schema'

/* Structural subsets of the SpreadsheetApp types, so setup is testable with fakes. */
export interface RangeLike {
  getValues(): unknown[][]
  setValues(values: unknown[][]): unknown
  setFontWeight(weight: 'bold'): unknown
}
export interface SheetLike {
  getLastColumn(): number
  getRange(row: number, column: number, numRows: number, numColumns: number): RangeLike
  setFrozenRows(rows: number): void
}
export interface SpreadsheetLike {
  getSheetByName(name: string): SheetLike | null
  insertSheet(sheetName: string): SheetLike
}

export interface SetupResult {
  createdSheets: string[]
  addedColumns: Record<string, string[]>
}

/**
 * Idempotent schema "migration" for Sheets. Creates missing tabs and appends
 * missing header columns at the end. It NEVER deletes, renames or reorders
 * columns, so existing data is always preserved.
 */
export function ensureSheets(ss: SpreadsheetLike, defs: readonly SheetDef[]): SetupResult {
  const result: SetupResult = { createdSheets: [], addedColumns: {} }

  for (const def of defs) {
    let sheet = ss.getSheetByName(def.name)
    if (!sheet) {
      sheet = ss.insertSheet(def.name)
      result.createdSheets.push(def.name)
    }

    const lastCol = sheet.getLastColumn()
    const existing = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map((v) => String(v).trim()) : []
    const missing = def.columns.filter((c) => !existing.includes(c))

    if (missing.length) {
      const header = sheet.getRange(1, existing.length + 1, 1, missing.length)
      header.setValues([missing])
      header.setFontWeight('bold')
      result.addedColumns[def.name] = missing
    }
    sheet.setFrozenRows(1)
  }

  return result
}
