# CLAUDE.md — NO.VA Digital Secretariat

`docs/NOVA_Product_Blueprint_v1.0.pdf` is the primary specification. Do not silently change
product scope, roles, module names, approval rules or design direction.

## Binding product decisions
- One modular app, eight modules (M01–M08), public portal + authenticated workspace. JPP IPGKKB only.
- SUAK is the operational owner with full administrative authority inside NO.VA.
- System Administrator is technical only — never inherits content/reference approval powers.
- NO.VA is separate from HiPER; no HiPER integration in v1.0.

## Engineering rules
- Work one phase at a time (§13). Current phase is recorded in `docs/PHASE-*-REPORT.md`.
- `src/config/modules.ts` is the module/requirement registry; keep requirement IDs in sync with §07.
- Design tokens live only in `src/styles/tokens.css`. Do not use raw hex or default Tailwind colours.
- Blue Editorial Futurism: navy/blue/white, editorial type, restrained visuals. No gradients
  everywhere, glassmorphism, emoji navigation or decorative charts. Illustrations on the landing page only.
- Frontend guards are UX; enforce authorisation with RLS + server functions.
- Service-role and email keys are server-only. Never `VITE_`-prefix them; never commit `.env`.
- Use migrations for every schema change. Use transactions/unique constraints for reference issuance.
- Never invent letter formats, reference-number formats, retention periods or approval authority —
  use clearly marked configurable placeholders. Never show invented statistics.
- All seed/sample data must be labelled DEMO.

## Working method
1. Inspect before changing. 2. Propose the smallest safe step. 3. Implement only the agreed phase.
4. Run `npm run check`. 5. Report files changed, schema changes, test results, open issues.
Do not claim a feature is complete unless it is implemented and tested.
