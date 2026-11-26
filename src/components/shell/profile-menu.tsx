import { LayoutDashboard, LogOut, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { t } from '@/i18n'
import { ROLE_LABELS } from '@/types/domain'
import { Avatar } from './avatar'
import { EmailPrefsDialog } from './email-prefs-dialog'
import { Popover } from './popover'

/** The signed-in person's name used for greetings: the Google account's full name, else the registered name. */
// oxlint-disable-next-line react/only-export-components
export function useDisplayName(): string {
  const { state, identity } = useAuth()
  if (state.status !== 'signed_in') return ''
  return identity?.name ?? state.me.profile?.fullName ?? state.me.email
}

export function ProfileMenu() {
  const { state, roles, signOut, mode, identity } = useAuth()
  const name = useDisplayName()
  const navigate = useNavigate()
  const [emailOpen, setEmailOpen] = useState(false)
  if (state.status !== 'signed_in') return null
  const { me } = state
  return (
    <>
      <Popover
        label={t('Menu profil')}
        panelClassName="w-72"
        trigger={({ open, toggle }) => (
          <button type="button" onClick={toggle} aria-expanded={open} aria-haspopup="dialog" aria-label={t('Menu profil: {name}', { name })} className="rounded-full ring-2 ring-transparent transition hover:ring-blue">
            <Avatar name={name} src={identity?.avatarUrl} />
          </button>
        )}
      >
        {(close) => (
          <>
            <div className="flex items-center gap-3 border-b border-line px-3 pb-3 pt-2">
              <Avatar name={name} src={identity?.avatarUrl} className="size-12" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-heading">{name}</p>
                <p className="truncate font-mono text-micro text-slate">{me.email}</p>
              </div>
            </div>
            <div className="px-3 py-2">
              {me.membership && <p className="text-micro text-slate">{[me.membership.position, me.membership.bureau].filter(Boolean).join(' · ')}</p>}
              <p className="mt-1.5 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <span key={r} className="rounded bg-soft px-1.5 py-0.5 text-micro font-semibold text-link">
                    {t(ROLE_LABELS[r])}
                  </span>
                ))}
              </p>
            </div>
            {roles.length > 0 && (
              <Link to="/workspace" onClick={close} className="flex w-full items-center gap-2 rounded-input px-3 py-2 text-left text-caption text-ink hover:bg-soft">
                <LayoutDashboard className="size-4" aria-hidden />
                {t('Ruang Kerja')}
              </Link>
            )}
            <button
              type="button"
              disabled={mode !== 'live'}
              onClick={() => {
                close()
                setEmailOpen(true)
              }}
              className="flex w-full items-center gap-2 rounded-input px-3 py-2 text-left text-caption text-ink hover:bg-soft disabled:opacity-50"
            >
              <Mail className="size-4" aria-hidden />
              {t('Pilihan e-mel')}
            </button>
            <button
              type="button"
              disabled={mode !== 'live'}
              onClick={async () => {
                close()
                await signOut()
                navigate('/', { replace: true })
              }}
              className="flex w-full items-center gap-2 rounded-input px-3 py-2 text-left text-caption text-ink hover:bg-soft disabled:opacity-50"
            >
              <LogOut className="size-4" aria-hidden />
              {t('Log keluar')}
            </button>
          </>
        )}
      </Popover>
      <EmailPrefsDialog open={emailOpen} onClose={() => setEmailOpen(false)} />
    </>
  )
}
