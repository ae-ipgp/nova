import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { useLangPref } from '@/lib/prefs'
import { AppProviders, AppShell } from './providers'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export function AppRouter() {
  // Changing language remounts the screens (not the data cache), so every t() call re-reads the language.
  const lang = useLangPref()
  return (
    <AppProviders>
      <AppShell>
        <RouterProvider key={lang} router={router} />
      </AppShell>
    </AppProviders>
  )
}
