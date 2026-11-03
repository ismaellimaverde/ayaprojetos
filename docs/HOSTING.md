# Netlify + Supabase Postgres — preparation and provisioning status

User selected this hosting direction on 2026-11-03. Parent confirmed the new separate Supabase project BOSS (`ubgabtgrfrixldstnqry`, `sa-east-1`, PostgreSQL 17, ACTIVE_HEALTHY), with public initially empty. Netlify site selection/login remains pending. Neither Arpoador Experience nor Agenda Parental is authorized for BOSS. At the initial preparation checkpoint no remote changes had been performed. The authorized database provisioning checkpoint below supersedes that initial status; there is still no deployment or email delivery by this executor.

## Runtime

Netlify's supported OpenNext adapter handles Next.js App Router and Node route handlers. `netlify.toml` uses Node 24, `npm run build` and `.next`. No static export, custom catch-all redirect, migration or bootstrap in build hooks. No Netlify site ID or domain is invented or embedded. The platform adapter build remains untested until an approved target exists.

Keep Better Auth. Supabase supplies PostgreSQL only; Supabase Auth does not create BOSS identities and its email templates/provider do not automatically send Better Auth emails. No Supabase SDK, publishable key or service-role key is needed by this application, including its browser bundle.

Use the confirmed project's Supavisor **transaction** connection for DATABASE_URL, with a dedicated BOSS runtime role. Pool max defaults to 1 per warm hosted instance, connection/idle timeout 10 seconds. node-postgres and the Better Auth Drizzle path use unnamed parameterized queries; no `.prepare(name)` or session-level search_path dependency. All runtime SQL and ORM tables explicitly address boss_private. Transactions reserve and release one connection. TLS verifies certificates; URL parameters cannot disable verification; a provider CA can be supplied if required. No `rejectUnauthorized:false` fallback.

## Database isolation and operator workflow

`scripts/database-setup.ts` runs only from the operator migration command or isolated local fixtures. It creates boss_private, applies the existing application migrations inside that schema, revokes schema/table/sequence access from PUBLIC and existing anon/authenticated/service_role roles, and enables RLS on every BOSS table. Keep boss_private **out of Data API exposed schemas**; do not change unrelated projects' Data API configuration.

An existing non-superuser/non-BYPASSRLS runtime role receives only schema USAGE, table DML and sequence access. A role-specific RLS policy allows that trusted application server to execute its own scoped authorization queries. This is defense against Data API exposure, **not tenant-aware RLS**: tenant/project enforcement still belongs to BOSS transactional services. Do not give that DB credential to clients. No role, password or persistent remote grant has been created by this preparation. Grant changes are reviewable in the operator script and require approval for the actual target.

Migrations use a separate DATABASE_MIGRATION_URL through direct or session-mode connection. They refuse remote execution unless ALLOW_REMOTE_MIGRATION=yes and CONFIRMED_DATABASE_HOST matches exactly, and refuse hosted build/request contexts. Existing public.schema_migrations triggers a stop for an explicitly reviewed data/schema move; no silent copy, move or reset of legacy data. This also applies to the original local development database. All compatibility tests use fresh isolated local databases.

Before a remote run: confirm target/ref and backup policy, inspect existing schemas/exposed schemas and roles, review the private-schema changes and runtime grants, then authorize the migration. Never reuse the unrelated projects merely because they are connected. Never pass operator credentials/flags to Netlify Functions.

## Email and first owner

MAIL_MODE=local is development-only and fails on NETLIFY=true or BOSS_HOSTED=true. It remains a private filesystem mailbox with no HTTP route. It cannot support email verification or recovery on serverless hosting.

A generic SMTP transport is prepared (no provider chosen). It requires explicit EMAIL_DELIVERY_ENABLED=true plus approved SMTP credentials and verified sender; port 465 uses TLS and 587 requires STARTTLS with certificate validation. Delivery is awaited, time-bounded and never falls back to disk. Provider acceptance does not guarantee inbox delivery. No external send has been tested or authorized. Provider/domain verification, limits, cost, credentials and real test recipient remain decisions.

After the schema, exact HTTPS auth origin and SMTP are approved/configured, run `npm run bootstrap` once from a trusted operator environment. Supply chosen owner name/email/password through private stdin, not a web endpoint, build log, shell history or chat. DATABASE_OPERATOR_URL must use direct/session mode and the same database as runtime; the command holds a session advisory lock across signup and organization creation, verifies the runtime connection shares that lock, refuses existing membership, and requires explicit ALLOW_REMOTE_BOOTSTRAP=yes + confirmed host for remote use. A failure must be inspected privately before retry; no automatic promotion of existing accounts. Owner must verify email before administration; TOTP is optional by the later user decision. This initial preparation checkpoint preceded real owner creation, recorded below.

