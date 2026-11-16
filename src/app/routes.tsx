import type { RouteObject } from 'react-router-dom'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { LoginPage } from '@/features/auth/login-page'
import { HomePage } from '@/features/public/home-page'
import { AboutPage, AnnouncementsPage, AttendancePage, PublicArchivePage, PublicTemplatesPage } from '@/features/public/pages'
import { ModulePlaceholder } from '@/features/shared/module-placeholder'
import { NotFoundPage } from '@/features/shared/not-found-page'
import { AuthLayout } from '@/layouts/auth-layout'
import { PublicLayout } from '@/layouts/public-layout'
import { WorkspaceLayout } from '@/layouts/workspace-layout'
import { MODULES } from '@/config/modules'
import { PreviewRoleProvider } from './preview-role'

/**
 * Route map (Blueprint §05).
 *  - Public portal:  /, /mengenai, /kehadiran, /pengumuman, /templat, /arkib
 *  - Auth:           /log-masuk
 *  - Workspace:      /workspace, /workspace/<module-slug>
 *
 * Phase 1 adds an auth guard around /workspace. Guards are UX only;
 * authorisation is enforced by the Apps Script gateway on every action.
 */
export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'mengenai', element: <AboutPage /> },
      { path: 'kehadiran', element: <AttendancePage /> },
      { path: 'pengumuman', element: <AnnouncementsPage /> },
      { path: 'templat', element: <PublicTemplatesPage /> },
      { path: 'arkib', element: <PublicArchivePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [{ path: 'log-masuk', element: <LoginPage /> }],
  },
  {
    path: 'workspace',
    element: (
      <PreviewRoleProvider>
        <WorkspaceLayout />
      </PreviewRoleProvider>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      ...MODULES.filter((m) => m.slug !== '').map((m) => ({
        path: m.slug,
        element: <ModulePlaceholder module={m} />,
      })),
      { path: '*', element: <NotFoundPage home="/workspace" /> },
    ],
  },
]
