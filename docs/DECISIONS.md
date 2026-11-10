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

## Rich executive summary and unified UI — approved implementation, publication pending

User requested a single long rich-text field for Resumo Executivo, with font selection, bold/italic, H1, links and PDF, then expanded the reference design to the whole system and explicitly replaced brown with black while retaining AYA coral. Shared cards, fields, buttons, badges, navigation, tables, notices, dialogs and focus states now follow the rounded, softly elevated reference language; existing routes and dark-theme behavior remain.

Tiptap's open-source editor is pinned in the lockfile. Store a strictly validated document as `fields.summary_rich_v1` in the existing JSONB model. Allowed nodes are paragraphs/H1/text/line breaks; marks are bold/italic, three local font families, and HTTP(S)/mailto links. No raw HTML rendering, remote images, embeds, uploaded fonts or external processing. Backend rejects unknown attributes, unsafe URLs and excessive sizes; React renders validated nodes as text/elements. Unsupported pasted formatting prevents saving until corrected.

Legacy executive fields and information items are combined into the initial editor document for reading only. Nothing is migrated automatically. A rich save retains the original fields/items server-side and creates a normal revision; older client writes cannot silently remove a saved rich document. Other modules retain their contextual field models. No schema migration is needed.

PDF export checks both view and export permissions against the current session, project and area through the API. It prints the selected saved revision in an isolated document using only validated nodes and fixed CSS. The browser's dialog provides Save as PDF; this is not an automatic file download and destination labels vary by browser/mobile OS. Unsaved drafts are not exported. No real data, account, email, service or deployment action was performed for this increment.

Publication authorization: user approved publishing the tested coral/black UI and rich executive summary with browser PDF export. This release requires no migration or environment/configuration changes. The unrelated login-error diagnostic remains local and excluded. Production completion must be verified against the pushed SHA separately.

## Project heading description — local, publication pending

User requested the saved project description directly below the project name instead of the generic introductory sentence. The Business Plan heading now reads existing `selected.description` from the authorized overview response; blank/whitespace-only descriptions render no subtitle. Other page headings retain their existing copy. No data update, migration, permission change or production action is needed. Long text and line breaks wrap within the header.

Validation: lint and TypeScript passed; both targeted project E2E tests passed, including the saved description below the title, omission for whitespace-only descriptions, and 390px layout with a long unbroken string. Existing project/card descriptions also wrap safely. No publication performed.

Same pending release: all 17 Business Plan cards now use distinct area definitions from the static catalog instead of the repeated editing instruction. These descriptions explain the subject of each area; they do not claim CRM, ledger or automatic indicators are operational. Module IDs, template version, selections, permissions and saved content are unchanged. The project-heading description still comes from the project's saved data, not this catalog.

Combined validation after the area-copy update: lint, TypeScript and both targeted E2E cases passed, including specific executive/finance definitions, removal of repeated card copy, saved/blank project descriptions and mobile wrapping. Publication remains pending.

Same pending UI release: each area card now has one visible “Acessar” action, an accessible label identifying its area, and a coral-to-peach gradient with black text. Flex layout separates the status badge from the action by at least 18px and aligns actions across cards. Existing editor-opening behavior, enabled-area filtering and server permissions remain unchanged. Global font remains unchanged pending the user's choice.

Validation after the card-action update: lint, TypeScript and three targeted browser tests passed. Checked one visible action per card, separation from the status, opening the executive editor/PDF through the renamed action, project descriptions, company/unit behavior, and 1440px/390px layouts. No publication performed.

## Direct executive editing, project library and Archivo — local, not published

User requested direct access to the executive editor: opening that area now starts in edit mode when create/edit permission permits and the project is active; read-only users still see the document. History, reload, explicit save and discard protection remain available. Opening a legacy document does not save/convert it automatically.

The project menu now has Áreas do projeto and Biblioteca. The library derives one document per nonempty saved area; it does not create duplicate database records. The consolidated Business Plan follows the existing A–Q catalog order, promotes area names to section headings and includes revision/author/date. It includes only enabled areas the current user can view; the UI explicitly describes this authorized view. Empty areas are omitted. Every read/export rechecks membership and project/area access. Consolidated export requires export permission for every included document, rather than silently exporting unauthorized content. Archived information remains labeled, and original history is unchanged. Documents reflect the current saved revisions when opened, not unsaved drafts or immutable publication editions. No schema migration is required.

