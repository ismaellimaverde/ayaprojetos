# Verification

`npm test` creates and recreates only the dedicated boss_test and boss_hosting_test databases using the configured local PostgreSQL role. It applies the real SQL migration and exercises Better Auth and transactional services. Do not run against a shared production PostgreSQL administrative connection.

`npm run test:e2e` creates only boss_e2e, starts Next on port 3100 and uses system Chromium (override CHROMIUM_PATH). Test-only users are clearly labeled; credentials are generated per run and stored under ignored .data. It tests real password login, optional MFA enrollment, TOTP, project creation, invite registration, email verification, acceptance, direct API isolation and revocation using the same active browser session. It never sends mail externally.

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

## First-access UX correction — 2026-11-03

Recovery previously ignored the Better Auth client's error result and showed generic success on HTTP failures. The page now distinguishes server/transport failures and rate limiting, disables buttons while sending, and offers verification resend using the existing endpoint. Login links to that first-access flow. Successful requests remain generic and do not reveal account existence or promise inbox delivery. Verification resend is limited to three requests per minute by Better Auth's database rate limiter.

Validation: 16 integration/configuration tests passed; the operator bootstrap test additionally verifies actual verification-endpoint rate limiting with nonexistent addresses (no external sends). The complete existing Chromium auth/MFA flow passed. The new browser scenario passed for recovery HTTP 500, resend 429, generic success and network failure. Its first run raced client navigation; an explicit URL wait and filled-value assertion fixed the test. No production owner/email action was repeated.

Production read-only diagnosis after the reported recovery attempt: zero verification/reset/rate-limit rows and zero sessions. This does not identify the underlying transport failure or prove SMTP failure. Browser network status and matching Netlify function logs are required for the next authorized attempt; the old generic UI message was insufficient evidence.

## Optional MFA — 2026-11-03

User explicitly removed mandatory two-step authentication for BOSS. All 16 service/configuration tests passed with foundation actors defaulting to MFA disabled. Verified administration, permission changes, isolation, revocation, verified-email gate, recent-login checks, reset and rate limiting remain covered. Both Chromium scenarios passed (45.2s total): first-access error/resend UI, and password-only administrator login and project creation followed by voluntary MFA enrollment, session invalidation, subsequent TOTP challenge, invitations, isolation and recovery. MFA data for existing users is not changed. External accounts, Netlify visitor protection and preview secret scopes are outside this change.

## Explicit database CA validation — 2026-11-03

17/17 integration/configuration tests passed, including valid PEM with escaped newlines, optional SHA-256 match, rejection of malformed PEM/private-key contamination and wrong/missing fingerprint configuration, and preservation of rejectUnauthorized=true/default hostname checks. Both E2E scenarios passed (25.4s total), plus lint, TypeScript and production build. The real Supabase TLS handshake is pending native's official CA environment configuration and deployment; local parser tests do not claim to validate the provider chain. No activation/recovery email was sent by this executor.

## Production reconciliation — 2026-11-03 03:10:55 UTC

