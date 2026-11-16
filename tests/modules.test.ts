import { describe, expect, it } from 'vitest'
import { MODULES, workspacePath } from '@/config/modules'

describe('module registry', () => {
  it('defines exactly the eight blueprint modules in order', () => {
    expect(MODULES.map((m) => m.code)).toEqual(['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08'])
  })

  it('has unique slugs and paths', () => {
    const paths = MODULES.map(workspacePath)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('has unique requirement IDs across all modules', () => {
    const ids = MODULES.flatMap((m) => m.requirements.map((r) => r.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('carries the full requirement count from blueprint §07', () => {
    const counts = Object.fromEntries(MODULES.map((m) => [m.code, m.requirements.length]))
    expect(counts).toEqual({ M01: 7, M02: 10, M03: 10, M04: 9, M05: 7, M06: 8, M07: 8, M08: 9 })
  })

  it('never shows workspace modules to public visitors', () => {
    for (const m of MODULES) expect(m.navRoles).not.toContain('public')
  })

  it('limits Pengurusan to SUAK and System Administrator', () => {
    const admin = MODULES.find((m) => m.code === 'M08')!
    expect([...admin.navRoles].sort()).toEqual(['suak', 'system_admin'])
  })

  it('does not show content modules (e-Surat, NoMe) to System Administrator', () => {
    for (const code of ['M02', 'M04'] as const) {
      expect(MODULES.find((m) => m.code === code)!.navRoles).not.toContain('system_admin')
    }
  })
})