User selected Archivo for the full interface. Installed the pinned @fontsource-variable/archivo package and self-hosted its CSS/font assets through the application, with 400 body and 600 heading/button weights. Logos are untouched; explicit font choices within authored rich text/PDF remain content formatting. License is retained at public/licenses/Archivo-OFL.txt. This supersedes the earlier pending global-font choice. No remote font service, account, credential or paid integration is needed.

User additionally requested removing the peach introductory “Fundação do seu Business OS” notice from the portfolio. Removed only that static block; data and capability state are unchanged. Included in the same unpublished release.

Publication authorization received for the complete tested project-copy/card-action/direct-editor/library/Archivo/notice-removal release. No database migration or configuration change is required. The separate login-error diagnostic remains excluded. Remote commit and production deployment must be verified independently.

## Compact project cards — local, publication pending

User requested removing the displayed currency and “áreas autorizadas · Template v1” metadata from project cards, with text ordered as project name, saved description, then company/unit affiliation. Removed only UI output. Empty/whitespace descriptions omit the paragraph; long text wraps. Existing status badge and Business Plan action remain unchanged. Compact text spacing (6px), outer gap (12px) and card padding (20px desktop/18px mobile) reduce excess whitespace. Currency, timezone, template version, modules, affiliations and permissions remain stored and unchanged.

User additionally selected Montserrat Bold for the platform's main navigation items only. Added the pinned local Fontsource package, imported only weight 700, scoped it to sidebar navigation buttons, and retained its OFL license. Archivo remains the body/interface font elsewhere; logos and authored document fonts are unchanged. No external font requests or configuration changes are introduced.

## Editor close confirmation and formatting — local, publication pending

User requested an explicit choice on every editor close. “Salvar e fechar” waits for a successful write; failed writes keep the dialog and draft. With no pending changes it closes without creating an empty revision. “Não salvar” only discards the local draft; “Cancelar” returns to the same mounted editor, preserving its state. Escape opens the same prompt (and cancels it when already open). Pending writes disable closing actions. Existing unload warnings and server permission/conflict checks remain.

Replaced the generic editor introduction with the catalog definition for its area and reduced header spacing. Removed the editor's Recarregar/Histórico buttons and empty “Ainda não preenchido” header label as specifically identified in the screenshot. Existing revision rows and authenticated history API remain untouched; card status badges remain because the removal targeted the editor header.

Rich formatting now includes known font families, 12–32px size choices, normal text/H1/H2/H3, bold, italic, underline, strike, left/center/right/justified alignment, links, clear formatting, undo and redo. Validation admits only those enumerated styles and known attributes; display and PDF map them to safe elements/styles without raw HTML. Existing rich documents remain readable. Tables, images, lists, DOCX import/export, spellchecking and Word-equivalent features are not implemented or promised. PDF still uses the browser's Save as PDF workflow and saved revisions. No migration or remote data change is needed.

Publication approved by the user for compact project cards, Montserrat Bold navigation, explicit editor close choices, simplified area headers and expanded rich formatting. Release is limited to these tested changes, with no migration or configuration change. The separate login-error diagnostic remains excluded.

## Project lifecycle request — partial local implementation, decision pending

Changed portfolio labels to PROJETOS EM ANDAMENTO / CATEGORIAS DO BP / Business Plan · versão 1.0 and removed the visible archive action. Existing archived projects, data and the legacy archival API are unchanged. Not published.

Proposed duplication: organization owner/admin only, same organization, new project UUID and editable suggested name; copy description, company/unit link, currency/timezone, template version, enabled areas and their current saved fields/items. Require an explicit review of scope before creation, reject unavailable company/unit links, copy in one transaction, generate new item IDs and start independent revision history with provenance in audit metadata. Do not copy grants, invitations, tokens, original revision history or original author attribution. Existing organization administrators retain their normal access; ordinary collaborators receive no access automatically. Source project remains unchanged. Archived source projects should stay archived; copying would create a new active project only after explicit confirmation. This is a proposal, not an implemented operation.

