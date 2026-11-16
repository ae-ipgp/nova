import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { AppProviders, AppShell } from './providers'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export function AppRouter() {
  return (
    <AppProviders>
      <AppShell>
        <RouterProvider router={router} />
      </AppShell>
    </AppProviders>
  )
}
