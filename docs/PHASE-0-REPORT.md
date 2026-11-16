# Phase 0 — Audit & Foundation Report

**Blueprint:** `docs/NOVA_Product_Blueprint_v1.0.pdf` (v1.0, 16 Nov 2026)
**Status:** Foundation implemented. Awaiting SUAK/project-owner sign-off before Phase 1.

> **Revision 1 (16 Nov 2026):** storage moved from Supabase to Google Sheets + Drive behind an
> Apps Script gateway; Supabase is used for login only. See
> [ADR-0001](adr/0001-google-sheets-drive-storage.md).

## 1. Repository audit (before Phase 0)

The repository was empty (no commits, no files). No existing framework, package manager,
scripts or deployment configuration had to be preserved.

## 2. Stack chosen (Blueprint §09)

| Layer       | Choice                                                    |
| ----------- | --------------------------------------------------------- |
| Frontend    | React 19 + TypeScript (strict) + Vite 8                   |
| Routing     | React Router 7 (data router)                              |
| UI system   | Tailwind CSS 4 with NO.VA tokens; shadcn-style primitives (`cva` + `tailwind-merge`) written in-repo |
| Icons       | lucide-react                                              |
| Fonts       | Manrope (display/heading), Inter (body), IBM Plex Mono (data) — self-hosted via Fontsource, no third-party font CDN |
| Lint        | oxlint (Vite template default)                            |
| Tests       | Vitest + Testing Library + jsdom                          |
| Hosting     | Vercel, static site only (`vercel.json`: SPA rewrites + security headers) |
| Data        | Google Sheets (`NO.VA — Data`, `NO.VA — Audit`) — schema in `shared/schema.ts` |
| Files       | Google Drive, private folders under `NO.VA/`              |
| Server      | Google Apps Script web app ("gateway", `backend/`), bundled with esbuild, deployed with clasp |
| Login       | Supabase Auth only — **not connected yet** (Phase 1)      |

## 3. Folder structure

```
src/
  app/             router, route map, Phase-0 role preview context
  components/
    brand/         Logo, Monogram, HeroVisual
    ui/            Button, StatusBadge, Card, EmptyState, Skeleton, PageHeader, Eyebrow
  config/          modules.ts (M01–M08 + requirement IDs), site.ts (identity, public nav)
  features/
    public/        landing + public portal pages
    auth/          login (UI only)
    dashboard/     workspace dashboard shell
    shared/        module placeholder, requirement list, 404
  layouts/         PublicLayout, AuthLayout, WorkspaceLayout
  lib/             cn(), env (browser-safe config only), api.ts (typed gateway client)
  styles/          tokens.css (design tokens), index.css
  types/           domain.ts (roles, statuses, visibilities)
shared/            schema.ts (sheets, columns, constraints), api-contract.ts
backend/           Apps Script gateway: router, setup, lock, keep-alive, manifest, build
supabase/          README only (auth configuration)
tests/             routes, module registry, schema, API client, gateway (router/setup/lock)
docs/              blueprint PDF, this report
```

The blueprint's suggested `features/correspondence`, `meetings`, `nome`, `templates`, `opr`,
`archive`, `administration` folders will be created when each module is implemented, so no
empty feature folders are committed.

## 4. Routes, layouts and feature boundaries

| Path                       | Layout     | Content (Phase 0)                      | Built in |
| -------------------------- | ---------- | -------------------------------------- | -------- |
| `/`                        | Public     | Landing: hero, principles, 8 modules, transparency | 0 (content in 4) |
| `/mengenai`                | Public     | About JPP — empty state                | 4 |
| `/kehadiran`               | Public     | Published attendance — empty state     | 4 |
| `/pengumuman`              | Public     | Announcements — empty state            | 4 |
| `/templat`                 | Public     | Public templates — empty state         | 4 |
| `/arkib`                   | Public     | Public archive — empty state           | 4 |
| `/log-masuk`               | Auth       | Login form, **disabled**               | 1 |
| `/workspace`               | Workspace  | Dashboard shell, KPI strip without data | 1–2 |
| `/workspace/e-surat`       | Workspace  | M02 placeholder + LTR-01…10            | 2 |
| `/workspace/e-mesyuarat`   | Workspace  | M03 placeholder + MTG-01…10            | 2 |
| `/workspace/nome`          | Workspace  | M04 placeholder + NME-01…09            | 2 |
| `/workspace/templat`       | Workspace  | M05 placeholder + TPL-01…07            | 3 |
| `/workspace/e-opr`         | Workspace  | M06 placeholder + OPR-01…08            | 3 |
| `/workspace/e-arkib`       | Workspace  | M07 placeholder + ARC-01…08            | 3 |
| `/workspace/pengurusan`    | Workspace  | M08 placeholder + ADM-01…09            | 5 |

`src/config/modules.ts` is the single registry for module codes, slugs, names, icons, phase,
navigation visibility and requirement IDs. The sidebar, routes, landing grid and placeholders
all read from it, and tests check it against the counts in Blueprint §07.

