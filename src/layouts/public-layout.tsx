import { Construction } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { HelpBubble } from '@/components/brand/help-bubble'
import { PageGate } from '@/components/page-gate'
import { SearchProvider } from '@/components/search-palette'
import { OutageNotice } from '@/components/shell/outage-notice'
import { SiteFooter } from '@/components/shell/site-footer'
import { SiteHeader } from '@/components/shell/site-header'
import { UpdateBanner } from '@/components/shell/update-banner'
import { publicSearchPages } from '@/config/nav'
import { useSite } from '@/hooks/use-site'
import { t } from '@/i18n'
import { PUBLIC_PAGE_OF_PATH, useVisibility } from '@/lib/visibility'

/** Public site and sign-in page: shared header and footer around the page. */
export function PublicLayout() {
  const { site } = useSite()
  const { isListed } = useVisibility()
  const gate = PUBLIC_PAGE_OF_PATH[useLocation().pathname.replace(/\/$/, '')]

  return (
    <SearchProvider scope="public" pages={publicSearchPages().filter((p) => isListed('pub', PUBLIC_PAGE_OF_PATH[p.to] ?? ''))}>
      <div className="flex min-h-dvh flex-col bg-paper">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-input focus:bg-paper focus:px-4 focus:py-2 focus:text-heading">
          {t('Langkau ke kandungan')}
        </a>
        {site.settings.maintenance_mode === 'true' && (
          <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-caption text-ink">
            <Construction className="size-4 shrink-0 text-amber" aria-hidden />
            {site.settings.maintenance_message || t('NoVA sedang diselenggara. Sesetengah fungsi mungkin tidak tersedia.')}
          </div>
        )}
        <UpdateBanner />
        <OutageNotice />
        <SiteHeader />
        <main id="main" className="flex-1">
          {gate ? (
            <PageGate scope="pub" page={gate}>
              <Outlet />
            </PageGate>
          ) : (
            <Outlet />
          )}
        </main>
        <SiteFooter />
        <HelpBubble contact={{ email: site.settings.contact_email, phone: site.settings.contact_phone }} />
      </div>
    </SearchProvider>
  )
}
