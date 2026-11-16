# Supabase — authentication only

NO.VA uses Supabase **only for sign-in** (ADR-0001). No tables, storage buckets or edge
functions are used; all data lives in Google Sheets/Drive behind the Apps Script gateway.

What Supabase holds: user accounts (email, password hash or OAuth link), sessions, and MFA
factors. What it does **not** hold: profiles, roles, JPP membership or any records. Roles live
in the `user_roles` sheet, keyed by the Supabase user id.

## Project settings (Phase 1)

- Authentication → Providers: Email (password). Optionally Google, so members can use their
  existing Google accounts.
- Authentication → Sign-ups: **disabled**. Accounts are created by SUAK invitation only
  (ADM-01), sent by the gateway using the service-role key held in Apps Script.
- Authentication → URL configuration: site URL and redirect URLs for each environment.
- MFA: enable TOTP and require it for SUAK (Blueprint §11).
- Free projects pause after a period of inactivity. The gateway's daily `keepAlive` trigger
  pings `/auth/v1/health`; confirm in the dashboard that the project stays active.

Browser config: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public by design).
The service-role key is **never** placed in the web app or this repository.