## Variables (names only)

Server runtime: DATABASE_URL, DATABASE_POOL_MAX, DATABASE_SSL_MODE, optional DATABASE_SSL_CA, BETTER_AUTH_SECRET, BETTER_AUTH_URL, MAIL_MODE, EMAIL_DELIVERY_ENABLED, MAIL_FROM, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD. NETLIFY is provided by Netlify; BOSS_HOSTED can enforce the same guards elsewhere. No secret uses NEXT_PUBLIC_. Use the host's protected secret mechanism, with proper function scope; never netlify.toml or Git. BETTER_AUTH_SECRET must remain stable to preserve encrypted MFA material.

Operator only: DATABASE_MIGRATION_URL, DATABASE_OPERATOR_URL, DATABASE_RUNTIME_ROLE, ALLOW_REMOTE_MIGRATION, ALLOW_REMOTE_BOOTSTRAP, CONFIRMED_DATABASE_HOST. Different preview and production environments must have separately approved database/origin/secret scopes; do not automatically authorize arbitrary deploy-preview origins or connect PR previews to live data.

`npm run check:hosting` validates configuration only and makes no network request. It intentionally fails against the current localhost/local-mail configuration. A successful check is not authorization to deploy.

## Documentation checked

- Supabase changelog HTML index, including the 2026-10-30 Data API default-grants change: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically . Direct ORM access is unaffected; existing grants still require inspection. No reliance on new default exposure settings.
- Upcoming project HTTP API TLS-cipher removal: https://supabase.com/changelog/cbc-tls-ciphers-deprecated . This app uses PostgreSQL TLS and Node 24, not legacy HTTP clients.
- Connection modes: https://supabase.com/docs/guides/database/connecting-to-postgres ; https://supabase.com/docs/guides/database/drizzle ; https://supabase.com/docs/guides/troubleshooting/disabling-prepared-statements-qL8lEL . Drizzle docs' `prepare:false` example is for postgres-js; this app retains node-postgres unnamed queries.
- https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/ ; https://docs.netlify.com/build/functions/configuration/
- https://node-postgres.com/features/ssl ; https://node-postgres.com/features/queries ; https://nodemailer.com/smtp

The requested changelog.md endpoint could not be read (web tool: unsupported text/markdown; executor fetch: proxy 403). The official HTML index and relevant linked changelog entries were read successfully instead. No remote project access was needed.

## Authorized database checkpoint — 2026-11-03 00:48 UTC

Applied Supabase migration `20261103004742_boss_private_foundation` exclusively to BOSS `ubgabtgrfrixldstnqry`, through the existing authenticated Supabase connector. It wraps the existing 001 and 002 application migrations in boss_private, records both application versions, applies the revokes/RLS/server policy described above, and prepares boss_app with NOLOGIN, NOSUPERUSER, NOCREATEDB, NOCREATEROLE, NOINHERIT, NOREPLICATION and NOBYPASSRLS. No password was generated or set; no account-level grant/token was created. This is a staged role, not a usable runtime credential.

Verified remotely: 17 private tables and 17 with RLS; public has zero tables; zero users, members or projects; zero role memberships for boss_app; no schema access or auth-table SELECT for anon/authenticated/service_role; runtime DML allowed but schema CREATE and migration-history SELECT denied. Migration history confirmed. Advisor reports one INFO: schema_migrations has RLS without a policy, intentional because only the owning operator manages it. No policy is added just to silence that finding.

An attempted SET LOCAL ROLE boss_app test was denied with PostgreSQL 42501 (operator is not authorized to assume the role). No membership was added to bypass this. Actual runtime login/TLS/pooler and end-to-end remote checks remain pending. SQL-visible pgrst.db_schemas settings returned no configured value; the management/dashboard exposed-schema setting must still be confirmed. The migration does not add boss_private to exposed schemas and explicitly denies API-role access.

Credential handoff blocker: this executor has authenticated Supabase SQL tools but no Netlify connector/browser or protected cross-worker secret-transfer mechanism. Therefore boss_app password and stable BETTER_AUTH_SECRET were not generated. The Netlify worker must establish an approved protected route before generating/provisioning them; do not exchange plaintext in chat, PRs, tool outputs or migration text. Site/credential setup, SMTP and real owner remain pending.

