# Verification

`npm test` creates and recreates only the dedicated boss_test and boss_hosting_test databases using the configured local PostgreSQL role. It applies the real SQL migration and exercises Better Auth and transactional services. Do not run against a shared production PostgreSQL administrative connection.

`npm run test:e2e` creates only boss_e2e, starts Next on port 3100 and uses system Chromium (override CHROMIUM_PATH). Test-only users are clearly labeled; credentials are generated per run and stored under ignored .data. It tests real password login, mandatory MFA enrollment, TOTP, project creation, invite registration, email verification, acceptance, direct API isolation and revocation using the same active browser session. It never sends mail externally.

Unit/integration scenarios: 17-area template persistence; MFA gate; forbidden area/project/tenant; authorized aggregate filtering; read-only finance; roles across projects; manager/global boundary; self-escalation; immediate revocation and audit; last owner; recent authentication; expired/mismatched/reused invites; suspension; cross-tenant FK; real password hashes and sessions.

Quality commands: `npm run lint`, `npm run typecheck`, `npm run build`. Results and outstanding limits are updated after the final run. Financial calculations, imports/idempotency, connectors and linked business dashboards are future-phase acceptance tests, not tests claimed passed here.

## Results — 2026-11-03

- `npm test`: 10/10 passed against real PostgreSQL; no skipped tests.
- `npm run test:e2e`: 1 complete Chromium scenario passed (33.1 s execution / 44.7 s total). Includes login, TOTP enrollment, invalidation of pre-MFA sessions, separate projects, invitation and verification, forbidden API calls, existing-session revocation, password recovery with session invalidation, and a subsequent administrator MFA login challenge.
- `npm run lint`: passed with no warnings after React effect and navigation fixes.
- `npm run typecheck`: passed.
- `npm run build`: final production build passed, including TypeScript and all 7 generated pages.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities reported at execution time; not a guarantee against future advisories.

Earlier E2E attempts failed due to cold compilation timeout and a dynamic checked-checkbox locator; those test issues were corrected and the complete flow was rerun successfully. No feature failure is hidden by skipped tests.

Not run / not available: financial calculation suites, import idempotency, external providers, production deployment, load/penetration/restore tests. These are explicitly future-phase or production-gate work. Main application database has no real user or business records; tests use separate databases.

## Netlify / Supabase compatibility — 2026-11-03

- Latest `npm test`: 15/15 passed, no skips. Includes 10 foundation scenarios and five hosting scenarios: TLS/pool configuration, operator guards, HTTPS/secret validation, local-mail prohibition on hosting, and real PostgreSQL private-schema/RLS isolation. Test-only roles have no login credentials and are removed after the isolated test.
- Latest Chromium E2E result: passed after the private-schema, mail transport, and registration error handling changes (`test-results/.last-run.json`, 00:28 UTC). Same complete real-auth/MFA/invitation/verification/recovery/revocation flow described above, using local mail only.
- Final lint, TypeScript, production build (7 pages), and `git diff --check`: passed. Production dependency audit: zero reported vulnerabilities.
- `check:hosting` intentionally rejects the present development configuration: localhost database, non-HTTPS development auth origin, and local mail. This is an expected release blocker, not a remote connectivity test.
- Not executed: actual Supavisor connection/TLS handshake, Netlify adapter deployment, SMTP delivery, remote migrations/grants, and remote owner bootstrap. The bootstrap CLI's new cross-connection lock/target check has been reviewed but not exercised as a full CLI flow. No remote credential or service mutation was performed.

The original local development database remains in its legacy public schema; migrations explicitly refuse to silently duplicate or move it. The compatibility tests use fresh private-schema databases. A deliberate local data move or a separately selected fresh development database is needed before using the updated branch interactively against that original database.
