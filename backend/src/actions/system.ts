import type { Handler } from './types'
import { findActiveSession, toPublicSession } from './sessions'

export interface SystemInfo {
  schemaVersion(): number | null
  configured(): boolean
}

export function systemHandlers(info: SystemInfo): {
  'system.health': Handler<'system.health'>
  'session.active': Handler<'session.active'>
} {
  return {
    'system.health': {
      access: { kind: 'public' },
      write: false,
      run: (_p, ctx) => ({
        status: 'ok',
        schemaVersion: info.schemaVersion(),
        configured: info.configured(),
        time: ctx.now.toISOString(),
      }),
    },
    'session.active': {
      access: { kind: 'public' },
      write: false,
      run: (_p, ctx) => {
        const row = findActiveSession(ctx.store)
        return row ? toPublicSession(row) : null
      },
    },
  }
}
