import { useState, type ReactNode } from 'react'
import { faceFile, MASCOT_NAME, poseFile, type MascotFace, type MascotPose } from '@/config/mascot'
import { cn } from '@/lib/cn'

/**
 * Static mascot image. Decorative by default (alt=""): the surrounding text always carries
 * the meaning. If the PNG is missing, `fallback` renders instead so layouts never break.
 */
export function Mascot({
  pose,
  face,
  size = 160,
  className,
  fallback = null,
  label,
}: {
  pose?: MascotPose
  face?: MascotFace
  size?: number
  className?: string
  fallback?: ReactNode
  /** Only set when the image conveys information not already in the text. */
  label?: string
}) {
  const [failed, setFailed] = useState(false)
  const src = face ? faceFile(face) : pose ? poseFile(pose) : ''
  if (!src || failed) return <>{fallback}</>
  return (
    <img
      src={src}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className={cn('select-none object-contain', className)}
      style={{ width: size, height: size }}
      title={label ? `${MASCOT_NAME}: ${label}` : undefined}
    />
  )
}
