import '@fontsource-variable/manrope'
import '@fontsource-variable/inter'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './app/router'

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

// Offline shell + install. The worker caches only this site's own files, never gateway data.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* installation is optional; the site works without it */
    })
  })
}

createRoot(root).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
