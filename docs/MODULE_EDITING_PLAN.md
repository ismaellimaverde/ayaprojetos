# Editable Business Plan — first planning increment

Status: first planning-content increment implemented locally, not deployed. Source: original requirements sections 3, 4, 13 and 14, plus permission update. Cards now open contextual forms and reflect saved revision status. Migration 003 adds module_content and module_revisions in boss_private. Operational entities below remain subsequent work.

## Implemented first delivery

- Open each enabled area in a dialog with contextual information and history. Provide explicit Edit/Save/Cancel and unsaved-change protection.
- Provide area-specific planning fields from the original prompt: executive summary (problem, solution, value, revenue model); DNA (purpose, mission, vision, values); strategy (diagnosis, priorities, objectives); corresponding descriptive/planning fields for the other areas.
- Support named, editable information items with title, description, source, period, responsible person and archive/restore. Authorized users can add/edit/archive items within their area permissions without renaming internal area IDs.
- Store manually entered planning content as such. Do not represent free-text financial numbers as accounting entries or produce calculated KPIs from them.
- Cards show actual saved-content status and revision; the editor shows author and last update.

## Persistence and authorization

- Private-schema module content and immutable revision records scoped by organization, project and area, with author/timestamps and schema version.
- Validate allowed field schemas, lengths, types and enabled area on the backend. Store plain text initially, without executable HTML.
- Use optimistic revision checks; conflicting edits return a conflict instead of overwriting another person's work.
- Reuse area/action authorization: view to read, create/edit for writes, delete/archive for removal. Recheck permissions on every request, including history. Preserve content when an area is deselected, while denying access until enabled and authorized again.
- Keep the same private-schema/RLS posture and restricted runtime role. Add and test a versioned migration locally before any authorized remote migration.

## Not yet implemented: subsequent phase-2 operations

Model objectives, measurable goals, initiatives, tasks and documents as linked entities with real CRUD, rather than one unstructured JSON blob. Build indicators only from these saved, typed entities. Financial ledger/DRE, CRM pipeline and campaign integrations remain their explicitly planned later phases.

## Acceptance

Persistence after reload; independent projects/tenants; read-only user cannot save; disabled area and revoked access denied; history records changes; concurrent edits do not silently overwrite; archived content remains traceable; no fabricated metrics. Test desktop/mobile and API negatives. No user-data backfill or external integration required for the planning-content increment.
