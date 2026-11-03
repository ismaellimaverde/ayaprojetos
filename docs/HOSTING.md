# Netlify + Supabase Postgres — preparation, not deployment

User selected this hosting direction on 2026-11-03. Parent confirmed the new separate Supabase project BOSS (`ubgabtgrfrixldstnqry`, `sa-east-1`, PostgreSQL 17, ACTIVE_HEALTHY), with public initially empty. Netlify site selection/login remains pending. Neither Arpoador Experience nor Agenda Parental is authorized for BOSS. No remote query/migration, role or credential creation, environment-variable mutation, email delivery or deploy has been performed.

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

After the schema, exact HTTPS auth origin and SMTP are approved/configured, run `npm run bootstrap` once from a trusted operator environment. Supply chosen owner name/email/password through private stdin, not a web endpoint, build log, shell history or chat. DATABASE_OPERATOR_URL must use direct/session mode and the same database as runtime; the command holds a session advisory lock across signup and organization creation, verifies the runtime connection shares that lock, refuses existing membership, and requires explicit ALLOW_REMOTE_BOOTSTRAP=yes + confirmed host for remote use. A failure must be inspected privately before retry; no automatic promotion of existing accounts. Owner must verify email and enroll TOTP before administration. No real owner was created.

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
