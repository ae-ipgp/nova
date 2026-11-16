import { describe, expect, it } from 'vitest'
import { SHEETS, type SheetDef } from '@shared/schema'
import { ensureSheets, type RangeLike, type SheetLike, type SpreadsheetLike } from '../../backend/src/setup'

class FakeSheet implements SheetLike {
  cells: unknown[][] = [[]]
  frozen = 0
  getLastColumn() {
    return this.cells[0].length
  }
  getRange(row: number, column: number, _numRows: number, numColumns: number): RangeLike {
    return {
      getValues: () => [this.cells[row - 1].slice(column - 1, column - 1 + numColumns)],
      setValues: (values) => {
        values[0].forEach((v, i) => (this.cells[row - 1][column - 1 + i] = v))
      },
      setFontWeight: () => undefined,
    }
  }
  setFrozenRows(rows: number) {
    this.frozen = rows
  }
  header() {
    return this.cells[0]
  }
}

class FakeSpreadsheet implements SpreadsheetLike {
  sheets = new Map<string, FakeSheet>()
  getSheetByName(name: string) {
    return this.sheets.get(name) ?? null
  }
  insertSheet(name: string) {
    const s = new FakeSheet()
    this.sheets.set(name, s)
    return s
  }
}

const defs: SheetDef[] = [
  { name: 'a', workbook: 'data', columns: ['id', 'x'] },
  { name: 'b', workbook: 'data', columns: ['id', 'y', 'z'] },
]

describe('ensureSheets', () => {
  it('creates missing tabs with bold, frozen header rows', () => {
    const ss = new FakeSpreadsheet()
    const result = ensureSheets(ss, defs)
    expect(result.createdSheets).toEqual(['a', 'b'])
    expect(ss.sheets.get('b')!.header()).toEqual(['id', 'y', 'z'])
    expect(ss.sheets.get('a')!.frozen).toBe(1)
  })

  it('is idempotent', () => {
    const ss = new FakeSpreadsheet()
    ensureSheets(ss, defs)
    const second = ensureSheets(ss, defs)
    expect(second).toEqual({ createdSheets: [], addedColumns: {} })
  })

  it('appends new columns without moving or removing existing ones', () => {
    const ss = new FakeSpreadsheet()
    const sheet = ss.insertSheet('a')
    sheet.cells[0] = ['x', 'manual_note', 'id'] // reordered + an extra column added by hand
    const result = ensureSheets(ss, [{ name: 'a', workbook: 'data', columns: ['id', 'x', 'new_col'] }])
    expect(result.addedColumns).toEqual({ a: ['new_col'] })
    expect(sheet.header()).toEqual(['x', 'manual_note', 'id', 'new_col'])
  })

  it('creates every tab in the real schema', () => {
    const ss = new FakeSpreadsheet()
    ensureSheets(ss, SHEETS)
    expect([...ss.sheets.keys()]).toEqual(SHEETS.map((s) => s.name))
  })
})
