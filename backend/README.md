# NO.VA gateway (Google Apps Script)

The only path from the web app to Google Sheets and Drive. See
[ADR-0001](../docs/adr/0001-google-sheets-drive-storage.md) for the why.

```
backend/
  src/main.ts       Apps Script entry points (doGet, doPost, setupSpreadsheet, bootstrap, installTriggers, keepAlive)
  src/router.ts     request pipeline: token → DELIMa domain → registered profile → roles → handler
  src/actions/      one file per area; each action declares its access rule and whether it writes
  src/auth.ts       Supabase token verification (cached ≤ 5 min, never past token expiry)
  src/store.ts      row objects by header name, unique/append-only enforcement, formula-injection guard
  src/sheets-io.ts  SpreadsheetApp implementation of the store's I/O (plain-text cells)
  src/bootstrap.ts  first-run data: role catalogue, first SUAK, DEMO session, DEMO letter types
  src/services.ts   Drive / mail / PDF interfaces (live-services.ts implements them; tests use fakes)
  src/documents.ts  letter and certificate HTML for server-side PDF
  src/email.ts      NoMe message composer (escaped, one copy per recipient)
  src/settings.ts   Tetapan registry (public vs internal, defaults, validation)
  src/setup.ts      idempotent sheet/column creation from shared/schema.ts
  src/lock.ts       withLock() — the "transaction" primitive
  src/config.ts     Script Properties keys
  appsscript.json   manifest (V8, Asia/Kuala_Lumpur, web app = execute as owner)
  build.mjs         bundles src → dist/Code.js (gitignored)
../shared/          schema + API contract shared with the web app
```

## First-time deployment (once per environment: dev, prod)

Do this **signed in as the owner DELIMa account** (ADR-0002). Steps 7–8 double as the
go/no-go check for anonymous web-app access.

1. Create a standalone Apps Script project at <https://script.google.com> → New project.
   Copy its Script ID (Project Settings).
2. Locally: `cp backend/.clasp.json.example backend/.clasp.json` and paste the Script ID.
3. `npx @google/clasp@3 login` (as the owner DELIMa account), then `npm run backend:push`.
4. In the Apps Script editor, run **`setupSpreadsheet`** and approve the permissions.
   It creates the `NO.VA` Drive folder, its subfolders, the **NO.VA — Data** and
   **NO.VA — Audit** spreadsheets, every tab and header, and stores their IDs in Script Properties.
5. Project Settings → Script properties: add `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   (from Supabase → Project Settings → API), plus `BOOTSTRAP_SUAK_EMAIL` (the first SUAK's
   DELIMa address) and optionally `BOOTSTRAP_SUAK_NAME`.
6. Run **`bootstrap`** once. It creates the role list, registers the first SUAK and a
   session named "… (DEMO)" that SUAK replaces by creating and activating the real session. Running it again changes nothing.
   Then run **`installTriggers`** once (daily Supabase keep-alive).
7. Deploy → New deployment → Web app. Execute as: **Me**. Who has access: **Anyone**.
   Copy the `/exec` URL into the web app's `VITE_API_URL`.
   If "Anyone" is not offered, the DELIMa admin blocks anonymous web apps: **stop** (ADR-0002, R2).
8. Check in a private window **not signed in to Google**: the `/exec` URL shows
   `{"ok":true,"data":{"status":"ok",...,"configured":true}}`, not a Google sign-in page.

Re-running `setupSpreadsheet` after a schema change only **adds** tabs/columns. It never
deletes, renames or reorders anything. **Schema v2 (Phase 1)** adds `user_roles.profile_id`:
if you ran setup before Phase 1, run `setupSpreadsheet` again before `bootstrap`.

After the first SUAK signs in, everyone else is registered from **Pengurusan → Pengguna**
in NO.VA. Do not add users by editing the sheets.

## Updating an existing deployment to this release (schema v3)

1. `npm run backend:push` (or paste the new `backend/dist/Code.js` into the Apps Script editor).
2. Run **`setupSpreadsheet`** again: it adds the new tabs (`profile_areas`, `document_types`,
   `notice_groups`, `opr_versions`) and columns. Nothing is deleted.
3. Run **`bootstrap`** again: it adds three DEMO letter/certificate types (safe to repeat).
4. Run **`installTriggers`** again: it adds the 15-minute `sendScheduledNotices` trigger.
5. Authorise the new permissions if asked (sending mail and Drive file creation).
6. Deploy → Manage deployments → edit → **New version** (keep the same deployment/URL).
7. Redeploy the site on Vercel (new security headers and screens).

Then follow `docs/UAT-CHECKLIST.md`.

## Handover to a new owner

Follow the procedure in [ADR-0002](../docs/adr/0002-delima-sign-in-and-ownership.md#ownership-handover-each-change-of-leadership-and-before-the-owner-graduates).
Key points: transfer ownership of the folder, both spreadsheets and this project; the new owner
makes a **new deployment** and re-runs `installTriggers`; update `VITE_API_URL`.

## Updating

`npm run backend:push`, then Deploy → Manage deployments → edit → **New version**.
Keep the same deployment so the `/exec` URL does not change.

## Rules

- Never share the spreadsheets or folders with users. The gateway is the only door.
- Never edit sheets by hand except for recovery, and record the reason.
- Every write that checks-then-writes goes inside `withLock()`.
- Read and write columns by header name (schema), never by position.
- Public actions return only `publicColumns` of published rows.
