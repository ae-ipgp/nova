import { describe, expect, it } from 'vitest'
import { fromCell, TableStore, toCell } from '../../backend/src/store'
import { AppError } from '../../backend/src/errors'
import { MemoryIO } from './memory-io'

describe('TableStore', () => {
  it('inserts rows in header order and reads them back by column name', () => {
    const io = new MemoryIO()
    const store = new TableStore(io)
    store.insert('roles', { id: 'r1', role_key: 'suak', role_name: 'SUAK' })
    expect(io.data.get('roles')![1]).toEqual(['r1', 'suak', 'SUAK'])
    expect(new TableStore(io).all('roles')).toEqual([{ id: 'r1', role_key: 'suak', role_name: 'SUAK' }])
  })

  it('reads by header name even when columns were reordered by hand', () => {
    const io = new MemoryIO()
    io.data.set('roles', [['role_name', 'id', 'role_key'], ['SUAK', 'r1', 'suak']])
    expect(new TableStore(io).get('roles', 'r1')).toEqual({ id: 'r1', role_key: 'suak', role_name: 'SUAK' })
  })

  it('reads each tab once per request', () => {
    const io = new MemoryIO()
    const store = new TableStore(io)
    store.all('roles')
    store.find('roles', () => true)
    store.insert('roles', { id: 'r1', role_key: 'member', role_name: 'Ahli' })
    expect(io.reads).toBe(1)
  })

  it('enforces unique constraints case-insensitively on insert and update', () => {
    const store = new TableStore(new MemoryIO())
    store.insert('profiles', { id: 'p1', email: 'a@moe-dl.edu.my' })
    store.insert('profiles', { id: 'p2', email: 'b@moe-dl.edu.my' })
    expect(() => store.insert('profiles', { id: 'p3', email: 'A@MOE-DL.EDU.MY' })).toThrow(AppError)
    expect(() => store.update('profiles', 'p2', { email: 'a@moe-dl.edu.my' })).toThrow(/pendua/)
  })

  it('treats empty unique values as non-colliding', () => {
    const store = new TableStore(new MemoryIO())
    store.insert('profiles', { id: 'p1', email: 'a@moe-dl.edu.my', user_id: '' })
    expect(() => store.insert('profiles', { id: 'p2', email: 'b@moe-dl.edu.my', user_id: '' })).not.toThrow()
  })

  it('updates the right row in place', () => {
    const io = new MemoryIO()
    const store = new TableStore(io)
    store.insert('jpp_sessions', { id: 's1', name: 'A', status: 'active' })
    store.insert('jpp_sessions', { id: 's2', name: 'B', status: 'planned' })
    store.update('jpp_sessions', 's1', { status: 'archived' })
    expect(new TableStore(io).all('jpp_sessions').map((r) => r.status)).toEqual(['archived', 'planned'])
  })

  it('refuses to edit append-only sheets, unknown columns and id changes', () => {
    const store = new TableStore(new MemoryIO())
    store.insert('audit_logs', { id: 'a1', action: 'x' })
    expect(() => store.update('audit_logs', 'a1', { action: 'y' })).toThrow(/append-only/)
    expect(() => store.insert('roles', { id: 'r', nope: 'x' })).toThrow(/Unknown column/)
    store.insert('roles', { id: 'r1', role_key: 'suak' })
    expect(() => store.update('roles', 'r1', { id: 'r2' })).toThrow(/cannot be changed/)
  })

  it('tells the owner to run setup when a sheet lacks columns', () => {
    const io = new MemoryIO()
    io.data.set('user_roles', [['id', 'user_id', 'role_key']])
    expect(() => new TableStore(io).insert('user_roles', { id: 'x' })).toThrow(/Run setupSpreadsheet/)
  })
})

describe('toCell', () => {
  it.each(['=IMPORTXML("http://x")', '+1', '-1', '@a', '\t=1'])('neutralises formula-like %s', (v) => {
    expect(toCell(v)).toBe(`'${v}`)
  })
  it('leaves ordinary text alone', () => {
    expect(toCell('Mesyuarat AMT 1/2026')).toBe('Mesyuarat AMT 1/2026')
  })
  it('round-trips escaped text, whether or not Sheets keeps the apostrophe', () => {
    for (const v of ['=SUM(1,2)', '-5 hari', '+60123456789', '@ali']) expect(fromCell(toCell(v))).toBe(v)
    expect(fromCell('=SUM(1,2)')).toBe('=SUM(1,2)')
    expect(fromCell("Ali's report")).toBe("Ali's report")
  })
  it('un-escapes when loading rows', () => {
    const io = new MemoryIO()
    io.data.set('roles', [['id', 'role_key', 'role_name'], ['r1', 'x', toCell('-Dash')]])
    expect(new TableStore(io).get('roles', 'r1')?.role_name).toBe('-Dash')
  })
})