Resend SMTP is compatible with the existing Nodemailer transport: SMTP_HOST=smtp.resend.com, SMTP_PORT=465 (TLS) or 587 (required STARTTLS), SMTP_USER=resend, SMTP_PASSWORD supplied from an authorized Resend API key, MAIL_FROM from a verified sender domain. The registered user's email is the recipient, never the sender identity. Domain/key/sender approval and an authorized delivery test remain pending. Better Auth remains the identity provider and requires email verification. Source checked: https://resend.com/docs/send-with-smtp . No Resend API key or email was created/sent.

## First owner operator fallback — 2026-11-03

After explicit owner authorization, an operator-only SQL plan was tested against the installed Better Auth 1.7.15 behavior. `scripts/owner-bootstrap-plan.ts` uses the library's password hash function on a private random password, creates an unverified identity and credential account, and atomically creates the initial organization/owner/audit under advisory lock 827342. It refuses any existing identity/account/workspace/organization/membership state. Generated SQL contains a sensitive password hash and must never be logged, committed or saved as an artifact. There is no web bootstrap route.

The authorized production transaction was applied once through authenticated Supabase MCP. Metadata confirmed exactly one active owner, one credential account, one owner audit, no session, and email/MFA still unverified/disabled. No password, token or hash is recorded here. The initial activation request from this executor failed at its outbound proxy; a read-only probe confirmed `Tunnel connection failed: 403 Forbidden`. No reset request was attempted and no retry was performed. A worker with the existing supported HTTPS route must check mail/request logs and send activation/reset via the existing hosted endpoints. Provider acceptance and inbox delivery remain unconfirmed.

Local verification: all 16 tests passed, including repeated-bootstrap rejection, real hosted-handler verification/reset behavior against local PostgreSQL/mail, rejection of login before verification, reset-token replay rejection and mandatory admin MFA (428). TypeScript/lint passed. No production email verification or MFA bypass was performed.

## Optional MFA decision — 2026-11-03

The explicit user request supersedes the mandatory-MFA requirement described in earlier verification checkpoints. BOSS now permits verified administrators to use password-only login, including sensitive operations with a login less than ten minutes old. Existing optional MFA enrollment and challenges remain intact. No visitor protection, preview secrets or external account security is changed.

## Verified TLS incident and remediation — 2026-11-03

Parent/native correlated the production error `self-signed certificate in certificate chain` with the first Better Auth rateLimit SELECT. This failure occurs before reset-token creation and SMTP. The BOSS dashboard's Database Settings → SSL configuration → Download certificate was observed to link to:
https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt
Dashboard source: https://supabase.com/dashboard/project/ubgabtgrfrixldstnqry/database/settings
Official instructions: https://supabase.com/docs/guides/database/psql and https://supabase.com/docs/guides/platform/ssl-enforcement .

Native owns certificate download, independent fingerprint/validity verification and Netlify production environment configuration. Set DATABASE_SSL_CA to that complete PEM (actual newline or literal \n encoding), DATABASE_SSL_MODE=verify-full and optionally DATABASE_SSL_CA_SHA256 to its verified SHA-256 fingerprint (colon-separated or plain hex). Use Build + Functions scopes. The code already supports explicit pg CA trust; this change adds strict single-PEM, X.509 CA/validity and optional fingerprint validation. Invalid configuration fails closed. rejectUnauthorized remains true and Node's default hostname check is unchanged. No global trust-store edit, NODE_TLS_REJECT_UNAUTHORIZED override, private key or credential rotation is needed. The executor could not download this artifact through its outbound proxy; the independently verified certificate fingerprint must be supplied/recorded by native, not invented here. Tests use a valid CA from Node's bundled trust store only as a parser fixture, not as a substitute Supabase CA.

IP warning is separate from TLS. Current official Netlify Functions API documents context.ip/getContext(), while Better Auth requires a trusted single-IP header or verified proxy chain. No spoof-resistant guarantee for the exact Next/OpenNext header path was established here, so no arbitrary forwarded header or broad trusted-proxy range is enabled. The shared fallback rate-limit bucket remains restrictive. References: https://docs.netlify.com/build/functions/api/ ; https://better-auth.com/docs/concepts/rate-limit . Validate the deployed adapter/context path before a separate IP attribution change.
