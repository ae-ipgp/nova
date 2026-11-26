import { Navigate, type RouteObject } from 'react-router-dom'
import { CallbackPage } from '@/features/auth/callback-page'
import { LoginPage } from '@/features/auth/login-page'
import { HomePage } from '@/features/public/home-page'
import { AnnouncementsPage, AttendancePage, PublicArchivePage, PublicTemplatesPage } from '@/features/public/pages'
import { OrganisationPage } from '@/features/public/organisation-page'
import { PrivacyPage } from '@/features/public/privacy-page'
import { VerifyPage } from '@/features/public/verify-page'
import { NotFoundPage } from '@/features/shared/not-found-page'
import { AuthLayout } from '@/layouts/auth-layout'
import { PublicLayout } from '@/layouts/public-layout'
import { RequireRoles, RequireWorkspace } from './guards'

/**
 * Route map (Blueprint §05).
 *  - Public portal:  /, /organisasi, /kehadiran, /pengumuman, /templat, /arkib, /semak, /privasi
 *  - Auth:           /log-masuk, /auth/callback
 *  - Workspace:      /workspace and one route tree per module
 *
 * Guards are UX only: authorisation is enforced by the Apps Script gateway on every action.
 */

/** Workspace screens load on demand so the public portal stays light. */
const page = (load: () => Promise<Record<string, unknown>>, name: string): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load())[name] as React.ComponentType }),
})

const WORK = ['member', 'secretariat', 'suak'] as const
const STAFF = ['secretariat', 'suak'] as const

export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'organisasi', element: <OrganisationPage /> },
      { path: 'mengenai', element: <Navigate to="/organisasi" replace /> },
      { path: 'log-masuk', element: <LoginPage /> },
      { path: 'kehadiran', element: <AttendancePage /> },
      { path: 'pengumuman', element: <AnnouncementsPage /> },
      { path: 'templat', element: <PublicTemplatesPage /> },
      { path: 'arkib', element: <PublicArchivePage /> },
      { path: 'semak', element: <VerifyPage /> },
      { path: 'privasi', element: <PrivacyPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'auth/callback', element: <CallbackPage /> },
    ],
  },
  {
    path: 'workspace',
    element: <RequireWorkspace />,
    children: [
      {
        ...page(() => import('@/layouts/workspace-layout'), 'WorkspaceLayout'),
        children: [
          { index: true, ...page(() => import('@/features/dashboard/dashboard-page'), 'DashboardPage') },
          { path: 'papan-notis', ...page(() => import('@/features/board/board-page'), 'BoardPage') },
          {
            path: 'e-surat',
            element: <RequireRoles roles={WORK} />,
            children: [
              {
                ...page(() => import('@/features/correspondence/correspondence-layout'), 'CorrespondenceLayout'),
                children: [
                  { index: true, ...page(() => import('@/features/correspondence/requests-page'), 'RequestsPage') },
                  { path: 'daftar', element: <RequireRoles roles={STAFF} />, children: [{ index: true, ...page(() => import('@/features/correspondence/register-page'), 'RegisterPage') }] },
                  { path: 'surat', element: <RequireRoles roles={STAFF} />, children: [{ index: true, ...page(() => import('@/features/correspondence/letters-page'), 'LettersPage') }] },
                ],
              },
            ],
          },
          {
            path: 'e-mesyuarat',
            element: <RequireRoles roles={WORK} />,
            children: [
              {
                ...page(() => import('@/features/meetings/meetings-layout'), 'MeetingsLayout'),
                children: [
                  { index: true, ...page(() => import('@/features/meetings/meetings-page'), 'MeetingsPage') },
                  { path: 'kehadiran', ...page(() => import('@/features/meetings/attendance-summary-page'), 'AttendanceSummaryPage') },
                  { path: ':id', ...page(() => import('@/features/meetings/meeting-detail-page'), 'MeetingDetailPage') },
                ],
              },
            ],
          },
          {
            path: 'nome',
            element: <RequireRoles roles={STAFF} />,
            children: [
              { index: true, ...page(() => import('@/features/nome/nome-page'), 'NoMePage') },
              { path: ':id', ...page(() => import('@/features/nome/notice-editor-page'), 'NoticeEditorPage') },
            ],
          },
          { path: 'templat', element: <RequireRoles roles={WORK} />, children: [{ index: true, ...page(() => import('@/features/templates/templates-page'), 'TemplatesPage') }] },
          {
            path: 'e-opr',
            element: <RequireRoles roles={WORK} />,
            children: [
              { index: true, ...page(() => import('@/features/opr/opr-list-page'), 'OprListPage') },
              { path: ':id', ...page(() => import('@/features/opr/opr-editor-page'), 'OprEditorPage') },
            ],
          },
          { path: 'e-arkib', element: <RequireRoles roles={WORK} />, children: [{ index: true, ...page(() => import('@/features/archive/archive-page'), 'ArchivePage') }] },
          {
            path: 'pengurusan',
            element: <RequireRoles roles={['suak', 'system_admin']} />,
            children: [
              {
                ...page(() => import('@/features/administration/admin-layout'), 'AdminLayout'),
                children: [
                  { index: true, ...page(() => import('@/features/administration/admin-layout'), 'AdminIndex') },
                  { path: 'pengguna', element: <RequireRoles roles={['suak']} />, children: [{ index: true, ...page(() => import('@/features/administration/users-page'), 'UsersPage') }] },
                  { path: 'sesi', ...page(() => import('@/features/administration/sessions-page'), 'SessionsPage') },
                  { path: 'nombor', element: <RequireRoles roles={['suak']} />, children: [{ index: true, ...page(() => import('@/features/administration/series-page'), 'SeriesPage') }] },
                  { path: 'dokumen', element: <RequireRoles roles={['suak']} />, children: [{ index: true, ...page(() => import('@/features/administration/doctypes-page'), 'DocTypesPage') }] },
                  { path: 'kumpulan', element: <RequireRoles roles={['suak']} />, children: [{ index: true, ...page(() => import('@/features/administration/groups-page'), 'GroupsPage') }] },
                  { path: 'tetapan', element: <RequireRoles roles={['suak']} />, children: [{ index: true, ...page(() => import('@/features/administration/settings-page'), 'SettingsPage') }] },
                  { path: 'audit', ...page(() => import('@/features/administration/audit-page'), 'AuditPage') },
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
