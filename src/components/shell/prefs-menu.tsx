import { Check, Moon, Palette, Sun, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/cn'
import { playSound } from '@/lib/sound'
import {
  THEME_HINT,
  THEME_LABEL,
  THEME_PREFS,
  setLangPref,
  setSoundPref,
  setThemePref,
  useLangPref,
  useSoundPref,
  useThemePref,
  type Lang,
  type ThemePref,
} from '@/lib/prefs'
import { Popover } from './popover'
import { t } from '@/i18n'

/** Swatches for the picker; the real colours live in themes.css — these only hint at them. */
const SWATCH: Record<ThemePref, string> = {
  auto: 'bg-gradient-to-br from-paper to-navy-900',
  mutiara: 'bg-paper ring-1 ring-line',
  lazuardi: 'bg-navy-900',
  zamrud: 'bg-teal',
}

const LANGS: { value: Lang; label: string }[] = [
  { value: 'ms', label: 'Bahasa Melayu' },
  { value: 'en', label: 'English' },
]

/** Tema · Bahasa · Bunyi. Everything is stored on the device. */
export function PrefsMenu({ className }: { className?: string }) {
  const theme = useThemePref()
  const lang = useLangPref()
  const sound = useSoundPref()
  return (
    <Popover
      label={t('Paparan dan bahasa')}
      panelClassName="w-72"
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-label={t('Paparan dan bahasa')}
          className={cn('grid size-10 place-items-center rounded-full text-slate transition-colors hover:bg-soft hover:text-heading', className)}
        >
          <Palette className="size-[1.125rem]" aria-hidden />
        </button>
      )}
    >
      {() => (
        <div className="space-y-3 p-1">
          <fieldset>
            <legend className="px-2 pb-1 text-micro font-semibold uppercase tracking-wide text-slate">{t('Tema')}</legend>
            <div role="radiogroup" aria-label={t('Tema')} className="grid grid-cols-2 gap-1.5">
              {THEME_PREFS.map((tt) => (
                <button
                  key={tt}
                  type="button"
                  role="radio"
                  aria-checked={theme === tt}
                  onClick={() => setThemePref(tt)}
                  className={cn('flex items-center gap-2 rounded-input border px-2.5 py-2 text-left transition-colors', theme === tt ? 'border-blue bg-soft' : 'border-line hover:bg-soft')}
                >
                  <span className={cn('size-5 shrink-0 rounded-full', SWATCH[tt])} aria-hidden />
                  <span className="min-w-0">
                    <span className="block text-caption font-semibold text-heading">{t(THEME_LABEL[tt])}</span>
                    <span className="block truncate text-micro text-slate">{t(THEME_HINT[tt])}</span>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="px-2 pb-1 text-micro font-semibold uppercase tracking-wide text-slate">{t('Bahasa')}</legend>
            <div role="radiogroup" aria-label={t('Bahasa')} className="space-y-1">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  role="radio"
                  aria-checked={lang === l.value}
                  onClick={() => setLangPref(l.value)}
                  className="flex w-full items-center justify-between rounded-input px-3 py-2 text-caption text-heading hover:bg-soft"
                >
                  {l.label}
                  {lang === l.value && <Check className="size-4 text-link" aria-hidden />}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            role="switch"
            aria-checked={sound}
            onClick={() => {
              setSoundPref(!sound)
              if (!sound) setTimeout(() => playSound('success'), 0)
            }}
            className="flex w-full items-center justify-between rounded-input px-3 py-2 text-caption text-heading hover:bg-soft"
          >
            <span className="flex items-center gap-2">
              {sound ? <Volume2 className="size-4" aria-hidden /> : <VolumeX className="size-4" aria-hidden />}
              {t('Bunyi maklum balas')}
            </span>
            <span className={cn('rounded-full px-2 py-0.5 text-micro font-semibold', sound ? 'bg-blue text-white' : 'bg-soft text-slate')}>{sound ? t('Hidup') : t('Mati')}</span>
          </button>
          <p className="flex items-center gap-1.5 px-3 text-micro text-slate">
            <Sun className="size-3" aria-hidden /> <Moon className="size-3" aria-hidden /> {t('Pilihan disimpan pada peranti ini.')}
          </p>
        </div>
      )}
    </Popover>
  )
}
