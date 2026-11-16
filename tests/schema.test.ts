import { describe, expect, it } from 'vitest'
import { SHEETS } from '@shared/schema'

describe('sheet schema', () => {
  it('has unique tab names', () => {
    const names = SHEETS.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it.each(SHEETS.map((s) => [s.name, s] as const))('%s: constraint columns exist and columns are unique', (_n, def) => {
    const cols = new Set<string>(def.columns)
    expect(cols.size).toBe(def.columns.length)
    const referenced = [
      ...('unique' in def ? def.unique.flat() : []),
      ...('restricted' in def ? def.restricted : []),
      ...('publicColumns' in def ? def.publicColumns : []),
    ]
    for (const c of referenced) expect(cols, `${def.name}.${c}`).toContain(c)
  })

  it('never exposes restricted columns publicly', () => {
    for (const def of SHEETS) {
      if ('restricted' in def && 'publicColumns' in def) {
        for (const c of def.restricted) expect(def.publicColumns as readonly string[]).not.toContain(c)
      }
    }
  })

  it('keeps official reference numbers unique and append-only (LTR-05/06)', () => {
    const reg = SHEETS.find((s) => s.name === 'reference_register')!
    expect(reg.appendOnly).toBe(true)
    expect(reg.unique).toEqual(expect.arrayContaining([['reference_number'], ['request_id']]))
  })

  it('keeps audit and email logs append-only in the separate audit workbook', () => {
    for (const name of ['audit_logs', 'email_logs']) {
      const def = SHEETS.find((s) => s.name === name)!
      expect(def).toMatchObject({ workbook: 'audit', appendOnly: true })
    }
  })
})
