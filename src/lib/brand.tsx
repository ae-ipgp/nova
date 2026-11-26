import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isHexColour } from '@shared/colour'
import { useSite } from '@/hooks/use-site'
import { callApi } from '@/lib/api'
import { dataUri } from '@/lib/files'

/**
 * Admin-controlled identity: logo, favicon and the two brand colours (Tetapan → Jenama).
 * Images are fetched once per brand version and cached on the device; colours are applied as CSS variables.
 */
interface Cached {
  version: string
  logo: string | null
  favicon: string | null
}
const KEY = 'nova.brand'
const DEFAULT_FAVICON = '/favicon.svg'

function load(): Cached | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Cached) : null
  } catch {
    return null
  }
}
function save(c: Cached) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c))
  } catch {
    /* too big or blocked: images are simply re-fetched next visit */
  }
}

const BrandContext = createContext<{ logo: string | null }>({ logo: null })
// oxlint-disable-next-line react/only-export-components
export const useBrand = () => useContext(BrandContext)

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.removeAttribute('type')
  link.href = href
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const { site, loaded } = useSite()
  const version = site.settings.brand_version ?? '0'
  const [brand, setBrand] = useState<Cached | null>(load)

  useEffect(() => {
    if (!loaded) return
    if (version === '0') {
      // oxlint-disable-next-line react/set-state-in-effect
      setBrand(null)
      try {
        localStorage.removeItem(KEY)
      } catch {
        /* ignore */
      }
      return
    }
    if (brand?.version === version) return
    let cancelled = false
    callApi('public.brand', {})
      .then((r) => {
        if (cancelled) return
        const next = { version: r.version, logo: r.logo ? dataUri(r.logo) : null, favicon: r.favicon ? dataUri(r.favicon) : null }
        save(next)
        setBrand(next)
      })
      .catch(() => {
        /* keep whatever is cached; branding is never worth blocking the page */
      })
    return () => {
      cancelled = true
    }
  }, [loaded, version, brand?.version])

  useEffect(() => {
    setFavicon(brand?.favicon ?? DEFAULT_FAVICON)
  }, [brand?.favicon])

  const { brand_primary: primary, brand_accent: accent } = site.settings
  useEffect(() => {
    const root = document.documentElement.style
    if (isHexColour(primary)) root.setProperty('--color-blue', primary)
    else root.removeProperty('--color-blue')
    if (isHexColour(accent)) root.setProperty('--color-champagne', accent)
    else root.removeProperty('--color-champagne')
  }, [primary, accent])

  const value = useMemo(() => ({ logo: brand?.logo ?? null }), [brand?.logo])
  return <BrandContext value={value}>{children}</BrandContext>
}
