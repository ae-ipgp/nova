import { Eyebrow } from '@/components/ui/eyebrow'

/** Header band shared by public portal sub-pages. */
export function PublicPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children?: React.ReactNode }) {
  return (
    <>
      <section className="border-b border-line bg-ice">
        <div className="container-content py-14 md:py-20">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 text-h1 font-extrabold">{title}</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-slate">{description}</p>
        </div>
      </section>
      <section className="container-content py-12">{children}</section>
    </>
  )
}
