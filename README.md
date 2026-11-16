# NO.VA — Digital Secretariat

**One platform. One Secretariat. One official record.**

NO.VA is the web-based secretariat platform for JPP IPGKKB. It brings correspondence,
meetings, notices, templates, reporting, archive and administration into one modular
application with one identity system and one source of record.

> Status: **Phase 1 — sign-in, roles and sessions** implemented and tested against fakes;
> awaiting deployment and UAT. Business modules (e-Surat, e-Mesyuarat, …) start in Phase 2.
> See [`docs/PHASE-1-REPORT.md`](docs/PHASE-1-REPORT.md).

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
| `npm run backend:build` | Bundle the Apps Script gateway to `backend/dist` |
| `npm run backend:push`  | Build and push the gateway with clasp         |
| `npm run check`     | Everything above (except push); run before every PR |

## Stack

| Layer   | Technology |
| ------- | ---------- |
| Web app | React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router, hosted on Vercel |
| Data    | Google Sheets (schema in `shared/schema.ts`) |
| Files   | Google Drive (private folders) |
| Server  | Google Apps Script gateway (`backend/`): the only path to Sheets and Drive |
| Login   | DELIMa Google accounts via Supabase Auth (identity only, no data) |

See [ADR-0001](docs/adr/0001-google-sheets-drive-storage.md) for the architecture and its trade-offs,
and [`backend/README.md`](backend/README.md) to deploy the gateway.

## Security rules (non-negotiable)

- The browser never accesses Sheets or Drive. Everything goes through the gateway, which checks the user's role on every action.
- Spreadsheets and Drive folders are owned by one DELIMa account (handed over each leadership change, ADR-0002) and shared with nobody.
- Users sign in with their DELIMa Google account; only members registered by SUAK get access.
- Gateway configuration (Supabase URL/key, sheet and folder IDs) lives in Apps Script Script Properties, never in `VITE_` variables or the repo.
- Frontend route guards are UX only.
- Official reference numbers are issued only after SUAK approval, inside the gateway's script lock.
- Files are private by default; public documents are published as separate copies.

## Documentation

- [`docs/NOVA_Product_Blueprint_v1.0.pdf`](docs/NOVA_Product_Blueprint_v1.0.pdf): the primary product specification
- [`docs/PHASE-0-REPORT.md`](docs/PHASE-0-REPORT.md): architecture, routes, risks, open decisions
- [`docs/adr/0001-google-sheets-drive-storage.md`](docs/adr/0001-google-sheets-drive-storage.md): storage architecture
- [`docs/adr/0002-delima-sign-in-and-ownership.md`](docs/adr/0002-delima-sign-in-and-ownership.md): DELIMa sign-in, owner account, handover
- [`backend/README.md`](backend/README.md): gateway deployment runbook
- [`supabase/README.md`](supabase/README.md): auth-only configuration

Seed and sample content are DEMO data and must be replaced with real, SUAK-approved content before production.