**Role preview (Phase 0 only).** The workspace has a dashed "Pratonton" selector that changes
which modules appear in the sidebar. It exists so reviewers can check navigation per role. It
grants no access and is replaced in Phase 1 by Supabase sign-in plus roles loaded from the gateway. Until then
`/workspace` is openable by anyone because it holds no data.

## 5. Design tokens (Blueprint §04)

All colours, fonts, the type scale, radii, shadows, layout sizes and motion timing are defined
once in `src/styles/tokens.css` as Tailwind v4 `@theme` variables. Tailwind's default palette is
disabled (`--color-*: initial`), so only approved colours can be used.

- Palette: navy `#102D4F`, institutional blue `#1769AA`, electric `#2C86D9`, sky, ice, paper,
  ink, slate, line, champagne (restricted accent), teal, muted red.
- Status tones: draft/archived (slate), pending (amber), approved (green), rejected (muted red),
  issued/published (blue). `StatusBadge` always shows a text label as well as the colour.
- Layout: 1,280 px max content width, 248/76 px sidebar, 64 px header, radii 8/12/24 px.

## 6. Configuration and external services

**Web app (public values only, `.env.example`):**

| Variable                 | Purpose                              | Needed from |
| ------------------------ | ------------------------------------ | ----------- |
| `VITE_SUPABASE_URL`      | Supabase Auth endpoint               | Phase 1 |
| `VITE_SUPABASE_ANON_KEY` | Supabase public key                  | Phase 1 |
| `VITE_API_URL`           | Apps Script web app `/exec` URL      | Phase 1 |
| `VITE_APP_BASE_URL`      | Site URL                             | Phase 1 |

**Gateway (Apps Script Script Properties, never in the repo or browser):**
`SPREADSHEET_DATA_ID`, `SPREADSHEET_AUDIT_ID`, `DRIVE_ROOT_FOLDER_ID`, `SCHEMA_VERSION`
(written by `setupSpreadsheet`), `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and in Phase 1
`SUPABASE_SERVICE_ROLE_KEY`.

External accounts needed: **one organisation Google account** (owns Sheets, Drive, Apps Script,
sends NoMe email), a Supabase project (auth only), a Vercel project and a custom domain.
Resend is no longer required.

## 7. Risks and dependencies

| # | Risk / dependency | Mitigation |
| - | ----------------- | ---------- |
| 1 | **Owner Google account not chosen** (ADR-0001, decision #11) | Must be an organisation account handed over between sessions, not a personal student account |
| 2 | Official reference-number format not approved (§08A, §16 #1) | Stored as config in `reference_series` sheet; `JPP/IPGKKB/100-1/2/2026` is a placeholder only |
| 3 | No database transactions on Sheets | All check-then-write runs inside `withLock()` (LockService); concurrency test AT-04 targets it |
| 4 | Manual edits to the spreadsheets bypass all rules | Spreadsheets shared with nobody; hand edits for recovery only |
| 5 | MailApp daily recipient quota (~100 personal / ~1,500 Workspace) | Depends on decision #11; Resend via UrlFetch remains a fallback |
| 6 | Supabase free projects pause when idle | Daily `keepAlive` trigger; confirm in dashboard |
| 7 | Apps Script latency vs NFR p95 < 3 s | CacheService for public reads, one action per screen, client caching |
| 8 | Attendance calculation rules and public fields (§16 #4, #5) | Configurable; public reads limited to `publicColumns` of published rows |
| 9 | Retention periods undefined (§16 #8) | No hard-coded retention; archived/hold states only |
| 10 | SUAK account recovery / handover (§16 #10) | Documented recovery holder for both Supabase and the Google owner account |

## 8. Phase 0 exit checklist

- [x] Repository scaffolded; `npm run check` (typecheck, lint, tests, build) passes
- [x] Design tokens and typography implemented
- [x] Public, auth and workspace layouts; responsive (checked at 360, 390, 1024, 1440 px; no horizontal overflow)
- [x] All routes from §05 exist with honest placeholders and no invented data
- [x] Requirement IDs from §07 registered in code
- [x] `.env.example`, Vercel config
- [x] Sheets schema for all §10 tables, idempotent `setupSpreadsheet`, gateway router with error envelope, `withLock`, keep-alive, typed web client (Revision 1)
- [ ] **Architecture and baseline approved by SUAK / project owner** ← required before Phase 1

## 9. Next: Phase 1 — auth, RBAC and sessions

Supabase Auth sign-in in the web app (sign-ups disabled, invitation only); gateway token
verification (Supabase `/auth/v1/user`, short CacheService cache); role loading from
`user_roles`; route guards; active JPP session context; `profiles`/`user_roles`/`jpp_sessions`/
`jpp_members` actions; audit appends; DEMO seed; tests for both allowed and denied access.
SUAK is the operational administrator; System Administrator does **not** inherit
content-approval powers. No business modules until the auth and permission tests pass.
