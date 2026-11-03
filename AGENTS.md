# BOSS development conventions

- Preserve requirements/original.txt and requirements/update.txt. The update overrides identity and access rules only.
- Work in small executable phases. Do not label future modules implemented or fabricate business metrics.
- TypeScript strict; Next.js App Router; PostgreSQL; Better Auth; Drizzle for identity; parameterized SQL for scoped application repositories.
- Authorization belongs in src/lib/domain.ts and authenticated routes. Every query/mutation must explicitly scope the organization and project. No public signup. MFA is optional by explicit user decision (2026-11-03); password, verified email, scoped RBAC and recent login requirements remain enforced.
- Never expose local mailbox, database URLs, passwords, MFA secrets or session tokens in responses, screenshots, logs or commits.
- Tests use dedicated boss_test and boss_e2e databases; never point destructive fixture setup at business data.
- Commands: npm ci; npm run db:migrate; npm run dev; npm run lint; npm run typecheck; npm test; npm run test:e2e; npm run build.
- Local Docker PostgreSQL is development infrastructure only. External email, integrations, provisioned services and deployment need explicit authorization.
- Record proposed vs implemented vs approved decisions in docs/DECISIONS.md. Keep docs useful and short; final manuals follow later.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
