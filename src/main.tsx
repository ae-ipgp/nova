import '@fontsource-variable/manrope'
import '@fontsource-variable/inter'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './styles/index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppRouter } from './app/router'
import { initPrefs } from './lib/prefs'
import { initPwa } from './lib/pwa'

initPrefs()
initPwa()

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
