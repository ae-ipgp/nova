# NO.VA — Digital Secretariat

**One platform. One Secretariat. One official record.**

NO.VA is the web-based secretariat platform for JPP IPGKKB. It brings correspondence,
meetings, notices, templates, reporting, archive and administration into one modular
application with one identity system and one source of record.

> Status: **Phase 0 — foundation.** UI shell, design system and route structure only.
> No authentication, database or email yet. See [`docs/PHASE-0-REPORT.md`](docs/PHASE-0-REPORT.md).

## Modules

| Code | Module      | Purpose                                              |
| ---- | ----------- | ---------------------------------------------------- |
| M01  | Dashboard   | Operational overview, status, quick actions          |
| M02  | e-Surat     | Reference-number requests, SUAK approval, letter register |
| M03  | e-Mesyuarat | Meetings, agenda, minutes, attendance, actions       |
| M04  | NoMe        | Notice composer and email delivery                   |
| M05  | Templat     | Controlled document templates                        |
| M06  | e-OPR       | One-Page Report wizard and A4 PDF export             |
| M07  | e-Arkib     | Document repository, metadata and search             |
| M08  | Pengurusan  | Users, roles, sessions, configuration, audit         |

## Getting started

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local   # optional in Phase 0
npm run dev                  # http://localhost:5173
```

| Script              | What it does                                  |
| ------------------- | --------------------------------------------- |
| `npm run dev`       | Start the dev server                          |
| `npm run build`     | Typecheck and production build                |
| `npm run typecheck` | TypeScript only                               |
| `npm run lint`      | oxlint                                        |
| `npm test`          | Vitest suite                                  |
| `npm run check`     | Everything above; run before every PR         |

## Stack

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router · Supabase (Phase 1+) · Vercel

## Security rules (non-negotiable)

- Never put `SUPABASE_SERVICE_ROLE_KEY` or `RESEND_API_KEY` in a `VITE_` variable or commit `.env` files.
- Frontend route guards are UX only. Authorisation is enforced with RLS and server functions.
- Official reference numbers are issued only after SUAK approval, atomically, server-side.
- Storage is private by default; public content goes through an explicit publish step.

## Documentation

- [`docs/NOVA_Product_Blueprint_v1.0.pdf`](docs/NOVA_Product_Blueprint_v1.0.pdf): the primary product specification
- [`docs/PHASE-0-REPORT.md`](docs/PHASE-0-REPORT.md): architecture, routes, risks, open decisions
- [`supabase/README.md`](supabase/README.md): backend conventions

Seed and sample content are DEMO data and must be replaced with real, SUAK-approved content before production.
