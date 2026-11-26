import { WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { useSite } from '@/hooks/use-site'
import { isApiConfigured } from '@/lib/env'
import { t } from '@/i18n'

const KEY = 'nova.contacts'
interface Contacts {
  email: string
  phone: string
}

function readCached(): Contacts | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Contacts) : null
  } catch {
    return null
  }
}

/**
 * Shown when the data server cannot be reached. The Secretariat contacts last seen on this device are
 * remembered, so people still know who to ask while everything else is unavailable.
 */
export function OutageNotice() {
  const { site, loaded, failed } = useSite()
  const email = site.settings.contact_email ?? ''
  const phone = site.settings.contact_phone ?? ''

  useEffect(() => {
    if (!loaded || (!email && !phone)) return
    try {
      localStorage.setItem(KEY, JSON.stringify({ email, phone } satisfies Contacts))
    } catch {
      /* storage unavailable */
    }
  }, [loaded, email, phone])

  if (!isApiConfigured || !failed || loaded) return null
  const c = readCached()
  return (
    <div role="alert" className="border-b border-amber/30 bg-amber-100">
      <p className="container-content flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-caption text-ink">
        <WifiOff className="size-4 shrink-0 text-amber" aria-hidden />
        <span>
          <strong className="font-semibold">{t('Sambungan ke pelayan data terganggu.')}</strong> {t('Maklumat tidak dapat dimuatkan buat masa ini. Sila cuba lagi sebentar lagi.')}
        </span>
        {c && (c.email || c.phone) && (
          <span>
            {t('Hubungi Sekretariat:')}{' '}
            {c.email && (
              <a className="font-semibold text-link underline" href={`mailto:${c.email}`}>
                {c.email}
              </a>
            )}
            {c.email && c.phone && ' · '}
            {c.phone}
          </span>
        )}
      </p>
    </div>
  )
}
