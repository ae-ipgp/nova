# CLAUDE.md — NoVA (Notion of Virtual Assistance)

`docs/NOVA_Product_Blueprint_v1.0.pdf` is the primary specification. Do not silently change
product scope, roles, module names, approval rules or design direction.

## Binding product decisions
- One modular app, eight modules (M01–M08), public portal + authenticated workspace. JPP IPGKKB only.
- SUAK is the operational owner with full administrative authority inside NoVA.
- System Administrator is technical only — never inherits content/reference approval powers.
- NoVA is separate from HiPER; no HiPER integration in v1.0.
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
  **Owner-approved update (NoVA redesign):** a friendlier card-based look (20–28 px radii, soft shadows, curved navy module rail,
  light dashboard with the mascot). The palette and the no-decorative-charts rule still apply.
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

## Rules added with the HiPER-parity layer
- Colours come only from tokens. Themes (Mutiara, Lazuardi, Zamrud, Automatik) override the same token names in
  `src/styles/themes.css`; use `text-heading`/`text-link` for text and `bg-navy`/`bg-blue` for surfaces, never the reverse.
  Add a pair to `tests/themes.test.ts` when you add a new text/surface combination.
- Every visible string goes through `t('Malay source')` (`src/i18n`). Malay is the source language; English lives in
  `src/i18n/en/*.ts`. Never split a sentence around a value: use `t('… {n} …', { n })`. Labels in tables declared at module level are
  translated where they are rendered. Run `node scripts/i18n.mjs missing` (also a test) after adding text.
- Letters, certificates, e-mails and PDFs are **not** translated; only the interface is.
- Logo, favicon and brand colours are managed settings (`brand_*`); change them only through `admin.brand.set`.
- Page visibility (`vis_pub_*`, `vis_ws_*`) is enforced in the gateway router for everyone but SUAK; the UI only mirrors it.
- System e-mails (`backend/src/notify.ts`) are best-effort and must never block or roll back the action that triggers them.
  Security notices cannot be switched off by the user.
- Search is role-filtered in the gateway (`search.global`); the public search returns published rows only.

## Rules added with the NoVA rename and editable content
- The product is **NoVA** (Notion of Virtual Assistance), formerly NO.VA. Never write "NO.VA". The logo files are
  `public/brand/logo-main.png` (nav, favicon source) and `logo-full.png` (footer); SUAK can still override the main logo in Tetapan.
- Editable page content: wrap texts in `<Cms id="page.section.name" ms="Malay source" />`, buttons/links in `<CmsLink>`,
  photos in `<CmsImage>`, downloads in `<CmsFile>`, repeating blocks with `useCmsList`. SUAK edits them in "Mod suntingan"
  (`site_content` sheet; `admin.content.set`). Ids are stable: never rename one without a migration. Links are validated
  (`https://`, `/path`, `mailto:`, `tel:` only).
- Contacts, phone numbers, the JPP portal link and social links live in Tetapan (not in the page code). Phone links are built
  by `src/lib/phone.ts`. The visitor counter only increments a number (`public.visit`); nothing about the visitor is stored.
- The workspace and the public site share one header (`SiteHeader`). The Google profile name and photo come from the
  Supabase token (`useAuth().identity`); the CSP allows `https://*.googleusercontent.com` for images only.
- English term: "Pejabat Setiausaha Agung Kehormat" = "The Secretary's Office". The role "Sekretariat" stays "Secretariat".

## Working method
1. Inspect before changing. 2. Propose the smallest safe step. 3. Implement only the agreed phase.
4. Run `npm run check`. 5. Report files changed, schema changes, test results, open issues.
Do not claim a feature is complete unless it is implemented and tested.
