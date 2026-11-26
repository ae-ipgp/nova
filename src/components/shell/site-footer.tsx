import { ExternalLink, Eye, MessageCircle, Phone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FullLogo } from '@/components/brand/logo'
import { PUBLIC_NAV, SITE } from '@/config/site'
import { useSite } from '@/hooks/use-site'
import { t } from '@/i18n'
import { callApi } from '@/lib/api'
import { Cms } from '@/lib/content'
import { isApiConfigured } from '@/lib/env'
import { telHref, whatsappHref } from '@/lib/phone'
import { PUBLIC_PAGE_OF_PATH, useVisibility } from '@/lib/visibility'

const CURRENT_YEAR = new Date().getFullYear()
const VISIT_FLAG = 'nova.visited'

/** Counts one visit per browser session (nothing about the visitor is stored) and returns the running total. */
function useVisitorCount(initial: number): number {
  const [total, setTotal] = useState<number | null>(null)
  useEffect(() => {
    if (!isApiConfigured) return
    let seen = false
    try {
      seen = sessionStorage.getItem(VISIT_FLAG) === '1'
      sessionStorage.setItem(VISIT_FLAG, '1')
    } catch {
      /* private mode: count once per page load */
    }
    if (seen) return
    callApi('public.visit', {})
      .then((r) => setTotal(r.total))
      .catch(() => undefined)
  }, [])
  return total ?? initial
}

export function SiteFooter() {
  const { site } = useSite()
  const { isListed } = useVisibility()
  const s = site.settings
  const visitors = useVisitorCount(Number(s.visitor_count) || 0)
  const socials = [
    ['Instagram', s.social_instagram],
    ['Facebook', s.social_facebook],
    ['TikTok', s.social_tiktok],
  ].filter(([, url]) => url)
  const phones = [
    { number: s.contact_phone, label: s.contact_phone_label || 'SUAK' },
    { number: s.contact_phone2, label: s.contact_phone2_label || t('Naib SUAK') },
  ].filter((p) => p.number)
  const [firstLine, ...restLines] = (s.contact_address ?? '').split('\n')

  return (
    <footer className="bg-navy-900 text-sky/80 print:hidden">
      <div className="container-content grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.4fr]">
        <div>
          <FullLogo />
          <p className="mt-5 max-w-sm font-display text-body-lg italic text-white">
            <Cms id="footer.tagline" ms="Berwibawa, berintegriti" />
          </p>
          <p className="mt-2 text-caption text-sky/70">
            <Cms id="footer.org" ms="Pejabat Setiausaha Agung Kehormat" />
          </p>
          <p className="mt-1 text-caption text-sky/60">{SITE.organisation}</p>
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
          </ul>
        </div>

        {(s.contact_address || s.contact_email || phones.length > 0 || s.jpp_portal_url || socials.length > 0) && (
          <div>
            <p className="mb-3 text-micro font-semibold uppercase tracking-[0.14em] text-white">{t('Hubungi')}</p>
            <address className="space-y-3 text-caption not-italic text-sky/85">
              {s.contact_address && (
                <p>
                  <strong className="font-bold text-white">{firstLine}</strong>
                  {restLines.length > 0 && <span className="whitespace-pre-line">{`\n${restLines.join('\n')}`}</span>}
                </p>
              )}
              {s.contact_email && (
                <p>
                  <a className="hover:text-white" href={`mailto:${s.contact_email}`}>
                    {s.contact_email}
                  </a>
                </p>
              )}
              {phones.map((p) => (
                <div key={p.label} className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0">
                    <p className="text-micro uppercase tracking-wide text-sky/60">{p.label}</p>
                    <p className="font-mono text-white">{p.number}</p>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={telHref(p.number)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/25 px-3 font-medium text-white hover:bg-white/10"
                      aria-label={t('Hubungi {label} melalui panggilan', { label: p.label })}
                    >
                      <Phone className="size-4" aria-hidden />
                      {t('Hubungi')}
                    </a>
                    <a
                      href={whatsappHref(p.number)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#25d366] px-3 font-semibold text-[#0b3d1f] hover:brightness-110"
                      aria-label={t('Hubungi {label} melalui WhatsApp', { label: p.label })}
                    >
                      <MessageCircle className="size-4" aria-hidden />
                      {t('WhatsApp')}
                    </a>
                  </div>
                </div>
              ))}
              {s.jpp_portal_url && (
                <p>
                  <a href={s.jpp_portal_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline">
                    {t('Portal rasmi JPP')}
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                </p>
              )}
              {socials.length > 0 && (
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                  {socials.map(([name, url]) => (
                    <li key={name}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                        {name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </address>
          </div>
        )}
      </div>
      <div className="border-t border-white/10">
        <div className="container-content flex flex-col gap-2 py-5 text-micro text-sky/60 sm:flex-row sm:items-center sm:justify-between sm:pr-24">
          <p>
            © {CURRENT_YEAR} {SITE.organisation}
            {t('. Hak cipta terpelihara.')}
          </p>
          {visitors > 0 && (
            <p className="inline-flex items-center gap-1.5" aria-label={t('Bilangan pelawat: {n}', { n: visitors.toLocaleString() })}>
              <Eye className="size-3.5" aria-hidden />
              {t('Pelawat')}: <span className="font-mono text-sky">{visitors.toLocaleString()}</span>
            </p>
          )}
          <p>{t('Pejabat Setiausaha Agung Kehormat')}</p>
        </div>
      </div>
    </footer>
  )
}
