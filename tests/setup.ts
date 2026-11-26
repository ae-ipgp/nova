import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { resetLangCache } from '@/lib/prefs'

afterEach(() => {
  cleanup()
  resetLangCache()
})

// Tests assert the Malay source text; a first visit follows the browser language, so pretend it is Malay.
Object.defineProperty(navigator, 'language', { value: 'ms-MY', configurable: true })

// jsdom has no scrollTo / matchMedia
window.scrollTo = () => {}
