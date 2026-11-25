import { Printer } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const A4_W = 794 // 210 mm at 96 dpi
const A4_H = 1123

/** Scaled A4 page. The iframe has no scripts; allow-modals only so "Cetak" works. */
export function A4Preview({ html, title }: { html: string; title: string }) {
  const wrap = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState(0.6)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const update = () => setScale(Math.min(1, el.clientWidth / A4_W))
    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div>
      <div ref={wrap} className="w-full overflow-hidden rounded-input border border-line bg-slate-100" style={{ height: A4_H * scale }}>
        <iframe ref={frame} title={title} sandbox="allow-same-origin allow-modals" srcDoc={html} style={{ width: A4_W, height: A4_H, transform: `scale(${scale})`, transformOrigin: 'top left', border: 0, background: '#fff' }} />
      </div>
      <Button className="mt-2" size="sm" variant="secondary" onClick={() => frame.current?.contentWindow?.print()}>
        <Printer />
        Cetak / simpan sebagai PDF
      </Button>
    </div>
  )
}
