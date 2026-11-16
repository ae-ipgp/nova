import { SHEETS, type SheetName } from '@shared/schema'
import type { SheetIO } from '../../backend/src/store'

/** In-memory SheetIO: every tab starts with its schema header row. */
export class MemoryIO implements SheetIO {
  readonly data = new Map<SheetName, unknown[][]>()
  reads = 0
  constructor() {
    for (const def of SHEETS) this.data.set(def.name, [[...def.columns]])
  }
  read(name: SheetName) {
    this.reads++
    return this.data.get(name)!.map((r) => [...r])
  }
  append(name: SheetName, values: string[]) {
    this.data.get(name)!.push([...values])
  }
  write(name: SheetName, rowNumber: number, values: string[]) {
    this.data.get(name)![rowNumber - 1] = [...values]
  }
}
