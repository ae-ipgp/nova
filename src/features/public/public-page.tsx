import type { ReactNode } from 'react'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Cms } from '@/lib/content'

/**
 * Header band shared by public portal sub-pages. The three texts are admin-editable (Mod suntingan);
 * pass the Malay source in eyebrowMs / titleMs / descriptionMs. `title` overrides titleMs for data-driven titles.
 */
export function PublicPage({
  id,
  eyebrowMs,
  titleMs,
  descriptionMs,
  title,
  children,
}: {
  id: string
  eyebrowMs: string
  titleMs: string
  descriptionMs: string
  title?: ReactNode
  children?: ReactNode
}) {
  return (
    <>
      <section className="relative overflow-hidden border-b border-line bg-soft/60">
        <div className="container-content py-14 md:py-20">
          <Eyebrow>
            <Cms id={`${id}.eyebrow`} ms={eyebrowMs} />
          </Eyebrow>
          <h1 className="mt-3 text-h1 font-extrabold">{title ?? <Cms id={`${id}.title`} ms={titleMs} />}</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-slate">
            <Cms id={`${id}.description`} ms={descriptionMs} multiline />
          </p>
        </div>
      </section>
      <section className="container-content py-12">{children}</section>
    </>
  )
}
