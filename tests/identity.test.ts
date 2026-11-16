import { describe, expect, it } from 'vitest'
import { isAllowedEmail, normaliseEmail } from '@shared/identity'

describe('isAllowedEmail', () => {
  it.each(['g-123@moe-dl.edu.my', 'Student.Name@MOE-DL.EDU.MY', '  a@moe-dl.edu.my  '])('accepts %s', (e) => {
    expect(isAllowedEmail(e)).toBe(true)
  })

  it.each([
    'a@gmail.com',
    'a@evil-moe-dl.edu.my',
    'a@sub.moe-dl.edu.my',
    'a@moe-dl.edu.my.evil.com',
    'a@moe-dl.edu.my@evil.com',
    '@moe-dl.edu.my',
    'moe-dl.edu.my',
    '',
    null,
    42,
  ])('rejects %s', (e) => {
    expect(isAllowedEmail(e)).toBe(false)
  })
})

it('normalises case and whitespace', () => {
  expect(normaliseEmail('  A.B@MOE-DL.EDU.MY ')).toBe('a.b@moe-dl.edu.my')
})
