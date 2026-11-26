import { ArrowRight, ArrowUpRight, BadgeCheck, CalendarCheck2, FileCheck2, History, Megaphone, ShieldCheck, Stamp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HeroVisual } from '@/components/brand/hero-visual'
import { Mascot } from '@/components/brand/mascot'
import { buttonVariants } from '@/components/ui/button-variants'
import { EmptyState } from '@/components/ui/empty-state'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Skeleton } from '@/components/ui/skeleton'
import { MODULES } from '@/config/modules'
import { MASCOT_NAME } from '@/config/mascot'
import { SITE } from '@/config/site'
import { usePublic } from '@/hooks/use-public'
import { isApiConfigured } from '@/lib/env'
import { formatDate } from '@/lib/format'
import { t } from '@/i18n'

const PRINCIPLES = [
  { icon: Stamp, title: 'Kelulusan sebelum pengeluaran', text: 'Nombor rujukan rasmi hanya wujud selepas kelulusan SUAK.' },
  { icon: ShieldCheck, title: 'Peribadi secara lalai', text: 'Maklumat awam diterbitkan; dokumen dalaman kekal terhad.' },
  { icon: History, title: 'Boleh dijejak', text: 'Tindakan kritikal merekodkan pelaku, masa, objek dan perubahan.' },
] as const

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }} aria-hidden />
        <div className="container-content relative grid items-center gap-10 pt-12 pb-20 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-micro uppercase tracking-[0.16em] text-sky">
              <span className="size-1.5 rounded-full bg-electric" aria-hidden />
              {SITE.organisation} {t('· Digital Secretariat')}
            </p>
            <h1 className="text-display font-extrabold tracking-[-0.03em] text-white">
              {t('The Secretariat,')}{' '}
              <br className="hidden sm:block" />
              <span className="text-electric">{t('in Motion.')}</span>
            </h1>
            <p className="mt-6 max-w-xl text-body-lg text-sky/85">{t(SITE.heroSubheading)}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/log-masuk" className={buttonVariants({ variant: 'inverse', size: 'lg' })}>
                {t('Masuk ke Workspace')}
                <ArrowRight />
              </Link>
              <a href="#modul" className={buttonVariants({ variant: 'ghostInverse', size: 'lg' })}>
                {t('Terokai NO.VA')}
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
            <Mascot pose="wave" size={420} label={t('{MASCOT_NAME}, maskot NO.VA, melambai', { MASCOT_NAME: MASCOT_NAME })} className="mx-auto max-w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.3)]" fallback={<HeroVisual className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.25)]" />} />
          </div>
        </div>
      </section>

      <section aria-labelledby="prinsip" className="relative z-10 -mt-10">
        <h2 id="prinsip" className="sr-only">{t('Prinsip NO.VA')}</h2>
        <div className="container-content">
          <ul className="grid gap-px overflow-hidden rounded-hero border border-line bg-line shadow-soft md:grid-cols-3">
            {PRINCIPLES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 bg-paper p-6">
                <Icon className="mt-0.5 size-5 shrink-0 text-link" aria-hidden />
                <div><p className="font-display font-bold text-heading">{t(title)}</p><p className="mt-1 text-caption text-slate">{t(text)}</p></div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="modul" className="scroll-mt-20 py-20 md:py-28" aria-labelledby="modul-heading">
        <div className="container-content">
          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-end">
            <div>
              <Eyebrow>{t('Lapan modul · satu rekod')}</Eyebrow>
              <h2 id="modul-heading" className="mt-3 text-h1 font-extrabold">{t('Satu aplikasi untuk keseluruhan kitaran kesetiausahaan.')}</h2>
            </div>
            <p className="text-body-lg text-slate md:pb-1">{t('Persuratan, mesyuarat, notis, templat, laporan dan arkib berkongsi identiti pengguna, navigasi dan standard data yang sama — bukan laman web berasingan.')}</p>
          </div>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => {
              const Icon = m.icon
              return (
                <li key={m.code} className="group flex flex-col bg-paper p-6 transition-colors hover:bg-ice">
                  <div className="flex items-center justify-between"><span className="font-mono text-micro text-slate">{m.code}</span><Icon className="size-5 text-link transition-transform group-hover:-translate-y-0.5" aria-hidden /></div>
                  <p className="mt-8 font-display text-h3 font-bold text-heading">{t(m.name)}</p>
                  <p className="mt-2 text-caption text-slate">{t(m.summary)}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      <Transparency />

      <section className="border-t border-line py-14" aria-labelledby="semak-h">
        <div className="container-content flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <BadgeCheck className="size-10 shrink-0 text-link" aria-hidden />
            <div><h2 id="semak-h" className="text-h3 font-bold">{t('Semak keaslian surat atau sijil')}</h2><p className="text-body text-slate">{t('Sahkan nombor rujukan yang dikeluarkan oleh NO.VA.')}</p></div>
          </div>
          <Link to="/semak" className={buttonVariants({ size: 'lg' })}>{t('Semak nombor rujukan')}</Link>
        </div>
      </section>
    </>
  )
}

function Transparency() {
  const ann = usePublic('public.announcements')
  const att = usePublic('public.attendance')
  const docs = usePublic('public.archive')
  return (
    <section className="border-t border-line bg-ice py-20 md:py-24" aria-labelledby="ketelusan">
      <div className="container-content">
        <Eyebrow>{t('Ketelusan awam')}</Eyebrow>
        <h2 id="ketelusan" className="mt-3 max-w-2xl text-h1 font-extrabold">{t('Rekod yang disahkan, dipaparkan secara terkawal.')}</h2>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <Card2 title={t('Kehadiran')} to="/kehadiran" icon={CalendarCheck2} state={att} empty={t('Belum ada rekod kehadiran yang diterbitkan.')} items={(d) => d.meetings.slice(0, 3).map((m) => ({ k: m.id, t: m.title, s: t('{v1} hadir · {v2}', { v1: m.counts.present + m.counts.late, v2: formatDate(m.startsAt) }) }))} />
          <Card2 title={t('Pengumuman')} to="/pengumuman" icon={Megaphone} state={ann} empty={t('Belum ada pengumuman rasmi.')} items={(d) => d.slice(0, 3).map((a) => ({ k: a.id, t: a.title, s: `${t(a.category)} · ${formatDate(a.publishAt)}` }))} />
          <Card2 title={t('Dokumen awam')} to="/arkib" icon={FileCheck2} state={docs} empty={t('Belum ada dokumen yang diluluskan untuk penerbitan.')} items={(d) => d.slice(0, 3).map((x) => ({ k: x.id, t: x.title, s: `${t(x.category)} · ${formatDate(x.publishedAt)}` }))} />
        </div>
      </div>
    </section>
  )
}

interface QueryLike<T> { isPending: boolean; isError: boolean; data?: T }
function Card2<T>({ title, to, icon, state, empty, items }: { title: string; to: string; icon: typeof Megaphone; state: QueryLike<T>; empty: string; items: (d: T) => { k: string; t: string; s: string }[] }) {
  const rows = state.data ? items(state.data) : []
  return (
    <article className="flex flex-col rounded-card border border-line bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-body font-bold">{title}</h3>
        <Link to={to} className="inline-flex items-center gap-1 text-caption font-medium text-link hover:underline">{t('Lihat semua')}<ArrowUpRight className="size-3.5" aria-hidden /></Link>
      </header>
      {isApiConfigured && state.isPending ? (
        <div className="space-y-3 p-5" aria-busy="true"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      ) : rows.length > 0 ? (
        <ul className="divide-y divide-line">{rows.map((r) => <li key={r.k} className="px-5 py-3"><p className="font-semibold text-heading">{r.t}</p><p className="text-caption text-slate">{r.s}</p></li>)}</ul>
      ) : (
        <EmptyState icon={icon} title={t('Tiada rekod lagi')} description={state.isError ? t('Data tidak dapat dimuatkan buat masa ini.') : empty} className="flex-1" />
      )}
    </article>
  )
}
