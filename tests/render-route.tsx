import { render, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import type { AuthValue } from '@/app/auth-context'
import { AppProviders, AppShell } from '@/app/providers'
import { createQueryClient } from '@/app/query-client'
import { routes } from '@/app/routes'

export function renderRoute(path: string, auth?: AuthValue) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({ queries: { retry: false } })
  return {
    router,
    ...render(
      <AppProviders auth={auth} queryClient={queryClient}>
        <AppShell>
          <RouterProvider router={router} />
        </AppShell>
      </AppProviders>,
    ),
  }
}

/** Waits for lazy-loaded routes to resolve before returning (workspace screens load on demand). */
export async function renderReady(path: string, auth?: AuthValue) {
  const r = renderRoute(path, auth)
  await waitFor(() => expect(r.router.state.initialized).toBe(true))
  return r
}
