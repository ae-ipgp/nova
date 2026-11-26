import { buildBackupZip } from '../backup'
import { requireActor } from './common'
import type { Handler } from './types'

export const backupHandlers: { 'admin.backup.export': Handler<'admin.backup.export'> } = {
  'admin.backup.export': {
    access: { kind: 'roles', roles: ['suak'] },
    write: false,
    run: (_p, ctx) => {
      requireActor(ctx)
      const base64 = buildBackupZip(ctx.store, ctx.services, ctx.now)
      // Audit rows are appended even for this read-style action: an export contains personal data.
      ctx.audit('backup.export', 'system', 'backup', null, { at: ctx.now.toISOString() })
      return { name: `nova-sandaran-${ctx.now.toISOString().slice(0, 10)}.zip`, mimeType: 'application/zip', base64 }
    },
  },
}
