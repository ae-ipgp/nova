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

## Rules added in the release-candidate work
- Delegated capabilities ("Jika diberi") are `profile_areas` (`shared/domain.ts` AREAS). Reference-number
  approval is never an area: SUAK only. UI checks use `useCan()`; the gateway is authoritative.
- Letter/certificate wording lives only in `document_types` templates approved by SUAK. The code adds no
  salutation, closing, motto or format; sample types are `is_demo` and print a CONTOH banner.
- Reference numbers are issued only inside `ref.approve` under the lock: pick number → render PDF →
  then write. Numbers are voided, never edited, deleted or reused (`mutableColumns` on the register).
- Public actions return only `publicColumns` of published rows (tests assert exact key sets).
  Public attendance defaults to aggregate; reasons and emails never leave the gateway.
- NoMe: one message per recipient, `confirmCount` must match, quota is checked first, per-recipient
  idempotency keys make retries safe. Email text is escaped.
- e-OPR one-page budget is `shared/opr-html.ts` (4,000 chars; 2,500 with photos), measured in Chromium.
  The web preview and the PDF use the same renderer. Re-measure if the layout changes.
- Uploads: allow-listed type, size cap and magic-byte check (`readFile`). Images are shrunk in the browser.
- Content-Security-Policy is in `vercel.json` (no inline scripts, fonts are not inlined). Test with a
  production build, not the dev server.
- Mascot images are optional static PNGs in `public/mascot/`; see `docs/MASCOT.md`. Never block a screen on them.

## Working method
1. Inspect before changing. 2. Propose the smallest safe step. 3. Implement only the agreed phase.
4. Run `npm run check`. 5. Report files changed, schema changes, test results, open issues.
Do not claim a feature is complete unless it is implemented and tested.
