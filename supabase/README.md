# Supabase

Backend for NO.VA (Auth, PostgreSQL, Storage, Edge Functions). **Empty in Phase 0.**

| Folder        | Purpose                                                       | Phase |
| ------------- | ------------------------------------------------------------- | ----- |
| `migrations/` | Versioned schema, constraints, RLS policies. Never edit prod by hand. | 1+    |
| `functions/`  | Server-side critical operations: approve reference, send NoMe, publish, issue PDF. | 2+    |
| `seed.sql`    | DEMO-only seed data (clearly labelled, removable before production). | 1     |

Rules (Blueprint §09–§11):

- RLS enabled on every table reachable from the client SDK.
- Reference numbers are generated inside a database transaction/sequence, never in the frontend.
- Storage buckets are private by default; restricted files use expiring signed URLs.
- `audit_logs` is append-only for ordinary users.
- Service-role and email-provider keys live only in function secrets.
