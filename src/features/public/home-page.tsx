import { ArrowRight, ArrowUpRight, CalendarCheck2, FileCheck2, History, Megaphone, ShieldCheck, Stamp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { HeroVisual } from '@/components/brand/hero-visual'
import { buttonVariants } from '@/components/ui/button-variants'
import { EmptyState } from '@/components/ui/empty-state'
import { Eyebrow } from '@/components/ui/eyebrow'
import { MODULES } from '@/config/modules'
import { SITE } from '@/config/site'
import { cn } from '@/lib/cn'

const PRINCIPLES = [
  { icon: Stamp, title: 'Kelulusan sebelum pengeluaran', text: 'Nombor rujukan rasmi hanya wujud selepas kelulusan SUAK.' },
  { icon: ShieldCheck, title: 'Peribadi secara lalai', text: 'Maklumat awam diterbitkan; dokumen dalaman kekal terhad.' },
  { icon: History, title: 'Boleh dijejak', text: 'Tindakan kritikal merekodkan pelaku, masa, objek dan perubahan.' },
] as const

export function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-navy text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
          aria-hidden
        />
        <div className="container-content relative grid items-center gap-10 pt-12 pb-20 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-micro uppercase tracking-[0.16em] text-sky">
              <span className="size-1.5 rounded-full bg-electric" aria-hidden />
              {SITE.organisation} · Digital Secretariat
            </p>
            <h1 className="text-display font-extrabold tracking-[-0.03em] text-white">
              The Secretariat,{' '}
              <br className="hidden sm:block" />
              <span className="text-electric">in Motion.</span>
            </h1>
            <p className="mt-6 max-w-xl text-body-lg text-sky/85">{SITE.heroSubheading}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/log-masuk" className={buttonVariants({ variant: 'inverse', size: 'lg' })}>
                Masuk ke Workspace
                <ArrowRight />
              </Link>
              <a href="#modul" className={buttonVariants({ variant: 'ghostInverse', size: 'lg' })}>
                Terokai NO.VA
              </a>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[26rem] lg:max-w-none">
            <HeroVisual className="w-full drop-shadow-[0_30px_60px_rgba(0,0,0,0.25)]" />
          </div>
        </div>
      </section>

      {/* Principles strip — replaces a statistics strip until real, verified figures exist (§12 "jangan paparkan angka rekaan"). */}
      <section aria-labelledby="prinsip" className="relative z-10 -mt-10">
        <h2 id="prinsip" className="sr-only">
          Prinsip NO.VA
        </h2>
        <div className="container-content">
          <ul className="grid gap-px overflow-hidden rounded-hero border border-line bg-line shadow-soft md:grid-cols-3">
            {PRINCIPLES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-4 bg-paper p-6">
                <Icon className="mt-0.5 size-5 shrink-0 text-blue" aria-hidden />
                <div>
                  <p className="font-display font-bold text-navy">{title}</p>
                  <p className="mt-1 text-caption text-slate">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Core modules — editorial feature grid */}
      <section id="modul" className="scroll-mt-20 py-20 md:py-28" aria-labelledby="modul-heading">
        <div className="container-content">
          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] md:items-end">
            <div>
              <Eyebrow>Lapan modul · satu rekod</Eyebrow>
              <h2 id="modul-heading" className="mt-3 text-h1 font-extrabold">
                Satu aplikasi untuk keseluruhan kitaran kesetiausahaan.
              </h2>
            </div>
            <p className="text-body-lg text-slate md:pb-1">
              Persuratan, mesyuarat, notis, templat, laporan dan arkib berkongsi identiti pengguna, navigasi dan standard data yang sama —
              bukan laman web berasingan.
            </p>
          </div>

          <ol className="mt-12 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => {
              const Icon = m.icon
              return (
                <li key={m.code} className="group flex flex-col bg-paper p-6 transition-colors hover:bg-ice">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-micro text-slate">{m.code}</span>
                    <Icon className="size-5 text-blue transition-transform group-hover:-translate-y-0.5" aria-hidden />
                  </div>
                  <p className="mt-8 font-display text-h3 font-bold text-navy">{m.name}</p>
                  <p className="mt-2 text-caption text-slate">{m.summary}</p>
                </li>
              )
            })}
          </ol>
        </div>
      </section>

      {/* Public transparency */}
      <section className="border-t border-line bg-ice py-20 md:py-24" aria-labelledby="ketelusan">
        <div className="container-content">
          <Eyebrow>Ketelusan awam</Eyebrow>
          <h2 id="ketelusan" className="mt-3 max-w-2xl text-h1 font-extrabold">
            Rekod yang disahkan, dipaparkan secara terkawal.
          </h2>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            <TransparencyCard to="/kehadiran" title="Kehadiran" icon={CalendarCheck2} empty="Belum ada rekod kehadiran yang diterbitkan." />
            <TransparencyCard to="/pengumuman" title="Pengumuman" icon={Megaphone} empty="Belum ada pengumuman rasmi." />
            <TransparencyCard to="/arkib" title="Dokumen awam" icon={FileCheck2} empty="Belum ada dokumen yang diluluskan untuk penerbitan." />
          </div>
        </div>
      </section>
    </>
  )
}

function TransparencyCard({
  to,
  title,
  icon,
  empty,
}: {
  to: string
  title: string
  icon: typeof Megaphone
  empty: string
}) {
  return (
    <article className="flex flex-col rounded-card border border-line bg-paper">
      <header className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 className="text-body font-bold">{title}</h3>
        <Link to={to} className={cn('inline-flex items-center gap-1 text-caption font-medium text-blue hover:underline')}>
          Lihat semua
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </header>
      <EmptyState icon={icon} title="Tiada rekod lagi" description={empty} className="flex-1" />
    </article>
  )
}
