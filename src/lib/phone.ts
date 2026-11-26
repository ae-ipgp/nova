/** Phone links for the footer. Malaysian numbers written as 012-345 6789 become +60123456789. */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '')
  if (!digits) return ''
  if (digits.startsWith('+')) return digits.replace(/\D/g, '')
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.startsWith('0')) return `60${digits.slice(1)}`
  if (digits.startsWith('60')) return digits
  return digits.startsWith('1') ? `60${digits}` : digits
}

export const telHref = (raw: string): string => {
  const n = normalisePhone(raw)
  return n ? `tel:+${n}` : ''
}

export const whatsappHref = (raw: string): string => {
  const n = normalisePhone(raw)
  return n ? `https://wa.me/${n}` : ''
}
