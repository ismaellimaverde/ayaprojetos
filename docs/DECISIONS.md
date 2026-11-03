# Lightweight decision register

| Decision | Status | Rationale / boundary |
|---|---|---|
| BOSS identity, AYA organization, full 17-area scope | Approved by supplied prompts | Security update overrides only generic identity/access rules |
| Execute cloud phases 0 and 1; retain all future phases | Approved delegation | No push, deploy, external invite, paid service or live credentials |
| Next.js/TS/React/Tailwind + PostgreSQL, modular monolith | Implemented reversible engineering choice | Follows original proposal; not a separately approved strategic vendor choice |
| Better Auth + Drizzle for identity | Implemented engineering choice | Consolidated password/session/MFA implementation |
| Explicit transactional SQL for domain queries | Implemented | Tenant filters and composite FKs visible and testable |
| MFA for owner/admin and company/project/area managers | Implemented | Restrictive interpretation of administrator requirement |
| Eight-hour sessions; 10-minute sensitive-action freshness; 48-hour invites | Implemented defaults, policy review pending | No hidden permanent grants |
| Explicit project grants; no company-to-project inheritance | Implemented | Least privilege; role templates never imply global access |
| Existing grant versus new invitation = conflict | Implemented | Administrator review avoids silent privilege union |
| Archival instead of permanent business deletion | Implemented | Preserves history; permanent deletion workflow not enabled |
| Local private mailbox only | Implemented, external provider pending | Allows genuine token flows without sending to people |
| Organization locks serialize sensitive domain operations | Implemented | Simpler correctness first; profile before optimizing |
| Resource-level policies and operational responsibility transfer | Planned | Introduce with the corresponding resources/tasks |
| Separate GitHub branch, implementation commit and draft PR against main | Approved by user, 2026-11-03 | Preserve main; no merge or deploy |
| External services, deployment, persistent production grants, costs | Not approved | Ask before acting |

Source provenance: requirements/original.txt is a textual copy from Library read of libfile_a924deefc8c88191aa156216a9e31e1f / file_00000000e71c81f59eb3ee6088825496, all 414 lines. requirements/update.txt copies libfile_bfdf7c7a94288191a5dfe05d01b45754 / file_00000000d778822fbe989fcb2f57bf01, all 289 lines. Both reads reported has_more=false. These are UTF-8 textual copies, not claims of successful binary download. Original transfer failure was download failed; original Library objects were not modified.

## Hosting preparation — 2026-11-03

- Approved direction: Netlify + Supabase Postgres, preserving Better Auth. Parent confirmed new separate Supabase BOSS `ubgabtgrfrixldstnqry` (sa-east-1, PostgreSQL 17); Netlify site remains unconfirmed. No remote service changes, new credentials, migrations, deployment or extra push authorized.
- Implemented locally: private boss_private schema, schema-qualified SQL/Drizzle, RLS/API-role denial, serverless pool/TLS configuration, guarded operator commands, generic opt-in SMTP and Netlify build settings. See HOSTING.md.
- Pending: destination IDs, runtime/operator roles and credentials, exact HTTPS origin, stable auth secret, authorized SMTP/sender, owner identity, approval of remote schema/grants and deployment. No unrelated connected Supabase project may be used.