Evidence supplied by the parent/native and Resend workers; not new requests from this documentation task. Application SHA 9361e04 was published at 02:52:41 UTC. Native verified the official CA/pin with strict TLS and corrected the runtime SCRAM iteration mismatch using 4096 iterations for the same password (roles/grants unchanged). Official explanation: [Supavisor #1222](https://github.com/supabase/supavisor/pull/1222).

- GET /api/auth/get-session: 200; rateLimit database metadata confirms runtime database access.
- Recovery POST: 200 at 03:10:03.468 UTC.
- Verification POST: 200 at 03:10:10.860 UTC.
- Resend exact BOSS key: both messages Delivered to the approved owner, confirmed at 03:10:55 UTC. No tokens or message bodies recorded.
- Production public / previews private verified with explicit authorization. Application verification and RBAC remain enabled; MFA optional.

Earlier failed attempts and absent metadata are historical, not the final outcome. No user-completed verification, permanent-password change or first login has yet been confirmed. Delivery is not evidence of those actions. No tests, account mutations or emails were rerun for this documentation-only update; prior 17-test, two-E2E, lint/typecheck/build results remain the code validation baseline.

## Local editable planning increment (2026-11-03, not published)

Lint, TypeScript, production build and 19 backend/unit/integration tests passed. The full six-test browser suite passed (test-results last-run: passed, no failed tests). Browser coverage includes persisted module fields/items after reload, revision history, concurrent-edit rejection with the local draft retained, and mobile dialog overflow; existing authentication, reset, invitation and session-revocation coverage remains included. Backend negatives cover read-only access, different areas/projects/tenants, revoked grants, disabled areas, archived projects, item archival permissions and immutable revision rows.

Inspected desktop 1440px and mobile 390px editor screenshots using synthetic test content. Company/unit selectors and legacy links are covered separately by two browser cases. Migration 003 was applied only to dedicated local test databases. No production migration, data mutation, email, push or deployment was performed for this increment. These results do not claim operational CRM, financial ledger or calculated KPIs are implemented.

## Rich summary and system-wide UI (local, not published)

22 backend/unit/integration tests passed, covering strict rich-document validation, unsafe link/attribute rejection, legacy field/item preservation, rejection of old-format overwrites, and export authorization. Six existing E2E flow tests passed with the rich-summary save/reload/formatting/PDF checks included. The additional cross-screen visual test passed separately after correcting its mocked users response; it covers login, recovery/reset, invitation, security, portfolio, project/company/user/audit navigation and project form at 1440px and 390px, plus dark theme. No horizontal page/dialog overflow was detected in those cases; focus indicators were checked.

Inspected desktop/mobile screenshots of the summary editor, login, project form, security and dark Business Plan. Chromium generated readable A4 PDFs from the actual isolated print document: formatted Portuguese text retained accents, and a 100-paragraph synthetic document produced five pages with its final paragraph intact. PDF contains no JavaScript. Browser print-dialog interaction on native iOS/Safari was not tested; the UI explicitly directs the user to Save as PDF. Export uses saved revisions only.

New production dependencies are pinned Tiptap 3.32.2 packages; npm audit --omit=dev reported zero vulnerabilities. No user screenshots, test PDFs, runtime artifacts or secrets are intended for the repository. The earlier login-error diagnostic remains a separate unpublished change.

## Pending project library, direct editing, Archivo and card copy

23 backend/unit/integration tests passed, including library metadata/content separation, A–Q ordering, omission of empty areas, isolation across organizations/projects, hidden finance content, revoked grants, and denial of consolidated export without every included area's export permission. Fontsource production dependency audit reports zero vulnerabilities. Browser visual checks confirmed local Archivo font readiness and computed use on the public/authenticated routes at 1440px and 390px; logos remain original files. No production writes, migrations or publication for this increment.

Final browser verification: all seven cases passed across the suite and targeted rerun. The integrated case confirms direct executive editing without the extra “Preencher informações” step, persisted rich text, library documents and consolidated content/export order. Its first run exposed a test timing issue (reading the previous print iframe before the new export request completed); the test now waits for the consolidated output and passed. Final targeted project cases also verify the removed introductory notice. Final production build passed after that removal. Desktop/mobile screenshots were inspected for Archivo, cards and library. Changes remain local and unpublished; no remote migration or business-data mutation was performed.

## Pending compact cards, menu font and editor interaction

Card tests cover removal of currency/area-template metadata, name-description-company order, whitespace-only descriptions and long-text mobile wrapping. Montserrat Bold is locally loaded only for primary navigation; computed font family/weight and Archivo elsewhere were checked at desktop/mobile sizes. The close-confirmation browser test covers cancel preserving a draft, discard preserving saved data, delayed save keeping the dialog open, successful save closing, failed save preserving the draft, and closing unchanged content without an extra write. 24 backend/unit/integration tests passed, including allowed heading/size/alignment formats and rejection of CSS-like injection values. Full updated browser flow/build checks follow below.

Final verification for this increment: all eight E2E cases passed, including real authenticated persistence, close/save/discard/cancel and failed-save handling, library export and responsive visual checks. Lint, TypeScript and production build passed. Production dependency audit reported zero vulnerabilities; git diff --check passed. Desktop/mobile editor screenshots were inspected. Existing history records/API, authentication and permissions remain unchanged. No production migration, business-data mutation, email, commit, push or deployment was performed; publication awaits approval. The separate earlier login-error diagnostic remains outside this delivery scope.

Project lifecycle follow-up (local, partial): lint and TypeScript passed; both project-settings browser cases passed with isolated fixtures, preserving currency/timezone and company/unit/legacy-brand links. Reviewed the three exact portfolio labels and removal of the archive UI action. No duplication/deletion implementation or real-data action was performed; retention/deletion policy is pending.

## Full-width project navigation (local, publication pending)

24 backend/unit/integration tests passed. The full nine-case E2E suite passed, including real persisted module editing, conflict protection, library/PDF export and authentication isolation. Two targeted navigation cases passed after the final navigation fallback: the existing responsive navigation case plus a new test confirming that a project removed from the authorized overview cannot trap the user on an unmounted editor (10 distinct browser scenarios overall).

Navigation checks cover expandable authorized shortcuts, archived read-only access, top-area navigation, Library, cancelling workspace changes, failed-save draft retention, discard isolation, direct-address reload and rejection of an unavailable project. Desktop 1440px/mobile 390px screenshots were inspected: editor is outside any dialog, has no height-limited container, occupies the main canvas, and does not overflow the page. Formatting remains available and wraps on mobile. Query addresses replace the current browser entry; internal tab-history Back/Forward traversal is not implemented.

An intermediate visual test still expected the former Projects button to navigate directly; its expectation was updated to expand the list and choose Todos os projetos. An intermediate lint process overlapped Playwright deleting its output directory and hit ENOENT; final checks are run sequentially. No production data, email, migration, push or deployment was performed.

Final sequential lint (no warnings), TypeScript and production build passed. git diff --check passed. No database migration is required for this navigation increment.

## Sidebar selected/hover separation (local, publication pending)

Targeted browser test passed at 1440px and 390px: selected and hovered adjacent items have distinct computed colors; selected hover remains coral; desktop hit targets have at least 4px separation and the painted backgrounds are inset by 5px vertically; targets remain at least 44px tall. Keyboard Tab focus has its own 2px solid outline. Dark-theme highlight/text colors are also verified. Desktop/mobile screenshots were inspected, with no page overflow. Lint and TypeScript passed. No data or service changes, commit, push or deployment were performed.

Final production build and git diff --check also passed for the sidebar-state adjustment.

## Dual menus and executive text frame (local, publication pending)

24 backend/unit/integration tests passed. Eleven browser cases passed in the complete suite; the remaining editor-frame case exposed a test timing race while hydration switched to compact mobile defaults. The test now waits for the ready editor and asserts the compact controls rather than clicking a label that is changing. The corrected frame case and both navigation cases passed in a final three-case rerun (12 distinct browser scenarios with successful results overall).

With 120 synthetic paragraphs, increasing editor text did not increase document-page height; the text frame had internal overflow and a working scroll position. Collapsing/expanding either menu preserved the draft without opening the exit prompt. The vertical menu follows pt-BR alphabetical order and its collapse control remains available while scrolling. Desktop/mobile screenshots were inspected; compact menus and editor have no page-width overflow. Existing close/cancel, failed-save, Library, archived read-only and revoked-access cases remain covered.

The authorized PDF flow generated an actual multipage A4 PDF; pdftotext confirmed the final paragraph, proving the editor's visual height limit does not truncate export. Read-only content is keyboard-focusable, and native print removes the frame limit. No real projects, accounts, email, migrations or remote services were modified by this layout work. The separately approved coral-state release was pushed as 1edc19b716243fbf0c41d732dc8f52ba527e617d; this subsequent layout remains unpublished.

Executive cancellation follow-up: four affected browser cases passed after the final change (editor-close, editor-frame, and both navigation cases). Cancelling the cancellation preserves the draft; confirming Não salvar closes the area without showing Preencher informações; reopening retains previously saved text and creates no extra write. A successful save keeps the authorized executive editor open with the complete saved text; its full multipage PDF still includes the last paragraph. Read-only/archived and revoked-access coverage remains passing.

Final lint, TypeScript, production build and git diff --check passed after the executive-cancellation follow-up. This layout/cancellation increment remains local and uncommitted, awaiting publication approval.

## Layout reconciliation — 2026-11-04 (read-only production investigation)

Remote branch remains d96b2958f1e490ad8d1555de2ede8c000fabaa2f. GitHub exposes only a failed netlify/boss-aya/deploy-preview status, targeting deploy 6aea4dd969734d93efb8879f. This does not identify the current production published_deploy. Production /login access from this executor failed with `Tunnel connection failed: 403 Forbidden`; no authenticated production browser/session or Netlify connector is available here. No cache diagnosis or production-success claim is supported. Parent/native operator must compare the site's published deploy commit_ref with d96b295 and inspect an authorized project page.

Four local browser cases passed: editor frame/full PDF, navigation and revoked access, plus a layout matrix at 1440, 1024, 901, 900 and 390 CSS pixels. Above 900px, project plan/library pages have three separate columns: primary menu 246px, area menu 230px and remaining workspace. Their independent collapsed widths are 68px and 60px. At <=900px they switch to compact stacked layout. Portfolio deliberately has no area sidebar until a project opens. No .project-menu horizontal navigation exists in the rendered DOM. Original horizontal-menu CSS remains unused, not a rendered alternative.

Screenshots at 1440/901/390 were inspected directly; all captures use synthetic mocked data, not an authenticated production account. Current source reproduces the requested three-column desktop structure; no runtime defect was established, so no speculative CSS, storage, editor or permission change was made. Only this diagnostic test/documentation was added locally.

Public comparison source: [ClickUp 4.0 navigation](https://help.clickup.com/hc/en-us/articles/31142608907543-Intro-to-ClickUp-4-0) and [Spaces Sidebar](https://help.clickup.com/hc/en-us/articles/32490148963479-What-is-the-Spaces-Sidebar). The official documentation separates global navigation from a contextual sidebar; BOSS maps these roles to the primary rail and project areas. Relevant official captures are https://help.clickup.com/hc/article_attachments/35871153193623 and https://help.clickup.com/hc/article_attachments/36795470591767 . Web lookup confirmed the sources, but direct image downloads also returned proxy 403; actual ClickUp pixels were not inspected here. No external brand assets were copied. BOSS's expanded menus consume 476px; collapsing only its primary rail releases 178px for writing. This is a measurable space tradeoff, not proof of a deployment fault.

Specific reference supplied by parent: https://clickup.com/assets/home_2026/Footer40.webp from https://clickup.com/v4 . Parent directly identified black global navigation, a light contextual sidebar and the workspace. This executor confirmed the public page but downloading that exact asset again returned proxy 403, so the comparison relies on the parent's visual description plus locally inspected BOSS screenshots, not a claimed local pixel inspection of ClickUp. A static reference alone does not establish collapse interactions; BOSS independent collapse was tested separately.

Measured BOSS allocation at 1440px: expanded 246px primary + 230px contextual + 964px workspace; primary collapsed 68 + 230 + 1142; both collapsed 68 + 60 + 1312. These are grid-column widths before workspace inner padding. At 901px, both expanded menus leave only 425px for workspace, explaining the denser wrapping in the inspected local screenshot. The BOSS light/light menus have weaker tonal separation than the black/light reference described by the parent. Potential refinements (proposed only): default compact primary rail on project pages, retain clear contextual-menu separation using AYA tokens, and compact repeated header/export metadata to give writing more vertical room. Do not infer a production deployment defect from this stylistic comparison. No application changes or publication performed.

After the user approved structural adaptation, seven affected browser cases passed across two runs: editor frame/complete PDF, five-width layout matrix, selection/hover/focus, navigation, revoked-access fallback, editor-close choices and shared desktop/mobile screens. Primary rail defaults compact on project pages and measured workspace width is viewport minus 298px above 900px. Both expanded/collapsed combinations remain tested. Synthetic desktop/mobile screenshots were inspected directly; they do not constitute production evidence. Lint and TypeScript passed. No database schema or authorization changes were made.

Final production build and git diff --check passed for the approved structural adaptation. Changes remain local; no commit, push, migration or deployment was performed.

## BP submenu and close-dialog frame — 2026-11-04 (local)

Seven affected browser cases passed across the final targeted runs: submenu typography/icons, close choices and failure handling, editor scrolling/full PDF, independent layout/collapse matrix, hover/selection/focus, guarded navigation, and revoked-project fallback. The first new submenu test incorrectly asserted focus-visible after a mouse interaction; corrected the test to enter keyboard modality with Tab, then verified the visible outline. No application focus behavior was changed.

New submenu coverage verifies Montserrat 700, 19 distinct decorative icons, unchanged accessible names, desktop/mobile no horizontal overflow, and omission of unauthorized areas. Confirmation bounds are checked at 1440×900, 390×844, 320×480 and 844×390: outer dialog and inner panel share the same edges, width stays within the viewport, no horizontal overflow or nested shadow, and all three choices remain enabled. Desktop/mobile submenu and desktop/narrow-mobile/landscape dialog screenshots were inspected directly using synthetic fixtures. Published navigation defaults and structure are unchanged. No real accounts, content or production services were modified.

Final ESLint, TypeScript, production build and git diff --check passed. Publication remains pending explicit approval; no commit or push was performed.

## BP area-card icons — local, publication pending

Extended the existing submenu browser test to verify all 17 card headings retain their accessible names, decorative icons and access buttons at 1440px and 390px; unauthorized cards remain absent. Targeted browser test, ESLint, TypeScript and diff check passed. Desktop/mobile screenshots inspected directly with synthetic data: original grid, descriptions, status and actions preserved. No backend changes; no production writes, commit or push.

## Shared rich fields and compact project heading — local, publication pending

26 unit/integration tests passed on isolated local databases, including round-trip storage across all 16 non-executive areas, untouched-field preservation, immutable original revisions, rich item descriptions, rejection of unsafe JSON/links, old-client downgrade protection, tenant isolation, permissions and existing export guards. No remote database or business account was used.

Nine affected browser cases passed across targeted runs: real authenticated foundation workflow (including competing writes), shared-field formatting, executive close safeguards, executive bounded scrolling/full PDF, project navigation, revoked access, project settings, company/unit linkage, and responsive shared screens. One project-settings test initially clicked portfolio before asynchronous project restoration finished; it now waits for the restored project heading before navigating and passed on rerun. No navigation behavior was changed for that timing correction.

The new browser case checks one toolbar, active selection across two fields, independent undo/redo, fonts and marks, invalid-field save blocking even after a valid update elsewhere, metadata separation, save/reload, mobile formatting, protected transition to Editar projeto, Biblioteca formatting and consolidated content. Actual PDF generation/pdftotext confirms the final line of a 90-line item; existing executive long-PDF test also passed. Desktop/mobile rich-field screenshots and compact project heading inspected directly with synthetic data. The removed redundant Business Plan card does not remove the project description; the relocated admin edit control retains a 44px target and exit confirmation.

Limits: 10,000 plain-text characters per narrative field/item description; allowed rich nodes/styles only, not arbitrary HTML. Undo/redo is session-local per field. Titles, sources, periods and responsible-party metadata remain plain structured controls. Printing remains browser Save as PDF of saved revisions and retains the existing validated document size limits; exports are not silently truncated. No migration is needed, and no production mutation or publication was performed.

Final ESLint (no warnings), TypeScript, production build and diff check passed. Changes remain local, uncommitted and unpublished pending approval.

## Preview investigation for published source 3a51ee5 — read-only findings

GitHub/Netlify bot reports failed Deploy Preview 6aeb3a1a0f41e3d6080c5c21 for 3a51ee5fcc027b736e2dcea99abcc18e313cc530. The private Netlify build-log URL cannot be opened by this executor or the web tool, and no Netlify connector, installed CLI, auth environment or local CLI session is available. Production published_deploy.commit_ref remains unknown. Preview failure alone does not establish production failure.

Before starting the Library changes, a local build with DATABASE_URL, BETTER_AUTH_URL and BETTER_AUTH_SECRET explicitly empty and NETLIFY=true/CONTEXT=deploy-preview reproduced: compilation/typecheck pass; collecting /api/auth/[...all] page data fails with DATABASE_URL is required. Source eagerly validates database config on route import. This supports missing preview-only environment as a hypothesis consistent with prior production-only secret configuration; it does not substitute for the inaccessible remote logs. No secrets were printed, environment files changed, remote data accessed, validators weakened or deploy retried. A retry without a confirmed cause/config correction would be uninformative. Use the existing authorized Netlify operator to inspect exact preview logs and production commit; do not copy production secrets into previews merely to remove a failed check.

## Library source editor and bounded document — local

27 unit/integration tests passed, including actual/missing date metadata and all prior storage, history, permission and export tests. Six affected browser cases passed: Library source save/reopen, shared rich fields, executive close confirmation, executive long-text/full PDF, guarded navigation and revoked-project fallback. The Library case also passed after final viewport sizing: editable executive and DNA fields open directly, save/reopen returns to Library, view-only access has no editor/save/export controls, missing timestamps remain explicit, the consolidated frame scrolls internally at 1440×900 and 390×900, and its bottom stays within the tested viewport. Actual PDF text extraction includes line 100; revision suffixes are absent. Screenshot review used synthetic local documents, not user content. Short screens can still scroll platform controls, but long document content no longer expands the site indefinitely.

The supplied Library image read returned metadata, caption/OCR and an asset pointer, not renderable pixels; no native attachment downloader is available. No claim of direct inspection of the original screenshot. Its textual description and the user's explicit requirements were sufficient to identify the existing Library cards/reader. No screenshot was published or added to Git.

Frequent-menu follow-up: submenu style/permission checks, five-width layout matrix, Library edit/reopen and two guarded navigation cases passed. The frequent group contains Biblioteca, Áreas do projeto, then authorized Resumo executivo; remaining areas stay alphabetic and Executive is never duplicated. An account restricted to finance sees only the two utility buttons in the group. Desktop/mobile screenshots were inspected; keyboard focus and the selected background remain distinct from the group background. The existing editor-frame test's ordering assertion was updated for the intentionally pinned Executive entry.

Final verification for Library plus frequent-menu changes: 27 unit/integration tests and eight distinct affected browser cases passed across targeted runs. ESLint, TypeScript, production build and git diff --check passed. This local batch remains uncommitted/unpublished, with no migration or real-data change.

## Preview import correction — local validation

30 unit/integration tests passed. Three new isolated-process cases import API routes without runtime initialization and assert generic/no-store 503 responses, forbidden public signup and no pool creation. Preview cases also supply synthetic production-looking configuration to prove the context guard prevents backend initialization. Existing production validators and real local database tests remain active.

A deploy-preview build with DATABASE_URL, BETTER_AUTH_URL and BETTER_AUTH_SECRET explicitly empty passed. The compiled application served login with 200; session and BOSS APIs returned 503/no-store; signup returned 403. Smoke checks used a dedicated local port after detecting an occupied port, without stopping another process. The dedicated server was stopped afterward. The real authenticated foundation browser test passed (2.2 minutes), covering password login, project creation, invitation, isolation and session revocation against isolated local test data. No production account, email or data was used.

New UX references: Library returned metadata/captions and asset pointers for the two supplied images, not renderable pixels. One supported materialization attempt per original failed with `library file transfer failed: download failed`. No downloader bypass or repeated transfer attempted, and no screenshots were uploaded. Applying their precise layout remains pending inspectable pixels or a direct visual description from the parent executor; no claim of pixel inspection.

Final verification: ESLint, TypeScript, normal production build and git diff --check passed. Preview correction remains local; no commit, push, deployment, credential change or migration was performed. Unrelated pre-existing login diagnostic changes were preserved outside this batch.

Publication of the tested preview correction explicitly authorized on 2026-11-04. Scope is code and validation records only; preview backend remains disabled, with no credential, hosting-setting or database change. Deployment outcome must be verified separately after push.
