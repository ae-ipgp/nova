import { describe, expect, it } from 'vitest'
import { safeNextPath } from '@/lib/next-path'
import { resolveMode } from '@/app/auth-context'

describe('safeNextPath', () => {
  it.each(['/workspace', '/workspace/e-surat?tab=1', '/kehadiran'])('keeps in-app path %s', (p) => {
    expect(safeNextPath(p)).toBe(p)
  })
  it.each(['//evil.example', '/\\evil.example', 'https://evil.example', 'javascript:alert(1)', '', null, undefined, '/a\nb'])(
    'rejects %s',
    (p) => {
      expect(safeNextPath(p as string)).toBe('/workspace')
    },
  )
})

describe('resolveMode', () => {
  it('is live when configured, preview only in development, otherwise unconfigured', () => {
    expect(resolveMode(true, false)).toBe('live')
    expect(resolveMode(false, true)).toBe('preview')
    expect(resolveMode(false, false)).toBe('unconfigured')
  })
})
