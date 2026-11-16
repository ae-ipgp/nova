# Phase 0 — Audit & Foundation Report

**Blueprint:** `docs/NOVA_Product_Blueprint_v1.0.pdf` (v1.0, 16 Nov 2026)
**Status:** Foundation implemented. Awaiting SUAK/project-owner sign-off before Phase 1.

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
| Hosting     | Vercel (`vercel.json`: SPA rewrites + security headers)   |
| Backend     | Supabase — **not connected yet** (Phase 1)                |

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
  lib/             cn(), env (browser-safe config only)
  styles/          tokens.css (design tokens), index.css
  types/           domain.ts (roles, statuses, visibilities)
supabase/          migrations/, functions/, seed.sql (empty)
tests/             route + module-registry tests
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
grants no access and is replaced by the Supabase session/role provider in Phase 1. Until then
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

## 6. Environment variables and external services

Names only (see `.env.example`):

| Variable                     | Where             | Needed from |
| ---------------------------- | ----------------- | ----------- |
| `VITE_SUPABASE_URL`          | Browser           | Phase 1 |
| `VITE_SUPABASE_ANON_KEY`     | Browser           | Phase 1 |
| `VITE_APP_BASE_URL`          | Browser           | Phase 1 |
| `SUPABASE_SERVICE_ROLE_KEY`  | Server functions only | Phase 1 |
| `RESEND_API_KEY`             | Server functions only | Phase 2 |
| `EMAIL_FROM_ADDRESS`         | Server functions only | Phase 2 |
| `APP_BASE_URL`               | Server functions only | Phase 2 |

External accounts still needed: a Supabase project (separate dev and prod if practical),
a Vercel project, an email provider with a verified sender domain, and a custom domain.

## 7. Risks and dependencies

| # | Risk / dependency | Mitigation |
| - | ----------------- | ---------- |
| 1 | Official reference-number format not approved (§08A, §16 #1) | Stored as versioned config (`reference_series`); `JPP/IPGKKB/100-1/2/2026` is a placeholder only |
| 2 | Attendance calculation rules (late = present?) not confirmed (§16 #4) | Implement as configurable; default per blueprint, shown separately |
| 3 | Public attendance fields need privacy review (§16 #5) | Public queries read only from published views; aggregate-only option |
| 4 | Email sender domain/DNS not set up (§16 #6) | NoMe blocked from real sending until verified; no real recipients in tests |
| 5 | Retention periods undefined (§16 #8) | No hard-coded retention; archived/hold states only |
| 6 | SUAK account recovery / handover procedure (§16 #10) | Needs a documented, named recovery holder before production |
| 7 | Supabase/Vercel/email free-tier limits | Check quotas before production (§09) |
| 8 | Toolchain is very recent (Vite 8, TS 7, Tailwind 4) | Versions pinned by lockfile; `npm run check` gate |

## 8. Phase 0 exit checklist

- [x] Repository scaffolded; `npm run check` (typecheck, lint, tests, build) passes
- [x] Design tokens and typography implemented
- [x] Public, auth and workspace layouts; responsive (checked at 360, 390, 1024, 1440 px; no horizontal overflow)
- [x] All routes from §05 exist with honest placeholders and no invented data
- [x] Requirement IDs from §07 registered in code
- [x] `.env.example`, Supabase folder skeleton, Vercel config
- [ ] **Architecture and baseline approved by SUAK / project owner** ← required before Phase 1

## 9. Next: Phase 1 — auth, RBAC and sessions

Supabase Auth; `profiles`, `roles`, `user_roles`, `jpp_sessions`, `jpp_members`, `audit_logs`
migrations with RLS; route guards; active-session context; DEMO seed; tests for both allowed
and denied access. SUAK is the operational administrator; System Administrator does **not**
inherit content-approval powers. No business modules until the auth and permission tests pass.