Deletion requires a product/security decision: recoverable trash (recommended) versus permanent destruction, including retention/restoration policy. Current project status permits only active/archived; DELETE currently archives. Module revision UPDATE/DELETE is explicitly blocked by an immutable-history trigger, and content, grants and invitations reference the project without cascading deletion. Do not relabel archival as deletion or disable history safeguards. A trash implementation needs a migration and consistent denial of project/content/library/export/invite access plus exclusion from normal listings. A permanent deletion policy must explicitly address revision history and audit retention. Neither operation was implemented or run against real data.

Proposed deletion confirmation after policy approval: display exact project name and consequences, require typing the name, Cancel focused by default, owner/admin and recent authentication enforced server-side, reject stale/foreign-project requests, await transaction success, and prevent duplicate submission. Test with isolated fixtures including revoked access, cross-tenant requests, archived projects, history preservation, failure rollback and source/copy independence.

## Project workspace navigation — local, publication pending

Projects in primary navigation now expands/collapses a list populated only from the authorized overview; archived projects remain identifiable and accessible under existing permissions. All-projects remains an explicit shortcut. Project/area content uses the full main canvas, without an editor dialog, backdrop or height-limited nested scroll. The top project navigation contains overview, Library and authorized areas in catalog order, horizontally scrollable on narrow screens. The editor toolbar wraps when needed; no formatting features were removed.

Area, Library, project, workspace, portfolio, security and sign-out transitions through the interface route through the existing save/discard/cancel confirmation while an editor is open. Saving must succeed before navigation; failed writes keep the editor and draft. Cancel cancels the intended destination. Only the confirmation itself remains modal. Native beforeunload protection continues for dirty drafts when leaving/reloading the browser page. No draft is silently autosaved.

Project pages have direct query addresses on the existing platform route: workspace/project and optional area or view=library. On initial load, workspace membership and the authorized project/area list are checked before opening content; all API access still uses existing server permissions. These addresses support refresh/bookmarks and replace the current browser entry; internal tabs do not add browser Back/Forward entries. Top navigation is the supported way to move between areas without leaving the platform. No new routes, database structure, production data or access grants are introduced.

The project deletion retention-policy decision and proposed duplication remain pending as recorded above. This navigation work does not implement either operation.

Publication approved for full-width project navigation, authorized project shortcuts, guarded editor transitions, direct query addresses, portfolio block names and removal of the visible archive button. Duplication/deletion remain proposals only, with no new operation or migration in this release. The separate older login-error diagnostic remains excluded.

## Distinct navigation states — local, publication pending

User identified adjacent portfolio/projects entries sharing the same coral selected/hover background. Sidebar navigation now separates button hit targets by 4px and draws the highlight 5px inset vertically, keeping at least a 44px clickable target. Selected remains #EF9C83; unselected hover uses #FBE5DD; selected hover stays selected. Text on both highlights is #1D1E21 (computed contrast 7.74:1 and 13.77:1 respectively). Keyboard focus uses a separate 2px outline. Main navigation exposes its current page via aria-current, consistent with project shortcuts. Fonts, links, permissions and data are unchanged. No publication authorized yet.

Publication approved specifically for the tested sidebar selected/hover separation. The later request for collapsible dual navigation and bounded editor scrolling is not part of this release.

## Collapsible dual navigation and bounded executive editor — local, publication pending

Separate from the published coral-state adjustment: desktop now has primary navigation, a second vertical project/area sidebar, and the editor canvas. Each sidebar collapses independently; primary navigation retains labeled icon buttons in its rail and expanding Projects reveals its shortcuts. The area sidebar lists only authorized areas, sorted by pt-BR name. Overview and Library remain separate utility entries. This changes navigation order only; consolidated Business Plan document order remains A–Q.

Below 900px, menus start compact unless the user has explicitly chosen otherwise during the mounted session; expanded menus stack above the content, have bounded scrollable height and do not cover the editor with overlays. Toggles expose expanded state, controls and accessible names. Reflow/collapse recovers focus from hidden controls. Menu collapse does not unmount the editor or discard its draft. Existing save/discard/cancel transition protections remain.

