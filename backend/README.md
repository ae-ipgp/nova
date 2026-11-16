# NO.VA gateway (Google Apps Script)

The only path from the web app to Google Sheets and Drive. See
[ADR-0001](../docs/adr/0001-google-sheets-drive-storage.md) for the why.

```
backend/
  src/main.ts       Apps Script entry points (doGet, doPost, setupSpreadsheet, installTriggers, keepAlive)
  src/router.ts     action dispatch, access rules, error envelope
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
5. Project Settings → Script properties: add `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
6. Run **`installTriggers`** once (daily Supabase keep-alive).
7. Deploy → New deployment → Web app. Execute as: **Me**. Who has access: **Anyone**.
   Copy the `/exec` URL into the web app's `VITE_API_URL`.
   If "Anyone" is not offered, the DELIMa admin blocks anonymous web apps: **stop** (ADR-0002, R2).
8. Check in a private window **not signed in to Google**: the `/exec` URL shows
   `{"ok":true,"data":{"status":"ok",...,"configured":true}}`, not a Google sign-in page.

Re-running `setupSpreadsheet` after a schema change only **adds** tabs/columns. It never
deletes, renames or reorders anything.

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
