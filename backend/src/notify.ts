import { NOTIFY_KINDS, type NotifyKind } from '@shared/domain'
import { activeRolesOf, areasOf, type HandlerContext } from './context'
import { composeNotice } from './email'
import type { Services } from './services'
import { getBool, getSetting } from './settings'
import type { Row, TableStore } from './store'

/**
 * System emails (HiPER: submission receipts, decisions, reminders). They are best-effort: a mail failure
 * never fails the action that triggered it. Everything is HTML-escaped by composeNotice; one message per person.
 */
export interface NotifyEnv {
  store: TableStore
  services: Services
  now: Date
  uuid(): string
}

/** Keep some of the daily quota for NoMe notices. */
const QUOTA_RESERVE = 25

export const envOf = (ctx: HandlerContext): NotifyEnv => ({ store: ctx.store, services: ctx.services, now: ctx.now, uuid: ctx.uuid })

export function offKinds(profile: Row): string[] {
  try {
    const v = JSON.parse(profile.notify_off || '[]') as unknown
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const parseKinds = (value: unknown): NotifyKind[] => (Array.isArray(value) ? [...new Set(value.filter((k): k is NotifyKind => (NOTIFY_KINDS as readonly string[]).includes(k)))] : [])

export interface Message {
  subject: string
  body: string
  /** In-app path, appended to the configured app URL. */
  path?: string
  ctaText?: string
}

/** Returns true if a message was handed to the mail service. */
export function notify(env: NotifyEnv, kind: NotifyKind | 'access_changed', profile: Row | undefined, msg: Message): boolean {
  try {
    if (!profile || profile.account_status !== 'active' || !profile.email) return false
    const security = kind === 'access_changed'
    if (!security) {
      if (!getBool(env.store, 'notifications_enabled')) return false
      if (offKinds(profile).includes(kind)) return false
    }
    if (env.services.mail.remainingQuota() <= (security ? 5 : QUOTA_RESERVE)) return false
    const appUrl = getSetting(env.store, 'app_url').replace(/\/+$/, '')
    const mail = composeNotice({
      type: 'announcement',
      subject: msg.subject,
      body: msg.body,
      eventAt: '',
      location: '',
      link: '',
      orgName: getSetting(env.store, 'org_name'),
      recipientName: profile.full_name,
      label: 'Makluman NoVA',
      cta: appUrl && msg.path ? { text: msg.ctaText ?? 'Buka dalam NoVA', url: `${appUrl}${msg.path}` } : undefined,
    })
    const res = env.services.mail.send({ to: profile.email, subject: mail.subject, html: mail.html, text: mail.text, replyTo: getSetting(env.store, 'mail_reply_to') || undefined, senderName: getSetting(env.store, 'mail_sender_name') })
    env.store.insert('email_logs', { id: env.uuid(), notice_id: '', recipient_id: profile.id, event_type: res.ok ? `system:${kind}` : `system-failed:${kind}`, detail: res.ok ? '' : res.error.slice(0, 200), occurred_at: env.now.toISOString() })
    return res.ok
  } catch (err) {
    console.error(err)
    return false
  }
}

export function activeSuaks(store: TableStore): Row[] {
  return store.all('profiles').filter((p) => p.account_status === 'active' && activeRolesOf(store, p.id).includes('suak'))
}

/** SUAK plus anyone holding the OPR approval area. */
export function oprReviewers(store: TableStore): Row[] {
  return store.all('profiles').filter((p) => p.account_status === 'active' && (activeRolesOf(store, p.id).includes('suak') || areasOf(store, p.id).includes('opr.approve')))
}

const mytDate = (now: Date, offsetDays = 0): string => new Date(now.getTime() + 8 * 3600_000 + offsetDays * 86_400_000).toISOString().slice(0, 10)

/** Reminders at 3 days before, on the due date, then weekly while overdue; at most once per day per action. */
export function sendDailyReminders(env: NotifyEnv): number {
  const today = mytDate(env.now)
  let sent = 0
  for (const a of env.store.all('meeting_actions')) {
    if (a.status === 'done' || !a.due_date || a.last_reminded_on === today) continue
    const days = Math.round((Date.parse(`${a.due_date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
    if (!(days === 3 || days === 0 || (days < 0 && -days % 7 === 0))) continue
    const owner = env.store.get('profiles', a.owner_id)
    const meeting = env.store.get('meetings', a.meeting_id)
    const when = days > 0 ? `${days} hari lagi` : days === 0 ? 'hari ini' : `lewat ${-days} hari`
    const ok = notify(env, 'action_reminder', owner, {
      subject: `Peringatan tindakan: ${a.description}`,
      body: `Tarikh akhir tindakan anda: ${a.due_date} (${when}).\n\nTindakan: ${a.description}${meeting ? `\nMesyuarat: ${meeting.title}` : ''}`,
      path: `/workspace/e-mesyuarat/${a.meeting_id}`,
    })
    if (ok) {
      env.store.update('meeting_actions', a.id, { last_reminded_on: today })
      sent++
    }
  }
  return sent
}