Executive text has a viewport-based bounded height and its own vertical scroll, including read-only presentation. Toolbar and page remain accessible outside the scroll frame. Read-only document content can receive keyboard focus. Native print CSS removes the visual scroll limit; authorized PDF export continues to build a separate complete document from saved data and does not depend on the editor's visible viewport. No storage, authorization or migration changes; no production writes or publication of this layout authorized yet.

Follow-up: Executive Summary Cancelar edição now uses the same save/discard/cancel exit confirmation as Fechar área. Confirmed discard returns directly to the project's area navigation rather than an empty read view with Preencher informações; cancelling the prompt keeps the draft. Successful saves keep the executive editor open when edit permission remains valid, remounting against the saved revision. Legitimate read-only/archived access remains read-only; other modules retain their existing edit behavior. Saved content is never deleted by this cancellation.

Publication approved for the tested collapsible primary/area navigation, alphabetical area menu, bounded executive text scrolling and direct cancellation exit. No migration, duplication/deletion operation or unrelated login diagnostic is included. Production deployment must be verified separately from GitHub preview status.

## Approved structural reference — 2026-11-04 (implemented locally, publication pending)

User approved using the structure of https://clickup.com/assets/home_2026/Footer40.webp from https://clickup.com/v4, identified by the parent as dark global navigation, a light contextual sidebar and the work canvas. This authorizes structural adaptation, not copying ClickUp logos or styling assets. The exact reference image remained blocked by this executor's proxy; implementation uses the parent's inspected description and official navigation documentation.

BOSS primary navigation now uses its own graphite #1D1E21 surface with white icons/text, coral selection/soft hover and a coral keyboard outline. The contextual area menu retains the existing light surface (or the chosen dark-theme surface), alphabetic areas and independent collapse. On project/library pages the primary menu defaults to its 68px icon rail; explicit user expansion overrides the default for the session. The portfolio keeps full primary labels by default on desktop. Mobile remains compact. No original logo pixels or fonts were changed.

Reduced project-heading and metadata spacing and placed PDF guidance beside its button where width permits. All controls and instructions remain available. At 1440px the default workspace column grows from 964px (both menus expanded) to 1142px; the user can still expand the primary menu or collapse either menu independently. Editor scroll, full PDF, permissions, direct addresses and protected exit are preserved. This visual refinement is not evidence that yesterday's production deployment was missing: production commit/session verification remains blocked separately. No push, deploy or migration is authorized for this new refinement yet.

Publication approved for the tested compact graphite primary navigation, independent contextual menu and increased editor space. This release includes only the approved layout, supporting tests and documentation; the unrelated login diagnostic remains excluded. No database, data, account or infrastructure change is included.

## BP menu typography/icons and confirmation frame — 2026-11-04 (local, publication pending)

User clarified that both navigation menus already work correctly. Kept the published structure, default collapse behavior and independent controls unchanged; discarded the initial uncommitted navigation adjustment. BP area labels now use the existing locally hosted Montserrat 700 font and distinct semantic Lucide icons (17 areas plus overview and Library). Icons are decorative for assistive technology; authorized labels and filtering remain unchanged. Archivo and original logos are preserved elsewhere.

The save-before-close dialog had a 700px outer frame around a panel capped at 560px, creating an extra right-hand band. Matched the outer frame to the panel at up to 560px, with 16px viewport margins, matching corner radius and no nested shadow. This is scoped to that confirmation only. Save, discard, cancel and failed-save protection are unchanged. No database changes, production writes or publication in this batch.

Publication approved specifically for BP submenu Montserrat/icons and the save-before-close frame correction. Existing dual-menu structure, collapse defaults, data and configuration remain unchanged. Unrelated login diagnostics are excluded.

## BP area-card icons — local, publication pending

Confirmed scope is the 17 Business Plan area cards, not project or indicator cards. Each area heading reuses the same decorative AreaIcon as its submenu entry, keeping its accessible name, description, status and access button. The grid and navigation remain unchanged; headings can wrap beside a fixed-size icon. No data or permission changes.

Publication approved specifically for the tested icons in the 17 BP area cards. No other interface behavior, data or configuration is included.

## Shared rich editing across BP areas — local, publication pending

Requested scope extends the executive editor to each contextual planning text field and item description in the other 16 areas. One toolbar targets the focused rich editor and names that field; each field has its own selection and undo/redo stack. Short item identifiers/title, source, reference period and responsible person remain separate plain controls. Current planning-field catalog contains narrative text only; operational numeric/structured schemas are not changed or invented.

