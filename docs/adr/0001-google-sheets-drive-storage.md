# ADR-0001 — Google Sheets & Drive for data and files; Supabase for login only

- **Status:** Accepted (project owner decision, 16 Nov 2026)
- **Supersedes:** Blueprint §09 "Supabase: Auth, PostgreSQL, Storage and server functions"

## Decision

| Concern            | Blueprint v1.0               | NO.VA now                                            |
| ------------------ | ---------------------------- | ---------------------------------------------------- |
| Records            | Supabase PostgreSQL          | **Google Sheets** (two spreadsheets: Data, Audit)    |
| Files              | Supabase Storage             | **Google Drive** (private folders under `NO.VA/`)    |
| Server logic       | Supabase server functions    | **Google Apps Script** web app (the "gateway")       |
| Email (NoMe)       | Resend                       | Apps Script `MailApp` from the organisation account (Phase 2) |
| Login              | Supabase Auth                | **Supabase Auth** (unchanged, nothing else stored there) |
| Hosting            | Vercel                       | Vercel (static site only)                            |

The motivation is to run on free Google storage under an account the organisation already
controls, without database size, storage bucket or usage-tier limits to monitor.

## Architecture

```
 Browser (React SPA on Vercel)
   │  1. sign in ───────────────▶ Supabase Auth  (identity only: email + password/OAuth)
   │  ◀── access token (JWT) ───┘
   │
   │  2. POST {action, payload, token}   (text/plain, simple CORS)
   ▼
 Apps Script web app — "gateway"   (Execute as: organisation account)
   ├─ verifies token with Supabase  (Phase 1, result cached briefly)
   ├─ loads roles from user_roles sheet, checks the action's access rule
   ├─ LockService script lock for every read-check-write
   ├─ SpreadsheetApp ──▶ NO.VA — Data  /  NO.VA — Audit   (never shared)
   ├─ DriveApp       ──▶ NO.VA/ folders                   (never shared, except Awam)
   └─ MailApp        ──▶ NoMe email (Phase 2)
```

**The browser never touches Sheets or Drive directly.** The spreadsheets and folders are
owned by one organisation Google account and shared with nobody; the gateway runs as that
account and is the only door in.

## How each blueprint guarantee is kept

| Blueprint requirement (Postgres design)            | Implementation on Sheets / Drive |
| -------------------------------------------------- | -------------------------------- |
| RLS on every client-reachable table (§09, §11)     | Sheets are not client-reachable at all. Every gateway action declares `access` (public / authenticated + roles); public actions return only `publicColumns` of published rows. |
| Transaction for approval + number issuance (§10)   | `withLock()` (Apps Script `LockService` script lock) wraps read → check → append. Reference register is re-read inside the lock before issuing. |
| `UNIQUE` constraints (§10)                         | `unique` in `shared/schema.ts`, checked inside the lock on every insert/update. |
| Migrations, no manual schema edits (§09)           | `shared/schema.ts` + idempotent `setupSpreadsheet()`: adds tabs/columns, never deletes or reorders. `SCHEMA_VERSION` recorded. Columns are read by header name. |
| Private storage + expiring signed URLs (§09, §11)  | Private Drive folders. Restricted files are streamed through the gateway after a permission check (no shareable link). Publishing copies the file to `Awam (diterbitkan)` with "anyone with link — view"; unpublishing removes that copy. |
| Append-only audit log (§10, §11)                   | Separate **Audit** spreadsheet; the gateway only appends. Sheets version history is a secondary trail. |
| Secrets server-side only (§09)                     | Apps Script Script Properties. The web bundle holds only the Supabase URL/anon key and the gateway URL. |
| Separate dev and prod (§13)                        | Two Apps Script deployments + two sets of spreadsheets/folders (setup run once per environment). |
| Backup and tested restore (§11, AT-14)             | Scheduled copy of both spreadsheets into `Sandaran/` (Phase 5) + Drive version history; restore drill in Phase 6. |

## Limits that still exist (smaller, but not zero)

These are published Google/Supabase quotas at the time of writing; check the current
values before launch. All are far above expected JPP usage except where noted.

| Limit | Value | Impact for NO.VA |
| ----- | ----- | ---------------- |
| Cells per spreadsheet | 10 million | Years of headroom. Audit log lives in its own spreadsheet; can roll over per session. |
| Apps Script execution time | 6 min per call | Irrelevant for normal requests (≈ 1 s). |
| Simultaneous executions | ~30 per user | Gateway runs as one account; bursts beyond this queue or fail with `BUSY`. Fine for JPP scale. |
| Email recipients per day (MailApp) | ~100 personal Gmail / ~1,500 Google Workspace | **Matters.** A personal Gmail owner limits NoMe to ~100 recipients/day. |
| Drive storage | 15 GB personal / pooled for Workspace | Enough for documents; enforce upload size and image compression for OPR photos. |
| Request/upload size | Gateway caps bodies at 10 MB | Upload limit per file ≈ 7 MB after base64. |
| Supabase free tier | 50,000 monthly active users; **projects pause after ~7 days without activity** | Pausing would stop logins. A daily `keepAlive` trigger pings Supabase; confirm in the dashboard that it prevents pausing. |
| Latency | Apps Script ≈ 0.5–2 s per call, more on cold start | Blueprint NFR p95 < 3 s is achievable but tight: use CacheService for public reads, batch actions per screen, cache on the client. |

## Consequences and risks

1. **Owner account is the single point of control.** It must be an organisation account
   handed over between sessions, **not** a personal student account (student accounts are
   removed after graduation, taking every file with them). See open decision below.
2. **Manual edits bypass every rule.** Anyone with edit access to the spreadsheets bypasses
   locks, uniqueness, role checks and audit. Only the owner account may hold access, and hand
   edits are for recovery only, with a reason recorded.
3. **Workspace for Education admin policies** may block web apps with anonymous access or
   external sharing. This must be checked before choosing an institutional account.
4. **Concurrency is serialised** by one script lock. Correct and simple, but writes queue
   under load. Acceptable at JPP scale.
5. Supabase is now a light dependency: if it is unavailable, users cannot sign in, but public
   pages served by the gateway keep working.

## Open decision (added to Blueprint §16)

**#11 — Which Google account owns NO.VA's spreadsheets, Drive folders and Apps Script?**
Options: (a) a dedicated organisation Gmail account (simplest, works with anonymous web
apps; ~100 email recipients/day, 15 GB); (b) an institution-managed Workspace account (higher
quotas; subject to the IT admin's policies). Owner: SUAK + institution. Needed before Phase 1
deployment.
