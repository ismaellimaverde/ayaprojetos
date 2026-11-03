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

## Brand assets — local preparation, original asset transfer blocked

User requested the supplied BOSS logo on login and inside the application, with “Business Operation Sales System” immediately below. This exact expansion comes from requirements/update.txt section 1; the original prompt uses the broader Business Operating System description. Preserve the update's official product name.

Library identifies two PNG inputs: libfile_59dc70b136d4819185fd8baad711622b (813×539, logo) and libfile_25425b6eea888191b6ec699b5b2df2bb (1320×1310, login illustration). Automated descriptions suggest a black BOSS wordmark with a tie-shaped negative space and a blue/purple login illustration; actual pixels were not available in this executor after both authorized downloads failed. No logo redraw or asset substitution was made. A shared Brand component now provides the approved textual hierarchy on login (including mobile) and the authenticated application shell: AYA Projetos is the platform brand; BOSS is the system name, followed by Business Operation Sales System. This is local preparation, not a substitute logo or a completed visual design.

User additionally selected https://www.ayaprojetos.com.br/ as the source for AYA's logo and palette inspiration. Public page text is readable and identifies AYA PROJETOS / Experiências & Inteligência de Negócios. Both header/footer image links resolve to the same Wix media asset, https://static.wixstatic.com/media/56e356_4384de01f67f4675a76e0028b9fe7430~mv2.png (page label fav-icon.png). Asset pixels and site CSS could not be fetched here (executor proxy 403; web image fetch unavailable), so neither final logo suitability nor exact colors are verified. Do not invent hex colors from text. The final login reference was subsequently received as libfile_c835fb47645481919f14ba56df6e8d88 (1320×1307). Its authorized Library materialization also returned `library file transfer failed: download failed`. Metadata/automated captions are readable but actual pixels are unavailable. Native/browser inspection and transfer of the original assets into this checkout remain necessary before faithful visual completion and publication. No palette changes or publication were made.


## Temporary text identity — approved 2026-11-03

User instructed AYA Projetos to appear as text pending its future logo replacement, and stopped image transfers. BOSS also remains plain text because its original bytes are unavailable; no approximation is used. Implemented locally: shared AYA/platform and BOSS/system hierarchy, full acronym below BOSS, light turquoise login background, white rounded access card and rounded controls inspired by the parent-inspected references. Illustration is omitted until an appropriate asset is available.

Parent verified AYA website CSS palette: #069AA1, #D4EDEE, #A7D1D4, #096266, #063638, #1D1E21, #FFFFFF, #D5D8E0, #787C88, #EF9C83. Dark turquoise is used for small text/buttons to preserve legibility; the lighter primary turquoise is not used for white small-text buttons. Internal navigation shares the palette. No authentication behavior, secrets, external services or publication changed. Current remote is https://github.com/ismaellimaverde/ayaprojetos.git; branch feat/boss-foundation-phase-1. Do not treat this as a private branch: no upload is currently authorized.

Validation: lint, TypeScript, production build and both existing Playwright E2E flows passed. Desktop (1440 px) and mobile (390 px) login captures reviewed locally; no mobile horizontal overflow. A screenshot capture during hydration emitted a caret-style mismatch warning; no application flow failed. Screenshots are internal review artifacts only. Changes remain local, uncommitted and unpublished.

## Original logos integrated locally — 2026-11-03

Later explicit approval covers both logos in the confirmed public repository. Retrieved only the two PNG blobs from transfer commit 584812bc6731ff4bdd32343a58b9c0184d002939, without merging its branch or overwriting local work. Inspected both originals. SHA-256: BOSS `0f87116e2f033301d4b9876f207ae041103da491f4012c7ed9b4457df0bbb70d` (44736 bytes); AYA `5b34b297fd0e395cd2ba6637bce9564394f1ba726e0f214a093838c80421e0ed` (51210 bytes). Files live in public/brand with original filenames.

Shared identity now uses original AYA mark with AYA Projetos text, followed by original BOSS logo and full system name. A white identity panel preserves the black originals on both light login and dark navigation. CSS frames the BOSS logo's wide blank margins without altering image bytes, recoloring or redrawing either mark. Both are local imports; no external image fetch at runtime. Previous text-only state is superseded. No login reference screenshots are included. No push or deployment authorized by this integration instruction.