Existing JSONB storage supports companion `rich_field_v1:<field-id>` values and optional item `rich_text_v1` without schema migration. Legacy strings are interpreted as literal text, never HTML; simply opening an area does not write or convert data. Editing a field saves validated Tiptap JSON alongside a plain-text projection under the existing key. Untouched fields remain unchanged; immutable revisions preserve previous content. Backend rejects stale clients that omit existing rich counterparts, applies the same area/project permissions and revision checks, and rejects unknown nodes/marks, unsafe links and styles. Narrative fields/item descriptions retain the 10,000-character text limit; executive limits are unchanged. Raw HTML is never stored or injected. Clipboard HTML is parsed into the restricted editor schema and validated before saving.

Biblioteca, individual area PDF and consolidated Business Plan consume the same rich nodes, with fixed field labels and semantic order retained. Browser printing uses a separate complete document, not the visible scroll frame. PDF remains the browser's Save as PDF flow. No claim of Word-equivalent tables, images, operational modules or calculated indicators. Undo history is per field for the current editing session, not a persisted cross-field undo log. Official command behavior checked at https://tiptap.dev/docs/editor/api/commands .

Additional requested UI change: removed the redundant horizontal Business Plan card, keeping the project description beneath its name. Editar projeto now sits beside the project name, uses a compact visible outline with a 44px target, wraps responsively, remains admin-only and routes through the existing protected editor-exit flow. No production data, migration, push or deployment is authorized for this batch yet.

Publication explicitly approved on 2026-11-04 for the tested shared rich-text fields across BP areas and the compact project-edit heading. No database migration, real-data mutation, infrastructure change or unrelated login diagnostic is included.

## Library source editor, metadata and document frame — local, publication pending

Library area documents now open the existing area editor directly. This edits the source fields, not a detached Library copy. Current edit/create permission and archived state are rechecked by the same endpoint; view-only users get a read-only document. Saving/reopening retains content, and closing a Library-origin editor returns to Library unless a different guarded navigation destination was selected. Executive content stays one rich field; other areas retain their separate semantic fields and shared toolbar.

The consolidated Business Plan opens on its own document surface rather than underneath the Library cards. Its content scrolls inside a bounded, keyboard-focusable frame. It remains derived/read-only: edit the constituent area documents to update it, avoiding an unsafe split of arbitrary consolidated text back into semantic fields. PDF still exports the complete saved content independently of the scroll frame.

Document titles and PDF titles no longer append revision numbers. Library cards, editor metadata and consolidated section metadata show Última atualização with the recorded date/time in the browser locale, without displaying the author. Missing/invalid timestamps say não informada; no date is invented. Revision counters/history remain unchanged internally. No migrations or real data changes; these new Library changes are not authorized for publication yet.

Additional local menu request: Biblioteca, Áreas do projeto and authorized Resumo executivo are grouped at the top in Acessos frequentes, with a pale coral background and a distinct dark-theme surface. Other authorized areas remain alphabetic. Executive is not duplicated in the alphabetical list and is absent if access is not granted. Existing icons, Montserrat, selection/hover/focus, collapse controls and guarded navigation are preserved. Publication remains pending.

Publication explicitly approved for the tested Library source editor, recorded update metadata, revision-free document titles, bounded document view and frequent-menu group. No migration or real-data mutation is included. Previous production verification remains a separate Netlify investigation; a failed preview is not production evidence.

## Isolated visual previews — local correction, publication pending

Netlify logs inspected by the authorized operator confirmed that preview page-data collection eagerly imported database/auth configuration and failed with DATABASE_URL is required. The operator also confirmed production published at 757b3d3fc66c1c2a7dbbddad6020f21b066c0f3f and inspected its interface; the preview failure did not mean production failed.

Database and Better Auth instances now initialize only on runtime use, not route import during build. Existing identity, TLS, database-role, authentication and permission validation remains in effect. Hosted deploy-preview and branch-deploy contexts explicitly reject backend access with generic 503 responses even if credentials are accidentally present. Public signup remains forbidden. These previews are visual-only; an interactive preview requires a separately authorized isolated backend. No production secrets are copied, hosting settings changed or remote data accessed. This code correction remains local pending publication approval.

