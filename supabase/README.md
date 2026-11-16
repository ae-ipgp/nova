# Supabase — sign-in only (DELIMa via Google)

NO.VA uses Supabase **only for sign-in** (ADR-0001, ADR-0002). No tables, storage buckets or
edge functions. Users sign in with their **DELIMa Google account** (`@moe-dl.edu.my`); NO.VA
never handles passwords.

What Supabase holds: auth users (email, Google identity link) and sessions.
What it does **not** hold: profiles, roles, membership or any records. Those live in Sheets.
Whether someone may use NO.VA is decided by the gateway (domain check + registered profile),
not by Supabase.

## Setup (Phase 1)

1. **Google OAuth client** (Google Cloud Console, any Google account; see ADR-0002 R3):
   - OAuth consent screen: External, publishing status *In production*, scopes `openid`,
     `email`, `profile` only (no verification needed for these).
   - Credentials → OAuth client ID → Web application.
     Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
2. **Supabase → Authentication → Providers:** enable **Google** with that client ID/secret.
   Disable **Email** (password) sign-in. Leave "Allow new users to sign up" **on**: any Google
   user can create a Supabase auth record, but the gateway gives nothing to anyone who is not a
   registered DELIMa member, so no admin key is needed to pre-create users.
3. **Authentication → URL configuration:** Site URL = the production site. Redirect URLs:
   `http://localhost:5173/auth/callback`, `https://<production-domain>/auth/callback` and, for
   Vercel previews, `https://*-<team>.vercel.app/auth/callback`.
4. The web app calls `signInWithOAuth({ provider: 'google', options: { queryParams: { hd: 'moe-dl.edu.my', prompt: 'select_account' } } })`.
   `hd` only pre-selects DELIMa accounts; enforcement is in the gateway.
5. Free projects pause after a period of inactivity. The gateway's daily `keepAlive` trigger
   pings `/auth/v1/health`; confirm in the dashboard that the project stays active.

Browser config: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (public by design). The Google
client secret is entered only in the Supabase dashboard.
