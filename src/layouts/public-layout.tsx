import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button-variants'
import { PUBLIC_NAV, SITE } from '@/config/site'
import { publicSearchPages } from '@/config/nav'
import { PageGate } from '@/components/page-gate'
import { SearchProvider, SearchTrigger } from '@/components/search-palette'
import { PrefsMenu } from '@/components/shell/prefs-menu'
import { OutageNotice } from '@/components/shell/outage-notice'
import { UpdateBanner } from '@/components/shell/update-banner'
import { PUBLIC_PAGE_OF_PATH, useVisibility } from '@/lib/visibility'
import { HelpBubble } from '@/components/brand/help-bubble'
import { useSite } from '@/hooks/use-site'
import { Construction } from 'lucide-react'
import { cn } from '@/lib/cn'
import { t } from '@/i18n'

export function PublicLayout() {
  const { site } = useSite()
  const { isListed } = useVisibility()
  const nav = PUBLIC_NAV.filter((n) => isListed('pub', PUBLIC_PAGE_OF_PATH[n.to] ?? ''))
  const gate = PUBLIC_PAGE_OF_PATH[useLocation().pathname.replace(/\/$/, '')]
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { pathname } = useLocation()
  const isHome = pathname === '/'

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = !isHome || scrolled || open

  return (
    <SearchProvider scope="public" pages={publicSearchPages().filter((p) => isListed('pub', PUBLIC_PAGE_OF_PATH[p.to] ?? ''))}>
      <div className="flex min-h-dvh flex-col bg-paper">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-paper focus:px-4 focus:py-2 focus:text-heading"
        >
          {t('Langkau ke kandungan')}
        </a>

        {site.settings.maintenance_mode === 'true' && (
          <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-caption text-ink">
            <Construction className="size-4 shrink-0 text-amber" aria-hidden />
            {site.settings.maintenance_message || t('NO.VA sedang diselenggara. Sesetengah fungsi mungkin tidak tersedia.')}
          </div>
        )}
        <UpdateBanner />
      <OutageNotice />
        <header className={cn('sticky top-0 z-40 transition-colors', solid ? 'border-b border-line bg-paper/95 backdrop-blur' : 'bg-navy')}>
          <div className="container-content flex h-header items-center justify-between gap-6">
            <Link to="/" aria-label={t('{name} — laman utama', { name: SITE.name })}>
              <Logo inverse={!solid} />
            </Link>

            <nav aria-label={t('Navigasi utama')} className="hidden items-center gap-1 lg:flex">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-input px-3 py-2 text-caption font-medium transition-colors',
                      solid
                        ? isActive
                          ? 'bg-blue-100 text-link'
                          : 'text-ink hover:text-link'
                        : isActive
                          ? 'bg-white/10 text-white'
                          : 'text-sky/80 hover:text-white',
                    )
                  }
                >
                  {t(item.label)}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1 sm:gap-2">
              <SearchTrigger compact className={solid ? 'text-heading' : 'text-white hover:text-white'} />
              <PrefsMenu className={solid ? '' : 'text-white hover:bg-white/10 hover:text-white'} />
              <Link
                to="/log-masuk"
                className={cn(
                  buttonVariants({
                    variant: solid ? 'primary' : 'inverse',
                    size: 'sm',
                  }),
                  'hidden sm:inline-flex',
                )}
              >
                {t('Log Masuk')}
              </Link>
              <button
                type="button"
                className={cn('grid size-10 place-items-center rounded-input lg:hidden', solid ? 'text-heading' : 'text-white')}
                aria-expanded={open}
                aria-controls="public-mobile-nav"
                aria-label={open ? t('Tutup menu') : t('Buka menu')}
                onClick={() => setOpen((v) => !v)}
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>

          {open && (
            <nav id="public-mobile-nav" aria-label={t('Navigasi mudah alih')} className="border-t border-line bg-paper lg:hidden">
              <ul className="container-content flex flex-col py-3">
                {nav.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) => cn('block rounded-input px-3 py-3 text-body font-medium', isActive ? 'bg-blue-100 text-link' : 'text-ink')}
                    >
                      {t(item.label)}
                    </NavLink>
                  </li>
                ))}
                <li className="mt-2 border-t border-line pt-3">
                  <Link to="/log-masuk" onClick={() => setOpen(false)} className={cn(buttonVariants({ size: 'md' }), 'w-full')}>
                    {t('Log Masuk')}
                  </Link>
                </li>
              </ul>
            </nav>
          )}
        </header>

        <main id="main" className="flex-1">
          {gate ? (
            <PageGate scope="pub" page={gate}>
              <Outlet />
            </PageGate>
          ) : (
            <Outlet />
          )}
        </main>

        <PublicFooter />
        <HelpBubble
          contact={{
            email: site.settings.contact_email,
            phone: site.settings.contact_phone,
          }}
        />
      </div>
    </SearchProvider>
  )
}

const CURRENT_YEAR = new Date().getFullYear()

function PublicFooter() {
  const { site } = useSite()
  const s = site.settings
  const { isListed } = useVisibility()
  const socials = [
    ['Instagram', s.social_instagram],
    ['Facebook', s.social_facebook],
    ['TikTok', s.social_tiktok],
  ].filter(([, url]) => url)
  return (
    <footer className="bg-navy-900 text-sky/80">
      <div className="container-content grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo inverse />
          <p className="mt-4 max-w-sm text-caption">{SITE.tagline}</p>
          <p className="mt-2 text-caption text-sky/60">{SITE.organisationLong}</p>
          {(s.contact_email || s.contact_phone || s.contact_address) && (
            <address className="mt-4 space-y-1 text-caption not-italic text-sky/80">
              {s.contact_email && (
                <p>
                  <a className="hover:text-white" href={`mailto:${s.contact_email}`}>
                    {s.contact_email}
                  </a>
                </p>
              )}
              {s.contact_phone && <p>{s.contact_phone}</p>}
              {s.contact_address && <p className="whitespace-pre-line">{s.contact_address}</p>}
            </address>
          )}
        </div>
        <div>
          <p className="mb-3 text-micro font-semibold uppercase tracking-[0.14em] text-white">{t('Portal Awam')}</p>
          <ul className="space-y-2 text-caption">
            {PUBLIC_NAV.filter((n) => isListed('pub', PUBLIC_PAGE_OF_PATH[n.to] ?? '')).map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white">
                  {t(item.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-micro font-semibold uppercase tracking-[0.14em] text-white">{t('Ruang Kerja')}</p>
          <ul className="space-y-2 text-caption">
            <li>
              <Link to="/log-masuk" className="hover:text-white">
                {t('Log Masuk')}
              </Link>
            </li>
            <li>
              <Link to="/privasi" className="hover:text-white">
                {t('Dasar Privasi')}
              </Link>
            </li>
            {socials.map(([name, url]) => (
              <li key={name}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  {name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-content flex flex-col gap-2 py-5 text-micro text-sky/50 sm:flex-row sm:justify-between">
          <p>
            © {CURRENT_YEAR} {SITE.organisation}{t('. Hak cipta terpelihara.')}
          </p>
          <p>{t('Maklumat awam dipaparkan selepas pengesahan SUAK sahaja.')}</p>
        </div>
      </div>
    </footer>
  )
}
