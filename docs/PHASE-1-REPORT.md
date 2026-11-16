# Phase 1 — Sign-in, roles and sessions

**Status:** Implemented and tested in code (fakes for Google and Supabase). **Not yet deployed**:
end-to-end verification with the real DELIMa / Supabase / Apps Script setup is the next step.
**Architecture:** ADR-0001 (Sheets + Drive + Apps Script gateway), ADR-0002 (DELIMa sign-in).

## Go/no-go result (ADR-0002)

| Check | Result |
| ----- | ------ |
| 1. "Anyone" offered for web-app access on the owner DELIMa account | **Pass** (confirmed by project owner, 16 Nov 2026). Still to confirm: `/exec` opens without a Google sign-in page in a private window. |
| 2. `setupSpreadsheet` completes | Pending deployment |
| 3. Mail quota | Not needed until Phase 2 |
| 4. OAuth client for Supabase Google provider | Pending |

## What was built

**Gateway (`backend/`)**
- Request pipeline: Supabase token verification → exact `@moe-dl.edu.my` check → registered,
  active profile → role check → handler. Public actions skip sign-in and return public columns only.
- First sign-in links the Supabase user to the profile SUAK registered by email and moves it
  from *invited* to *active* (audited). A profile already linked to another identity is never re-linked.
- `TableStore`: rows by header name, unique and append-only enforcement, one read per tab per
  request, plain-text cells, formula-injection guard (`=`, `+`, `-`, `@` prefixed with `'`).
- All writes run under the script lock with a fresh read; reads take no lock.
- Every change is appended to the audit workbook (`profile.register`, `profile.link`,
  `profile.status`, `role.grant`, `role.revoke`, `session.create`, `session.activate`, `bootstrap.*`).
- Last-SUAK protection: the only active SUAK cannot be suspended, deactivated or lose the role.
- `bootstrap` editor function: role catalogue, first SUAK, DEMO session.

**Web app**
- "Log masuk dengan DELIMa" (Supabase Google provider, PKCE, `hd=moe-dl.edu.my`),
  `/auth/callback`, safe `next` redirects (no open redirect).
- Workspace gate with clear states: signed out → login; not registered; suspended/deactivated;
  no roles; gateway error with retry; not configured.
- Role-based sidebar and page guards (UX only; the gateway enforces).
- Top bar shows the real active session and a profile menu with roles and sign-out.
- **Pengurusan → Pengguna** (SUAK): list/search, register DELIMa users with roles and optional
  position/bureau, grant/revoke roles, activate/suspend/deactivate. Risky actions are confirmed.
- **Pengurusan → Sesi JPP** (SUAK manages; System Administrator views): create planned
  sessions, activate one (previous active is archived).
- Supabase library loads on demand; main bundle 470 kB (144 kB gzipped).

## Schema change

`SCHEMA_VERSION` 1 → 2: `user_roles.profile_id` appended (roles are assigned before first
sign-in). `user_roles.user_id` is now unused and kept because columns are never removed.
Run `setupSpreadsheet` again if it was run before Phase 1.

## Access matrix implemented

| Action | Public | Member | Secretariat | SUAK | Sys Admin |
| ------ | :----: | :----: | :---------: | :--: | :-------: |
| `system.health`, `session.active` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `auth.me` (own status) | — | ✓ | ✓ | ✓ | ✓ |
| `admin.users.*`, `admin.roles.*` | — | — | — | ✓ | — |
| `admin.sessions.list` | — | — | — | ✓ | ✓ (view) |
| `admin.sessions.create/activate` | — | — | — | ✓ | — |

System Administrator gets no user-management or approval powers (Blueprint §06). Read-only
technical access to the user list can be added later if SUAK approves it.

## Requirement traceability

| ID | Status | Where | Evidence |
| -- | ------ | ----- | -------- |
| DASH-01 | Partial | `dashboard-page.tsx` (role-filtered quick actions) | `access.test.tsx` |
| DASH-07 | Done | Top bar + dashboard eyebrow from `auth.me` | `access.test.tsx` |
| ADM-01 | Done (register, activate, suspend, deactivate) | `admin-users.ts`, `users-page.tsx` | `admin.test.ts`, `users-page.test.tsx` |
| ADM-02 | Done | `admin.roles.grant/revoke` | `admin.test.ts`, `router.test.ts` |
| ADM-03 | Partial (sessions; bureaus/positions as free text) | `admin-sessions.ts`, `sessions-page.tsx` | `admin.test.ts` |
| ADM-06 | Partial (audit written; viewer UI in Phase 5) | `context.ts` `makeAudit` | `admin.test.ts`, `router.test.ts` |
| AT-02 | Pattern done for admin actions | router access rules | `router.test.ts` "authorisation matrix" |
| AT-12 | Done | profile/roles re-read every request | `router.test.ts` (suspension, revocation) |

## Tests

`npm run check`: typecheck, lint (0 warnings), **176 tests**, web build, gateway build.
Gateway tests run the real router against in-memory sheets; web tests cover every gate state,
role-based navigation, login redirects and the user-management flows.

## Deployment checklist (owner)

1. Supabase: create project; enable Google provider; disable Email; set redirect URLs
   (`supabase/README.md`).
2. Google OAuth client (any Google account): External, In production, scopes openid/email/profile;
   redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Apps Script (owner DELIMa): `npm run backend:push`; run `setupSpreadsheet`; set Script
   Properties; run `bootstrap`, `installTriggers`; deploy web app (Execute as Me, Anyone).
4. Vercel: set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`; deploy.
5. UAT: first SUAK signs in → registers a member → member signs in → SUAK suspends member →
   member loses access; a non-DELIMa Google account and an unregistered DELIMa account are refused.

## Open issues / known limitations

- Not yet run against real Google/Supabase; Apps Script behaviours assumed from documentation
  (notably apostrophe-escaping in `setValues` and `getDataRange` returning plain text) must be
  confirmed during deployment.
- Registration sends no notification; SUAK tells new users to sign in (NoMe arrives in Phase 2).
- No rate limiting on sign-in yet (Blueprint §11); Supabase applies its own auth limits.
  Gateway-level limits planned for Phase 6.
- Supabase keep-alive effectiveness must be confirmed in the dashboard after a week.
- The DEMO session must be replaced by SUAK: create the real session with confirmed name and dates, then activate it (the DEMO one is archived). Editing a session is not built yet (§14).
