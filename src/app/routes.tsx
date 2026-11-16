import type { RouteObject } from 'react-router-dom'
import { AdminIndex, AdminLayout } from '@/features/administration/admin-layout'
import { SessionsPage } from '@/features/administration/sessions-page'
import { UsersPage } from '@/features/administration/users-page'
import { CallbackPage } from '@/features/auth/callback-page'
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
import { RequireRoles, RequireWorkspace } from './guards'

/**
 * Route map (Blueprint §05).
 *  - Public portal:  /, /mengenai, /kehadiran, /pengumuman, /templat, /arkib
 *  - Auth:           /log-masuk, /auth/callback
 *  - Workspace:      /workspace, /workspace/<module-slug>
 *
 * Guards are UX only: authorisation is enforced by the Apps Script gateway on every action.
 */
const PLACEHOLDER_MODULES = MODULES.filter((m) => m.slug !== '' && m.code !== 'M08')

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
    children: [
      { path: 'log-masuk', element: <LoginPage /> },
      { path: 'auth/callback', element: <CallbackPage /> },
    ],
  },
  {
    path: 'workspace',
    element: <RequireWorkspace />,
    children: [
      {
        element: <WorkspaceLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          ...PLACEHOLDER_MODULES.map((m) => ({
            path: m.slug,
            element: <RequireRoles roles={m.navRoles} />,
            children: [{ index: true, element: <ModulePlaceholder module={m} /> }],
          })),
          {
            path: 'pengurusan',
            element: <RequireRoles roles={['suak', 'system_admin']} />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminIndex /> },
                  { path: 'pengguna', element: <RequireRoles roles={['suak']} />, children: [{ index: true, element: <UsersPage /> }] },
                  { path: 'sesi', element: <SessionsPage /> },
                ],
              },
            ],
          },
          { path: '*', element: <NotFoundPage home="/workspace" /> },
        ],
      },
    ],
  },
]
