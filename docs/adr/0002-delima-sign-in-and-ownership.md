# ADR-0002 — DELIMa accounts for sign-in and data ownership

- **Status:** Accepted (project owner decision, 16 Nov 2026)
- **Resolves:** ADR-0001 open decision #11
- **Amends:** ADR-0001 (owner account, quotas), Blueprint §06 (account lifecycle)

## Decision

1. **Owner account.** The NoVA Drive folder, both spreadsheets and the Apps Script gateway
   are owned by a **personal DELIMa account** (`@moe-dl.edu.my`) held by the person
   responsible for NoVA (normally SUAK).
2. **User sign-in.** Students sign in with **their own DELIMa account** through Supabase
   Auth's **Google provider**. Email/password sign-in is not offered. NoVA never sees or
   stores passwords.

## Sign-in flow

```
"Log masuk dengan DELIMa"
  → Supabase signInWithOAuth('google', hd=moe-dl.edu.my, prompt=select_account)
  → Google (DELIMa) consent → Supabase callback → back to NoVA with a session
  → every gateway call carries the Supabase access token
  → gateway: verify token with Supabase → email must pass isAllowedEmail()
           → email must match an ACTIVE row in `profiles` (registered by SUAK)
           → roles from `user_roles`
```

Three layers, the last one authoritative:

| Layer | Check | Purpose |
| ----- | ----- | ------- |
| Google | `hd=moe-dl.edu.my` | UX hint only: shows DELIMa accounts first. Not a security control. |
| Gateway | `isAllowedEmail()` (`shared/identity.ts`), exact domain match | Rejects any non-DELIMa Google account. |
| Gateway | Active profile in `profiles` + roles in `user_roles` | Invitation only. A valid DELIMa account that SUAK has not registered sees "akaun belum didaftarkan" and receives no data. |

Registering a member = SUAK adds their DELIMa email in Pengurusan (ADM-01). On first sign-in
the gateway links the Supabase user id to that profile. Deactivating the profile removes
access on the next request (AT-12), whatever Supabase says.

## Consequences of a personal DELIMa owner account

**Benefits.**
- Google Workspace quotas instead of personal-Gmail quotas: about **1,500 email recipients/day**
  for NoMe and 100,000 outbound requests/day for the gateway (check the current Apps Script
  quota page).
- The owner and every user are in the same Google domain, so files can be handed over inside it.

**Risks and required mitigations.**

| # | Risk | Mitigation |
| - | ---- | ---------- |
| R1 | **The owner graduates or leaves and the DELIMa account is suspended or deleted. Every file, the spreadsheets and the gateway go with it.** | Mandatory handover (below) before the owner's last semester ends. Recommended: give **one** long-term recovery holder (e.g. the JPP advisor's DELIMa account) *Editor* access to the `NoVA` folder, recorded as the §16 #10 recovery holder. |
| R2 | The DELIMa (MOE) Workspace admin may block web apps with **anonymous access** ("Who has access: Anyone"). The public portal needs it. | **Go/no-go check before Phase 1** (below). If blocked, the public portal cannot read from the gateway; alternatives need a new decision. |
| R3 | The admin may block student access to Google Cloud Console, which is needed to create the OAuth client for Supabase's Google provider. | The OAuth client can be created under **any** Google account (it only identifies the app). Publish the consent screen as *External / In production* with scopes `openid email profile`, which need no Google verification. |
| R4 | The domain admin can see, retain or suspend the owner account's data. | Accepted: NoVA records are institutional records of JPP IPGKKB. Do not store data the institution should not hold. |
| R5 | Per-user Drive storage caps set by the domain admin are unknown. | Check the owner's storage in Drive settings; enforce upload limits and compress OPR photos. |
| R6 | Supabase free projects pause when idle (unchanged from ADR-0001). | Daily `keepAlive` trigger; confirm in the dashboard. |

## Go/no-go checks (before Phase 1 work starts)

Run as the chosen owner DELIMa account:

1. **Anonymous web app allowed?** Deploy the gateway (backend/README.md). In Deploy → Web app,
   is **"Anyone"** offered for "Who has access"? Open the `/exec` URL in a private window that is
   **not** signed in to Google. It must show `{"ok":true,...}`, not a Google sign-in page.
2. **Drive and Sheets creation works:** `setupSpreadsheet` completes.
3. **Mail allowed?** (needed by Phase 2) `MailApp.getRemainingDailyQuota()` returns a number above 0.
4. **OAuth client** for the Supabase Google provider can be created (under any account, R3).

If check 1 fails, stop and decide before building further. That is the only blocker with no
workaround inside this architecture.

## Ownership handover (each change of leadership, and before the owner graduates)

Old owner = O, new owner = N (both DELIMa).

1. O: in Drive, share the `NoVA` folder with N as Editor, then **Transfer ownership** of the
   folder, both spreadsheets and the Apps Script project to N. Transfers within the same
   Workspace domain are allowed. Check that no files are left owned by O.
2. N: open the Apps Script project → Project Settings → confirm the Script Properties are present.
3. N: Deploy → **New deployment** (Web app, Execute as: Me, Who has access: Anyone). The
   gateway must now run as N, not O.
4. N: run `installTriggers` (triggers belong to the user who created them and do not transfer).
5. Update `VITE_API_URL` in Vercel to the new `/exec` URL and redeploy the site. Verify `/exec`
   health and a sign-in.
6. O: archive the old deployment. In NoVA, SUAK updates roles (O loses SUAK, N gains it); this
   is recorded in the audit log.
7. Record the handover (date, O, N, recovery holder) in `system_settings` / the session archive.
