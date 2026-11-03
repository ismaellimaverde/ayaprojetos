# Architecture — initial implementation

Modular monolith: Next.js 16 / React / TypeScript strict / Tailwind. PostgreSQL 17 in a local cloud-executor Docker container. Better Auth owns passwords (its secure default hashing), email tokens, sessions and encrypted TOTP secrets; Drizzle maps its schema. Domain services use parameterized PostgreSQL queries and transactions.

Routes → authenticated session → organization membership → MFA requirement → scoped project grants → transaction/audit. API mutations require the configured Origin. Public signup is blocked at the only exported identity HTTP route. CLI bootstrap and a valid unexpired invitation are the only internal signup paths. No authorization cookie cache. Session revocation and membership/grant status are read from the database.

Organizations are locked during domain operations to serialize permission changes; this is deliberately conservative and can be optimized after profiling. Composite foreign keys prevent cross-organization company/project/grant links. Queries are scoped at repository/service level; PostgreSQL RLS is not enabled. Direct database credentials are privileged and must never be available to clients. A separately privileged production migration role and restricted runtime DB role remain deployment work.

Template v1 is copied into each project with the version and selected modules. Updating the catalog cannot rewrite existing project instances. Global administrators act only inside their selected organization and require MFA. Project-role names are permission templates, not global administrative powers. No company membership implicitly grants its projects.

Email adapter currently writes private local files only; it has no public route and sends nothing externally. URLs/tokens stay outside Git. Production email, jobs, external connectors, AI, storage and caching are intentionally not provisioned. Future business services must call the same authorization boundary before querying, aggregating or exporting data.

Sources checked during implementation: https://better-auth.com/docs/adapters/drizzle ; https://better-auth.com/docs/plugins/2fa ; https://better-auth.com/docs/authentication/email-password . Installed versions are locked in package-lock.json.
