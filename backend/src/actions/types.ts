import type { ActionMap, ActionName } from '@shared/api-contract'
import type { RoleKey } from '@shared/domain'
import type { HandlerContext } from '../context'

/**
 * - public:   no sign-in; must return only publicColumns of published rows
 * - identity: valid DELIMa sign-in, registration not required (auth.me only)
 * - roles:    active registered profile holding one of `roles` ('any' = any role)
 */
export type Access =
  | { kind: 'public' }
  | { kind: 'identity' }
  | { kind: 'roles'; roles: readonly RoleKey[] | 'any' }

export interface Handler<A extends ActionName> {
  access: Access
  /** Write handlers run inside the script lock with freshly read sheets. */
  write: boolean
  run(payload: unknown, ctx: HandlerContext): ActionMap[A]['result']
}

export type HandlerMap = { [A in ActionName]: Handler<A> }