Original-logo validation: lint, TypeScript, production build and 2 existing E2E tests passed. Desktop 1440px and mobile 390px screenshots visually reviewed, visible images loaded, no horizontal overflow. Initial screenshot helper incorrectly waited for hidden lazy-loaded images and timed out; corrected to wait for visible images, then succeeded. Original PNG bytes and hashes preserved. Implementation remains local and unpublished.

## Visual release authorization — 2026-11-03

User explicitly approved publishing the tested visual version with both original logos to BOSS. This supersedes the earlier local-only publication restriction for this change. Preserve existing production configuration and all unrelated projects. Production confirmation follows the linked branch deployment; do not infer success from a Git push alone.

## Login refinement and coral direction — local only

User requested left optical alignment of AYA, BOSS B and system expansion; keep full expansion on one responsive line. Adjusted the original-image CSS framing without modifying PNGs and used a container-relative subtitle size. Login copy now reads “Entre com sua conta para acessar os projetos.” Only the spaced button-style password recovery link remains below sign-in; first-access link and invitation/MFA footer removed from login. Recovery and verification backend and /recover remain unchanged. Existing access E2E now enters through the retained recovery link.

User rejected teal and selected the final AYA contact section instead. Parent confirmed contact-section CSS: coral #EF9C83 (--color_42), graphite #1D1E21 and peach fields #FFD5BB. Coral now drives login and system colors; login submit uses approved optional graphite with white text; fields use peach. Neutral warm shades support contrast. Publication requires new explicit authorization; no push/deploy for this refinement. No screenshot attachment was available directly to this executor; reviewed locally generated desktop/mobile screenshots instead.

User subsequently authorized publication of the tested coral/login refinement by voice (“Pode”). Lint, TypeScript, build and both E2E tests passed; desktop and 320/390px mobile checked without horizontal overflow. Publication authorization is limited to this BOSS version and preserves hosting configuration.

## Recovery screen identity refinement — local only

User confirmed the target is password recovery. Replaced the plain BOSS heading link with the original local BOSS PNG using existing CSS framing; both recovery and token-based password reset share this screen. “Voltar ao login” is now a small secondary button-style link. No handlers, API calls, messages or authentication rules changed. No publication authorization for this increment.

User subsequently explicitly authorized publishing this recovery refinement (“Yes”). Validation: lint, TypeScript, 2 E2E tests, desktop/mobile 320px visual review without horizontal overflow, and return-to-login navigation passed. Scope remains BOSS only; hosting configuration and recovery handlers are unchanged.

## Recovery spacing and complete brand expansion — local only

Based on parent-inspected screenshot, added 20px above the recovery status notice, separating it from the preceding verification button. This is layout only; screenshot does not establish email delivery. Shared original-logo component now includes the one-line Business Operation Sales System expansion on recovery/reset, invitation and profile/security, complementing existing login and main shell usage. Recovery layout checked with intercepted test response, no real email or account action. Publication awaits explicit approval.

Validation: lint and TypeScript passed; both existing E2E flows passed. Desktop/mobile 320px recovery shows exactly 20px between form and notice and no horizontal overflow. One-line subtitle checked on invite, security and reset routes at 320px (173px content width, 17px line height). Brand link retains navigation without underlining the system expansion.

## Password visibility and simplified recovery — local only

User requested keyboard-accessible show/hide password on login, hidden by default. Added a non-submit control with a changing action label and explicit input association, without storing visibility or changing password values. User also requested removing the second recovery button (resend verification); removed that UI control and changed help text to refer to the received activation link and spam folder. Verification backend and email validation remain unchanged. Earlier notice spacing and all-screen acronym work are included; no publication authorization yet.

## Approved eight-character password minimum — local only