Publication of the tested preview correction explicitly authorized on 2026-11-04. Scope is code and validation records only; preview backend remains disabled, with no credential, hosting-setting or database change. Deployment outcome must be verified separately after push.

## Document composition from supplied references — local, publication pending

The parent directly inspected both supplied screenshots and provided their hierarchy. This executor received captions but not pixels; implementation follows that inspected description and is visually checked using synthetic local screenshots. Biblioteca now has a breadcrumb/title, a broad coral consolidated-plan feature and an area-card grid with existing semantic icons, actual update dates and permitted open/PDF actions. No fictional additional-menu actions or blank add-document control: documents are still derived from authorized saved areas.

All 17 areas share the document composition: top navigation and permitted PDF export, Business Plan category, title, area-specific explanation, recorded update time and a centered content surface with semantic sections. Existing Archivo/Montserrat, AYA coral/black, separate rich fields, scroll frames, permissions and save/discard/cancel remain. The consolidated plan remains derived/read-only; area documents open the existing source editor. Export no longer closes an already-open consolidated reader. No schema change, migration, content conversion or production mutation.

Publication explicitly approved on 2026-11-04 for the tested Library and shared 17-area visual organization. Scope excludes unrelated login diagnostics, data changes and migrations.

## Direct area/editor parity — local correction, publication pending

Inspection of published source 50b37ca found one shared ModuleEditor, so the previous document heading was not Library-only. However, its caller only enabled direct editing and project-qualified document titles for Library-origin navigation; other non-executive areas still opened a read surface. Previous visual validation emphasized Library and did not assert parity across all direct area URLs. No claim is made about the exact version loaded in the user's browser.

All project area entry points now pass the same direct-edit option and document title. Existing edit/create permission and archived checks remain authoritative; read-only users still cannot edit. The shared heading includes the same semantic area icon/category, and Executive has a labeled content section and a bounded editing frame. Route-change focus now targets the new document-heading instead of the removed heading wrapper. Library return destination remains origin-aware; save/discard/cancel and source fields are preserved. No migration or production data change.

Publication explicitly approved on 2026-11-04 for direct editing entry and shared document framing across all 17 areas. No migration, real-data operation or unrelated login diagnostic is included.

## Area-card save metadata — local, publication pending

Replaced the visible saved/revision pill on all BP area cards with Última atualização and the existing module_summaries.updated_at timestamp. Reuses the same pt-BR date/time formatter as Library and area documents, in the browser timezone. Unsaved areas remain Ainda não preenchido; a saved record with missing/invalid timestamp says Última atualização: não informada. Revision/history, stored values, permissions and API queries are unchanged. No migration or remote mutation.

Publication of the tested last-update area-card label explicitly approved on 2026-11-04. No data, API, migration or unrelated login change is included.

## Private project sources — implementation local, NOT approved for production

Authorized 2026-11-06: implement/test a sources library available before writing, reusable within a project, with optional excerpt associations, accessible usage list, private attachments and no automatic export. Preserve all existing narrative fields, revisions and identity. No push, deployment, preview publication, production migration or sensitive configuration change is authorized for this work.

Migration 004 adds project_sources and source_links in boss_private. Attachments are bounded bytea values in the existing private PostgreSQL database (2 MiB/file, 50 MiB/project, 100 sources and 500 links/project), avoiding a new public bucket, account, API key or ephemeral serverless filesystem. This is a bounded first-stage store; large recordings need a separately reviewed object-storage extension. Supported files: PNG/JPEG/GIF/WebP, PDF, MP3/WAV/OGG/WebM/MP4 audio. MIME and file signatures are checked; arbitrary HTML/SVG and executable uploads are rejected. API body reads are bounded. No remote URL fetching: links are references, not server-side imports.

Access is checked through existing active organization membership/session and project/area view permissions. Source creation/linking needs create or edit in an active area. A source is visible only through its original area or an explicit use in another accessible area of the same project; adding that use shares the source with that area's authorized readers. The UI explains this. Hidden-area uses are omitted. Unlinking additionally requires delete and preserves the material and narrative. Existing grants are not broadened. Binary reads require authentication plus the same source visibility check, return no-store/nosniff/attachment headers, and never issue public or signed object URLs. Browser previews use revocable local blob URLs; PDF is downloaded rather than embedded as active HTML.

