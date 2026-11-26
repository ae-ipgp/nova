import type { HandlerMap } from './types'
import { adminConfigHandlers } from './admin-config'
import { adminSessionHandlers } from './admin-sessions'
import { adminUserHandlers } from './admin-users'
import { announcementHandlers } from './announcements'
import { authHandlers } from './auth'
import { backupHandlers } from './backup'
import { brandHandlers } from './brand'
import { contentHandlers } from './content'
import { dashboardHandlers } from './dashboard'
import { archiveHandlers, templateHandlers } from './documents-store'
import { meetingHandlers } from './meetings'
import { noticeHandlers } from './notices'
import { oprHandlers } from './opr'
import { publicHandlers } from './public'
import { referenceHandlers } from './reference'
import { searchHandlers } from './search'
import { systemHandlers, type SystemInfo } from './system'
import { visitHandlers } from './visit'

/** Every gateway action. HandlerMap is exhaustive over ActionMap, so a missing handler is a compile error. */
export function allHandlers(info: SystemInfo): HandlerMap {
  return {
    ...systemHandlers(info),
    ...publicHandlers,
    ...brandHandlers,
    ...contentHandlers,
    ...visitHandlers,
    ...searchHandlers,
    ...backupHandlers,
    ...authHandlers,
    ...dashboardHandlers,
    ...adminUserHandlers,
    ...adminSessionHandlers,
    ...adminConfigHandlers,
    ...referenceHandlers,
    ...meetingHandlers,
    ...noticeHandlers,
    ...templateHandlers,
    ...oprHandlers,
    ...archiveHandlers,
    ...announcementHandlers,
  }
}
