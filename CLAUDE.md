# CLAUDE.md — NO.VA Digital Secretariat

`docs/NOVA_Product_Blueprint_v1.0.pdf` is the primary specification. Do not silently change
product scope, roles, module names, approval rules or design direction.

## Binding product decisions
- One modular app, eight modules (M01–M08), public portal + authenticated workspace. JPP IPGKKB only.
- SUAK is the operational owner with full administrative authority inside NO.VA.
- System Administrator is technical only — never inherits content/reference approval powers.
- NO.VA is separate from HiPER; no HiPER integration in v1.0.
- Storage (ADR-0001): Google Sheets for records, Google Drive for files, Google Apps Script
  gateway (`backend/`) as the only server. Supabase is for login ONLY — no tables, storage or functions.
- Sign-in (ADR-0002): DELIMa Google accounts only (`@moe-dl.edu.my`, `shared/identity.ts`), no passwords.
  Access requires an active profile registered by SUAK; the gateway decides, not Supabase.
- Owner of Sheets/Drive/Apps Script is a personal DELIMa account; follow the ADR-0002 handover procedure.

## Engineering rules
- Work one phase at a time (§13). Current phase is recorded in `docs/PHASE-*-REPORT.md`.
- `src/config/modules.ts` is the module/requirement registry; keep requirement IDs in sync with §07.
- Design tokens live only in `src/styles/tokens.css`. Do not use raw hex or default Tailwind colours.
- Blue Editorial Futurism: navy/blue/white, editorial type, restrained visuals. No gradients
  everywhere, glassmorphism, emoji navigation or decorative charts. Illustrations on the landing page only.
- The browser never talks to Sheets/Drive. Add every operation as a gateway action in
  `shared/api-contract.ts` + `backend/src/router.ts`, with an explicit access rule and role check.
- Frontend guards are UX only; authorisation happens in the gateway.
- Schema changes go in `shared/schema.ts` (append columns only, bump SCHEMA_VERSION) and are
  applied by `setupSpreadsheet`. Address columns by header name, never by position.
- Every check-then-write (reference numbers, unique checks, status transitions) runs inside `withLock()`.
- Public actions return only `publicColumns` of published rows; never return `restricted` columns to unauthorised roles.
- Secrets live in Apps Script Script Properties. Never `VITE_`-prefix them; never commit `.env` or `.clasp.json`.
- Never invent letter formats, reference-number formats, retention periods or approval authority —
  use clearly marked configurable placeholders. Never show invented statistics.
- All seed/sample data must be labelled DEMO.

## Working method
1. Inspect before changing. 2. Propose the smallest safe step. 3. Implement only the agreed phase.
4. Run `npm run check`. 5. Report files changed, schema changes, test results, open issues.
Do not claim a feature is complete unless it is implemented and tested.
