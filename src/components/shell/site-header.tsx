import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/app/auth-context'
import { Logo } from '@/components/brand/logo'
import { SearchTrigger } from '@/components/search-palette'
import { buttonVariants } from '@/components/ui/button-variants'
import { PUBLIC_NAV, SITE } from '@/config/site'
import { t } from '@/i18n'
import { cn } from '@/lib/cn'
import { EditModeButton } from '@/lib/content'
import { PUBLIC_PAGE_OF_PATH, useVisibility } from '@/lib/visibility'
import { ROLE_KEYS, ROLE_LABELS, type RoleKey } from '@/types/domain'
import { PrefsMenu } from './prefs-menu'
import { ProfileMenu } from './profile-menu'

/**
 * The one header used by the public site, the sign-in page and the workspace.
 * On the home page it starts transparent over the hero and turns solid when you scroll.
 */
export function SiteHeader({ variant = 'public' }: { variant?: 'public' | 'workspace' }) {
  const { isListed } = useVisibility()
  const { state, roles } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const nav = PUBLIC_NAV.filter((n) => isListed('pub', PUBLIC_PAGE_OF_PATH[n.to] ?? ''))
  const solid = variant === 'workspace' || pathname !== '/' || scrolled || open
  const signedIn = state.status === 'signed_in'
  const session = state.status === 'signed_in' ? state.me.activeSession : null

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const ink = solid ? '' : 'text-white hover:bg-white/10 hover:text-white'
  return (
    <header className={cn('sticky top-0 z-40 transition-colors print:hidden', solid ? 'border-b border-line bg-paper/95 shadow-soft backdrop-blur' : 'bg-navy')}>
      <div className="container-content flex h-header items-center justify-between gap-4">
        <Link to={variant === 'workspace' ? '/workspace' : '/'} aria-label={`${SITE.name} — ${t('laman utama')}`} className="shrink-0">
          <Logo inverse={!solid} />
        </Link>

        <nav aria-label={t('Navigasi utama')} className={cn('items-center gap-1', variant === 'workspace' ? 'hidden 2xl:flex' : 'hidden lg:flex')}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn('whitespace-nowrap rounded-full px-3 py-2 text-caption font-medium transition-colors', solid ? (isActive ? 'bg-soft text-link' : 'text-ink hover:bg-soft hover:text-link') : isActive ? 'bg-white/10 text-white' : 'text-sky/80 hover:text-white')
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <SearchTrigger compact className={cn('2xl:hidden', ink)} />
          <SearchTrigger className={cn('hidden 2xl:inline-flex', ink)} />
          <EditModeButton className={solid ? '' : 'border-white/30 text-white hover:border-white hover:text-white'} />
          {variant === 'workspace' && session && (
            <span className="mr-1 hidden max-w-[16rem] items-center gap-2 truncate rounded-full border border-line bg-ice px-3 py-1 text-micro font-medium text-slate xl:inline-flex" title={t('Sesi JPP aktif')}>
              <span className="size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />
              <span className="truncate">{session.name}</span>
            </span>
          )}
          {variant === 'workspace' && <RolePreviewSelect />}
          <PrefsMenu className={ink} />
          {signedIn ? (
            <>
              {variant === 'public' && roles.length > 0 && (
                <Link to="/workspace" className={cn(buttonVariants({ variant: solid ? 'primary' : 'inverse', size: 'sm' }), 'hidden md:inline-flex')}>
                  {t('Ruang Kerja')}
                </Link>
              )}
              <ProfileMenu />
            </>
          ) : (
            <Link to="/log-masuk" className={cn(buttonVariants({ variant: solid ? 'primary' : 'inverse', size: 'sm' }), 'hidden sm:inline-flex')}>
              {t('Log Masuk')}
            </Link>
          )}
          {variant === 'public' && (
            <button
              type="button"
              className={cn('grid size-10 place-items-center rounded-full lg:hidden', solid ? 'text-heading' : 'text-white')}
              aria-expanded={open}
              aria-controls="public-mobile-nav"
              aria-label={open ? t('Tutup menu') : t('Buka menu')}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
        </div>
      </div>

      {variant === 'public' && open && (
        <nav id="public-mobile-nav" aria-label={t('Navigasi mudah alih')} className="border-t border-line bg-paper lg:hidden">
          <ul className="container-content flex flex-col py-3">
            {nav.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => cn('block rounded-input px-3 py-3 text-body font-medium', isActive ? 'bg-soft text-link' : 'text-ink')}>
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
            {!signedIn && (
              <li className="mt-2 border-t border-line pt-3">
                <Link to="/log-masuk" onClick={() => setOpen(false)} className={cn(buttonVariants({ size: 'md' }), 'w-full')}>
                  {t('Log Masuk')}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}

/** Development preview only: shows the navigation as another role (not access control). */
function RolePreviewSelect() {
  const { mode, roles, setPreviewRole } = useAuth()
  if (mode !== 'preview') return null
  return (
    <div className="flex items-center gap-2 rounded-input border border-dashed border-amber/60 bg-amber-100/60 py-1 pr-1 pl-2.5">
      <span className="hidden text-micro font-semibold uppercase tracking-wide text-amber sm:inline" aria-hidden>
        {t('Pratonton')}
      </span>
      <select aria-label={t('Pratonton navigasi sebagai peranan')} value={roles[0]} onChange={(e) => setPreviewRole?.(e.target.value as RoleKey)} className="h-8 rounded-[6px] border border-line bg-paper px-2 text-caption text-heading">
        {ROLE_KEYS.filter((r) => r !== 'public').map((r) => (
          <option key={r} value={r}>
            {t(ROLE_LABELS[r])}
          </option>
        ))}
      </select>
    </div>
  )
}
