import { getSheetDef, type SheetDef, type SheetName } from '@shared/schema'
import { conflict } from './errors'

export type Row = Record<string, string>

/**
 * Raw cell access for one tab. `read` returns every row including the header.
 * Implemented over SpreadsheetApp in production and over arrays in tests.
 */
export interface SheetIO {
  read(name: SheetName): unknown[][]
  append(name: SheetName, values: string[]): void
  /** rowNumber is 1-based and includes the header row. */
  write(name: SheetName, rowNumber: number, values: string[]): void
}

interface Loaded {
  header: string[]
  rows: Row[]
  /** id → 1-based sheet row number */
  rowNumbers: Map<string, number>
  nextRow: number
}

function cellToString(value: unknown): string {
  if (value instanceof Date) return value.toISOString()
  if (value === null || value === undefined) return ''
  return String(value)
}

/**
 * Row-object access to the schema's sheets with constraint enforcement.
 * One instance per request: each tab is read at most once and then served
 * from memory. Writes must run inside withLock() (the router guarantees it).
 */
export class TableStore {
  private readonly loaded = new Map<SheetName, Loaded>()
  private readonly io: SheetIO
  constructor(io: SheetIO) {
    this.io = io
  }

  private load(name: SheetName): Loaded {
    const cached = this.loaded.get(name)
    if (cached) return cached
    const values = this.io.read(name)
    const header = (values[0] ?? []).map((h) => cellToString(h).trim())
    const rows: Row[] = []
    const rowNumbers = new Map<string, number>()
    for (let i = 1; i < values.length; i++) {
      const raw = values[i]
      if (raw.every((c) => cellToString(c) === '')) continue
      const row: Row = {}
      header.forEach((h, c) => {
        if (h) row[h] = cellToString(raw[c])
      })
      rows.push(row)
      if (row.id) rowNumbers.set(row.id, i + 1)
    }
    const entry = { header, rows, rowNumbers, nextRow: values.length + 1 }
    this.loaded.set(name, entry)
    return entry
  }

  all(name: SheetName): Row[] {
    return this.load(name).rows.map((r) => ({ ...r }))
  }

  find(name: SheetName, predicate: (row: Row) => boolean): Row | undefined {
    const row = this.load(name).rows.find(predicate)
    return row ? { ...row } : undefined
  }

  get(name: SheetName, id: string): Row | undefined {
    return this.find(name, (r) => r.id === id)
  }

  insert(name: SheetName, row: Row): Row {
    const def = getSheetDef(name)
    const table = this.load(name)
    this.assertKnownColumns(def, row)
    this.assertHeader(def, table)
    const full: Row = Object.fromEntries(def.columns.map((c) => [c, row[c] ?? '']))
    this.assertUnique(def, table.rows, full)

    this.io.append(name, table.header.map((h) => full[h] ?? ''))
    table.rows.push(full)
    if (full.id) table.rowNumbers.set(full.id, table.nextRow)
    table.nextRow += 1
    return { ...full }
  }

  update(name: SheetName, id: string, patch: Row): Row {
    const def = getSheetDef(name)
    if (def.appendOnly && !def.mutableColumns) throw new Error(`${name} is append-only`)
    if (def.appendOnly) {
      const bad = Object.keys(patch).filter((k) => !def.mutableColumns!.includes(k))
      if (bad.length) throw new Error(`${name} is append-only; cannot change ${bad.join(', ')}`)
    }
    const table = this.load(name)
    this.assertKnownColumns(def, patch)
    if ('id' in patch && patch.id !== id) throw new Error('id cannot be changed')

    const index = table.rows.findIndex((r) => r.id === id)
    const rowNumber = table.rowNumbers.get(id)
    if (index < 0 || rowNumber === undefined) throw new Error(`${name}/${id} not found`)

    const next = { ...table.rows[index], ...patch }
    this.assertUnique(def, table.rows.filter((_, i) => i !== index), next)
    this.io.write(name, rowNumber, table.header.map((h) => next[h] ?? ''))
    table.rows[index] = next
    return { ...next }
  }

  private assertKnownColumns(def: SheetDef, row: Row) {
    for (const key of Object.keys(row)) {
      if (!def.columns.includes(key)) throw new Error(`Unknown column ${def.name}.${key}`)
    }
  }

  private assertHeader(def: SheetDef, table: Loaded) {
    const missing = def.columns.filter((c) => !table.header.includes(c))
    if (missing.length) throw new Error(`Sheet ${def.name} is missing columns ${missing.join(', ')}. Run setupSpreadsheet.`)
  }

  private assertUnique(def: SheetDef, others: Row[], candidate: Row) {
    for (const cols of def.unique ?? []) {
      const key = (r: Row) => cols.map((c) => (r[c] ?? '').toLowerCase()).join('\u0000')
      if (cols.some((c) => !candidate[c])) continue // empty values don't collide (e.g. unlinked user_id)
      const k = key(candidate)
      if (others.some((r) => key(r) === k)) throw conflict(`Rekod pendua: ${cols.join(' + ')} telah wujud.`)
    }
  }
}

/**
 * Text written to Sheets is stored as plain text. A leading = + - @ would make
 * Sheets evaluate it as a formula (formula injection, e.g. =IMPORTXML(...)),
 * so such values get a leading apostrophe, which Sheets strips on read.
 */
export function toCell(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}