User explicitly approved reducing minimum length from 12 to 8 across BOSS after the risk was explained. Updated Better Auth, invitation registration validation, invitation/reset form constraints and operator bootstrap validation. Maximum length, verified-email requirement, rate limits, session revocation, RBAC and optional MFA stay unchanged. Existing accounts/passwords are not rewritten. E2E boundary coverage rejects seven characters through the real reset endpoint and accepts eight through the UI. No production account action or publication authorized here.

Combined validation: lint, TypeScript and 3 E2E tests passed, including keyboard visibility toggle, server/network error handling, seven-character reset rejection and eight-character acceptance, isolation and session revocation. Desktop/mobile 320px login and recovery reviewed without horizontal overflow. Live owner diagnosis was read-only; no account modification or email send occurred.

User explicitly authorized publishing the combined tested changes and, after publication, sending one new confirmation email through the normal BOSS flow to the approved owner. This does not authorize marking the account verified or claiming login success. Production verification and mail outcome must be checked separately from Git push.

## Local reset/login diagnosis

Extended isolated E2E coverage reads only boss_e2e credential data in memory: real reset endpoint saves a hash that verifies the new eight-character password and rejects the former password. Browser login with the former password returns 401; new password returns 200, creates one active session, and grants authenticated /api/boss/me access. No real-user credential was read or tested.

Found a separate UX defect: login displayed the credential/verification message even for HTTP 429. Local UI now distinguishes rate limiting and server errors without revealing account existence. This does not establish the production incident cause. Additional test logins share one local IP; the final MFA check waits for the unchanged rate window, rather than weakening limits. No production modification or publication.

Validation completed: lint, TypeScript and all 4 E2E tests passed. Production login cause remains unproven; local reset/hash/new-login/session flow succeeds.

## Confirmation versus password reset redirect diagnosis

Extended local E2E to request an actual local verification email with callbackURL=/recover, follow only that test message, and assert exact /recover URL with no token parameter, “Recuperar acesso” heading and no new-password input. Installed Better Auth confirmation redirects directly to callbackURL; password-reset callback separately adds its reset token after checking the verification table. The normal confirmation flow does not copy its JWT into the reset form. Production screenshots alone do not establish the post-click URL or token origin; no real token was opened, decoded or logged.

## Company and optional unit selection — local implementation

Approved UX: select a company and optionally one of its direct units; show the affiliation on cards and filter visible projects by company/unit. Existing project.company_id remains the single link (company or selected unit); no migration, data reassignment or permission change. Read responses include only the linked entity and its same-organization company parent, after existing project authorization. Filter choices derive from authorized projects. General organization projects remain supported.

Legacy brand, orphan/nested unit and missing-record links are preserved on editing through an explicit keep-current option. Brands are not silently reclassified as companies or offered as new company choices; defining new brand hierarchies is a separate decision. Archived current links can be retained; other archived entries are excluded from selectors. Changing company clears unit selection.

Combined pending UI cleanup removes currency/timezone inputs, the Business Plan metadata line and area-letter labels while preserving internal values and IDs. Local tests cover creation defaults, nondefault settings on edit, unit scoping and clearing, legacy brand preservation, filter behavior and project/tenant denial. No remote data changes or publication.

## Editable module planning content — local implementation

User explicitly requested working module editing/persistence. Implemented contextual planning fields for all 17 areas, custom information items (title, text, source, period, responsible), archive/restore, explicit save, read-only history, author/time and optimistic version conflict handling. New content is manual planning information, not operational ledger/CRM/task/KPI data. Fields are bounded plain text and rendered escaped. Disabled areas retain data but deny access; archived projects are read-only. Area permissions and membership/session checks remain authoritative.

Migration 003 creates private content/revision tables; revisions are append-only through a database trigger. Changes have only run on isolated local databases. Previously prepared company/unit and UI cleanup remain local alongside this increment; do not include unrelated login diagnostics in a narrowly authorized publication. See HOSTING.md for migration-before-code deployment prerequisite.

## Approved combined release

User subsequently approved company/unit UI, visual cleanup, editable module planning and migration 003. Applied the additive migration transactionally to the dedicated BOSS database with advisory lock, private-schema RLS, existing boss_app policy/grants and Data API denial. Existing project/member counts remained one each; new content/revision tables are empty. Login diagnostic UI changes remain outside this release.
