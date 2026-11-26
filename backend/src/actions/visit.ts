import type { Handler } from './types'

/**
 * Footer visitor counter. The browser calls this once per browser session. It only adds one to a number:
 * nothing about the visitor (IP, browser, identity) is read or stored.
 */
export const visitHandlers: { 'public.visit': Handler<'public.visit'> } = {
  'public.visit': {
    access: { kind: 'public' },
    write: true,
    run: (_p, ctx) => {
      const existing = ctx.store.find('system_settings', (r) => r.key === 'visitor_count')
      let total = 1
      if (existing) {
        const current = Number(JSON.parse(existing.value_json || '"0"')) || 0
        total = current + 1
        ctx.store.update('system_settings', existing.id || 'visitor_count', { value_json: JSON.stringify(String(total)), updated_by: 'public', updated_at: ctx.now.toISOString() })
      } else {
        ctx.store.insert('system_settings', { id: 'visitor_count', key: 'visitor_count', value_json: JSON.stringify('1'), updated_by: 'public', updated_at: ctx.now.toISOString() })
      }
      return { total }
    },
  },
}
