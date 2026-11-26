import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { ContentProvider } from '@/lib/content'
import { BrandProvider } from '@/lib/brand'
import type { AuthValue } from './auth-context'
import { AuthProvider, StaticAuthProvider } from './auth-provider'
import { createQueryClient } from './query-client'

/** App-wide providers. `auth` overrides sign-in state (tests only). */
export function AppProviders({ children, auth, queryClient }: { children: ReactNode; auth?: AuthValue; queryClient?: QueryClient }) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  return (
    <QueryClientProvider client={client}>
      <BrandProvider>
        {auth ? <StaticAuthProvider value={auth}>{children}</StaticAuthProvider> : <AuthProvider>{children}</AuthProvider>}
      </BrandProvider>
    </QueryClientProvider>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ContentProvider>{children}</ContentProvider>
    </ToastProvider>
  )
}
