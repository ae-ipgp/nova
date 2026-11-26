/** Small WCAG helpers used to keep admin-chosen brand colours readable. */
export const isHexColour = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)

function channel(v: number): number {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** The primary colour is a button/active surface carrying white text, so it needs AA against white. */
export const MIN_PRIMARY_CONTRAST = 4.5
export const primaryIsReadable = (hex: string): boolean => contrastRatio(hex, '#ffffff') >= MIN_PRIMARY_CONTRAST
