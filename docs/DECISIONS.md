# Lightweight decision register

| Decision | Status | Rationale / boundary |
|---|---|---|
| BOSS identity, AYA organization, full 17-area scope | Approved by supplied prompts | Security update overrides only generic identity/access rules |
| Execute cloud phases 0 and 1; retain all future phases | Approved delegation | No push, deploy, external invite, paid service or live credentials |
| Next.js/TS/React/Tailwind + PostgreSQL, modular monolith | Implemented reversible engineering choice | Follows original proposal; not a separately approved strategic vendor choice |
| Better Auth + Drizzle for identity | Implemented engineering choice | Consolidated password/session/MFA implementation |
| Explicit transactional SQL for domain queries | Implemented | Tenant filters and composite FKs visible and testable |
| Mandatory administrative MFA | Superseded by explicit user decision, 2026-11-03 | MFA is now optional for all BOSS roles; existing enrollments remain intact |
| Eight-hour sessions; 10-minute sensitive-action freshness; 48-hour invites | Implemented defaults, policy review pending | No hidden permanent grants |
| Explicit project grants; no company-to-project inheritance | Implemented | Least privilege; role templates never imply global access |
| Existing grant versus new invitation = conflict | Implemented | Administrator review avoids silent privilege union |
| Archival instead of permanent business deletion | Implemented | Preserves history; permanent deletion workflow not enabled |
| Email transport | Resend production delivery approved and verified; local mailbox retained for development | Activation/recovery delivered to approved owner; no broad send authorization |
| Organization locks serialize sensitive domain operations | Implemented | Simpler correctness first; profile before optimizing |
| Resource-level policies and operational responsibility transfer | Planned | Introduce with the corresponding resources/tasks |
| Separate GitHub branch, implementation commit and draft PR against main | Approved by user, 2026-11-03 | Preserve main; no merge or deploy |
| BOSS-specific Netlify/Supabase provisioning and deployment | Subsequently approved and implemented | Limited to BOSS; no additional paid service or unrelated project changes authorized |

Source provenance: requirements/original.txt is a textual copy from Library read of libfile_a924deefc8c88191aa156216a9e31e1f / file_00000000e71c81f59eb3ee6088825496, all 414 lines. requirements/update.txt copies libfile_bfdf7c7a94288191a5dfe05d01b45754 / file_00000000d778822fbe989fcb2f57bf01, all 289 lines. Both reads reported has_more=false. These are UTF-8 textual copies, not claims of successful binary download. Original transfer failure was download failed; original Library objects were not modified.

## Historical hosting preparation — 2026-11-03

- Approved direction: Netlify + Supabase Postgres, preserving Better Auth. Parent confirmed new separate Supabase BOSS `ubgabtgrfrixldstnqry` (sa-east-1, PostgreSQL 17); Netlify site remains unconfirmed. No remote service changes, new credentials, migrations, deployment or extra push authorized.
- Implemented locally: private boss_private schema, schema-qualified SQL/Drizzle, RLS/API-role denial, serverless pool/TLS configuration, guarded operator commands, generic opt-in SMTP and Netlify build settings. See HOSTING.md.
- Pending: destination IDs, runtime/operator roles and credentials, exact HTTPS origin, stable auth secret, authorized SMTP/sender, owner identity, approval of remote schema/grants and deployment. No unrelated connected Supabase project may be used.

## User-approved optional MFA — 2026-11-03

User explicitly requested no two-step authentication requirement. This supersedes the earlier prompt requirement for BOSS only. Remove administrative enrollment gates and MFA checks on sensitive actions; retain recent password login, verified email, RBAC, session controls and rate limits. Existing voluntarily enrolled users retain their TOTP challenge and data. Optional setup remains available without first-access redirection. No Netlify/Supabase/GitHub account security or visitor protection changes. Tradeoff accepted: a leaked password can provide access without a second factor for users who do not opt in.

## Confirmed launch decisions — 2026-11-03 03:10:55 UTC

- Production BOSS visitor access public and previews private: explicitly approved and verified; application auth/verified email/RBAC remain enforced. No secret expansion to previews.
- Strict PostgreSQL TLS with the official dashboard CA and its independently verified SHA-256 pin: configured; source and fingerprint in HOSTING.md.
- Runtime database SCRAM verifier changed from 16384 to compatible 4096 iterations for the same existing high-entropy password; no credential rotation, role/grant change or application-user hash change. See [Supavisor #1222](https://github.com/supabase/supavisor/pull/1222). Custom iteration support must be confirmed for the actual deployed pooler before use.
- Owner recovery and verification messages: both reported Delivered by the exact BOSS Resend key. User completion of verification, password choice and first login remains unconfirmed. MFA stays optional.
- This checkpoint is documentation-only and committed locally; no push or new deployment is authorized by this documentation task.
