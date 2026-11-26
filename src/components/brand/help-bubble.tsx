import { HelpCircle, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Mascot } from '@/components/brand/mascot'
import { FAQ } from '@/config/faq'
import { MASCOT_NAME } from '@/config/mascot'
import { cn } from '@/lib/cn'
import { t } from '@/i18n'

/** Small floating helper with prepared answers (no AI). Keyboard accessible; Escape closes it. */
/** `raised` lifts the bubble above the phone dock in the workspace. */
export function HelpBubble({ contact, raised = false }: { contact?: { email?: string; phone?: string }; raised?: boolean }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<number | null>(null)
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    panel.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="print:hidden">
      {open && (
        <div
          ref={panel}
          role="dialog"
          aria-labelledby={titleId}
          tabIndex={-1}
          data-raised={raised}
          className="fixed right-4 bottom-20 z-40 flex max-h-[70dvh] max-lg:data-[raised=true]:bottom-40 w-[min(22rem,calc(100vw-2rem))] flex-col rounded-card border border-line bg-paper shadow-float focus:outline-none"
        >
          <header className="flex items-center gap-3 border-b border-line px-4 py-3">
            <Mascot face="happy" size={36} fallback={<HelpCircle className="size-6 text-link" aria-hidden />} />
            <h2 id={titleId} className="flex-1 text-body font-bold">
              {t('Tanya')} {MASCOT_NAME}
            </h2>
            <button type="button" onClick={() => setOpen(false)} className="grid size-8 place-items-center rounded-input text-slate hover:bg-ice" aria-label={t('Tutup bantuan')}>
              <X className="size-4" />
            </button>
          </header>
          <ul className="overflow-y-auto p-2">
            {FAQ.map((f, i) => (
              <li key={f.q}>
                <button
                  type="button"
                  aria-expanded={active === i}
                  onClick={() => setActive(active === i ? null : i)}
                  className={cn('w-full rounded-input px-3 py-2.5 text-left text-caption font-semibold text-heading hover:bg-ice', active === i && 'bg-blue-100')}
                >
                  {t(f.q)}
                </button>
                {active === i && (
                  <div className="px-3 pb-3 text-caption text-slate">
                    <p>{t(f.a)}</p>
                    {f.to && (
                      <Link to={f.to.href} onClick={() => setOpen(false)} className="mt-2 inline-block font-semibold text-link hover:underline">
                        {t(f.to.label)} →
                      </Link>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {(contact?.email || contact?.phone) && (
            <footer className="border-t border-line px-4 py-3 text-micro text-slate">
              {t('Perlu bantuan lanjut?')} {contact.email && <a href={`mailto:${contact.email}`} className="font-semibold text-link">{contact.email}</a>} {contact.phone}
            </footer>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? t('Tutup bantuan') : t('Buka bantuan: tanya {MASCOT_NAME}', { MASCOT_NAME: MASCOT_NAME })}
        data-raised={raised}
        className="fixed right-4 bottom-4 z-40 grid size-14 max-lg:data-[raised=true]:bottom-24 place-items-center rounded-full border border-line bg-paper shadow-float transition-transform hover:scale-105"
      >
        <Mascot pose="avatar" size={44} fallback={<HelpCircle className="size-6 text-link" aria-hidden />} />
      </button>
    </div>
  )
}
