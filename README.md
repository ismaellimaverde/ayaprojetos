# BOSS · AYA Projetos

Business Operation Sales System. Cloud development repository, with an executable foundation and the complete multi-phase product scope preserved. This is not the completed platform or a production deployment.

## Run in the cloud workspace

Node 24, npm and Docker/PostgreSQL 17 are available in this executor. Dependencies are locked in package-lock.json.

```sh
npm ci
# Configure .env.local using .env.example, with generated secrets and your local PostgreSQL URL.
npm run db:migrate
npm run dev
```

Local application: http://localhost:3000 (inside the cloud environment). This is not a public published URL. Current local PostgreSQL container: boss-aya-postgres, bound to 127.0.0.1:55432. `.env.local` holds generated development-only secrets, ignored by Git. Do not print or commit it. Stop/start the existing container to preserve its data; never remove it without a backup. Production durable volume/backup provisioning is still pending.

## First owner

There is no public administrative signup or hardcoded account. `npm run bootstrap` reads one JSON object from stdin with `name`, `email`, `password` (12+ characters). Use a private input mechanism; do not put a real password in shell history or source. Bootstrap refuses after a membership exists. It creates workspace/organization AYA Projetos and the first owner. Open the verification message in private `.data/mail`, verify the email, log in, and activate MFA under `/security` before administering data.

Do not bootstrap a real owner on behalf of someone without their chosen identity and authorization. Test suites use separate test databases and generated fixture identities, not the main application database.

## Implemented routes

- `/login`, `/recover`, `/invite`, `/security`: actual Better Auth password, email-token, TOTP and session flows.
- `/`: portfolio, company hierarchy, project CRUD with archive, selected versioned 17-area template, user administration, invitations and per-project access matrix, audit. New workspaces/organizations can be created by an existing administrator with recent MFA.
- `/api/boss/*`: authenticated and scoped application endpoints. `/api/auth/*`: Better Auth with public signup blocked.

Emails are private local mailbox files only. No external delivery or real invitation was sent. Business areas display their phase/status; no operational data or business KPI is fabricated.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Tests recreate only `boss_test` and `boss_e2e`. E2E uses `/usr/bin/chromium`, overridable via CHROMIUM_PATH, and port 3100. See docs/TESTING.md. The initial documentation, decisions and phase boundaries are in docs/. Original prompts are in requirements/.

Delivery is submitted for review through a separate branch and draft PR. No merge, deployment or external service provisioning is authorized by this delivery.