Source registrations and links persist independently of unsaved narrative drafts. Request IDs and a unique link constraint make retries/repeated clicks idempotent. An excerpt stores field identity and bounded selected text separately from editor JSON. View-only ProseMirror decorations underline an unambiguous exact match; accessible per-field buttons also open the side panel. Changed/deleted/not-yet-saved excerpts and repeated quotations are explicitly flagged rather than automatically reattached to a guessed passage. This first stage is conservative text-quote anchoring, not a collaborative character-position tracker. Repeated quotes need human review. The original quote is retained internally as link evidence; it is not inserted into the narrative or PDF. Existing source exports and Library consolidation read only module_content, so notes, files, citations and decorations are excluded.

OCR, transcription, attachment ingestion from external URLs and bulk/large-file storage are not implemented. No production data was touched. Publication requires approval of migration 004 plus code publication, and an operator review of storage quotas/backups. No new credentials are required by this implementation.

## Sources release authorized and database prepared — 2026-11-06

User explicitly approved database update and publication. Supabase MCP confirmed exact BOSS project ubgabtgrfrixldstnqry ACTIVE_HEALTHY; prior app migrations 001–003, new tables absent, boss_app non-superuser/non-BYPASSRLS. Applied reviewed migration 004 transactionally with advisory lock, private search_path, grants only for the existing boss_app server role and matching server-only RLS policies. No existing business rows changed. Verified 004 registered, both new tables empty, RLS enabled and Data API roles anon/authenticated/service_role denied SELECT. Security advisor result unchanged: only the existing informational schema_migrations RLS-without-policy finding.

Code publication is now authorized. Production deployment outcome must be verified separately from the GitHub preview check; no new credentials, buckets, accounts, public URLs or provider settings were configured.

### 2026-11-06 — One document editor in all Business Plan areas (local, not published)

Requested: every area must have the actual Executive Summary editor experience, not only its header and entry route. The previous implementation still rendered separate field editors and item forms in the other 16 areas.

Implemented locally: one rich document, one formatting toolbar and the same save/close guard for all 17 areas, entered from cards, project menu or Library. Existing semantic fields/items are **not deleted or rewritten**. Before the first narrative save, their labeled content is composed in memory. On explicit save, `area_document_rich_v1` is stored alongside the original structured fields/items in the existing JSON column; originals remain accessible in a clearly labeled read-only disclosure. This is an additional narrative representation, not a bidirectional field conversion. Future structured/operational features must use the preserved original data deliberately, not infer values from prose. Older clients cannot overwrite an area after narrative adoption. No database schema migration or bulk conversion is required.

Library/PDF use the current narrative once saved. Private sources remain separate. Existing source IDs, field identifiers and usages are retained; excerpt lookup and editor highlights follow the current narrative and report removed/changed or ambiguous repeated text. New references use the document anchor. No OCR/transcription added. No real data touched. Publication needs fresh approval for this version.

### 2026-11-07 — Remove source linking from module UI (local, not published)

At the user's request, removed the editor selection/link button, source annotations/click targets and per-excerpt source actions from the shared editor used by all 17 areas. Removed selection, general-reference/reuse and link-removal controls from the source drawer; source creation no longer automatically creates a general link. Source registration, private attachment consultation and read-only historical uses remain. Historical rows/files and existing server compatibility endpoints are unchanged; this is removal of interface flows, not deletion or disabling of historical storage/API. No migration, production writes, push or deploy. Existing login diagnostic changes remain outside this work.

### 2026-11-09 — Project file manager in Library (local, not published)

User authorized a bounded local increment after read-only diagnosis. Implemented separate project folders/file records using existing private PostgreSQL attachment delivery; uploads limited to small images/PDFs, videos and other formats by HTTPS link only. Area-scoped folders preserve existing RBAC; file movement cannot change area access. Shared 50 MiB project upload quota includes historical sources. Migration 005 prepared and exercised only in isolated local databases, no existing production records moved. No new providers, bucket, credentials, costs, Drive sharing changes, push or deployment. See FILE-MANAGER.md for limits, costs, evidence and release prerequisites.
