import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/logo'
import { buttonVariants } from '@/components/ui/button-variants'
import { PUBLIC_NAV, SITE } from '@/config/site'
import { cn } from '@/lib/cn'

export function PublicLayout() {
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
    <div className="flex min-h-dvh flex-col bg-paper">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-white focus:px-4 focus:py-2 focus:text-navy">
        Langkau ke kandungan
      </a>

      <header
        className={cn(
          'sticky top-0 z-40 transition-colors',
          solid ? 'border-b border-line bg-paper/95 backdrop-blur' : 'bg-navy',
        )}
      >
        <div className="container-content flex h-header items-center justify-between gap-6">
          <Link to="/" aria-label={`${SITE.name} — laman utama`}>
            <Logo inverse={!solid} />
          </Link>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 lg:flex">
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-input px-3 py-2 text-caption font-medium transition-colors',
                    solid
                      ? isActive
                        ? 'bg-blue-100 text-blue'
                        : 'text-ink hover:text-blue'
                      : isActive
                        ? 'bg-white/10 text-white'
                        : 'text-sky/80 hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/log-masuk"
              className={cn(buttonVariants({ variant: solid ? 'primary' : 'inverse', size: 'sm' }), 'hidden sm:inline-flex')}
            >
              Log Masuk
            </Link>
            <button
              type="button"
              className={cn('grid size-10 place-items-center rounded-input lg:hidden', solid ? 'text-navy' : 'text-white')}
              aria-expanded={open}
              aria-controls="public-mobile-nav"
              aria-label={open ? 'Tutup menu' : 'Buka menu'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="public-mobile-nav" aria-label="Navigasi mudah alih" className="border-t border-line bg-paper lg:hidden">
            <ul className="container-content flex flex-col py-3">
              {PUBLIC_NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn('block rounded-input px-3 py-3 text-body font-medium', isActive ? 'bg-blue-100 text-blue' : 'text-ink')
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li className="mt-2 border-t border-line pt-3">
                <Link to="/log-masuk" onClick={() => setOpen(false)} className={cn(buttonVariants({ size: 'md' }), 'w-full')}>
                  Log Masuk
                </Link>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  )
}

const CURRENT_YEAR = new Date().getFullYear()

function PublicFooter() {
  return (
    <footer className="bg-navy-900 text-sky/80">
      <div className="container-content grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo inverse />
          <p className="mt-4 max-w-sm text-caption">{SITE.tagline}</p>
          <p className="mt-2 text-caption text-sky/60">{SITE.organisationLong}</p>
        </div>
        <div>
          <p className="mb-3 text-micro font-semibold uppercase tracking-[0.14em] text-white">Portal Awam</p>
          <ul className="space-y-2 text-caption">
            {PUBLIC_NAV.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-3 text-micro font-semibold uppercase tracking-[0.14em] text-white">Ruang Kerja</p>
          <ul className="space-y-2 text-caption">
            <li>
              <Link to="/log-masuk" className="hover:text-white">
                Log Masuk
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-content flex flex-col gap-2 py-5 text-micro text-sky/50 sm:flex-row sm:justify-between">
          <p>
            © {CURRENT_YEAR} {SITE.organisation}. Hak cipta terpelihara.
          </p>
          <p>Maklumat awam dipaparkan selepas pengesahan SUAK sahaja.</p>
        </div>
      </div>
    </footer>
  )
}
