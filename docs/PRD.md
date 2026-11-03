# BOSS — Business Operation Sales System

AYA Projetos is the initial organization. Full vision: a live Business Plan connecting strategy → goals → initiatives → projects → tasks → costs → outcomes → KPIs. All 17 areas remain in scope, delivered in phases. The two source prompts in requirements/ are authoritative; the update overrides generic authentication and permission definitions.

## Current increment

Real identity, verified email, local password recovery, MFA, PostgreSQL persistence, organizational hierarchy, companies/brands/units, projects, selected versioned template modules, invitations, access matrix, user suspension, session revocation and audit. No financial/operational CRUD or calculated business KPIs is claimed in this increment. Every future module explicitly states its status.

## Navigation

Login / recovery / invitation → portfolio → projects → Business Plan A–Q. Administration → companies, users/access matrix, audit. Profile/security → MFA and sessions. Workspace/organization selector limits navigation to active memberships.

## Module matrix

| Area | Module | Operational phase |
|---|---|---|
| A | Executive summary | 2 |
| B | DNA, identity, culture | 2 |
| C | Strategy, OKRs, initiatives | 2 |
| D | Market and competitive intelligence | 4/6 |
| E | Products and services | 4/6 |
| F | Marketing and growth | 4 |
| G | Sales and pipeline | 4 |
| H | Customers and success | 6 |
| I | Operations and delivery | 6 |
| J | Projects and tasks | 2 |
| K | Finance and controlling | 3 |
| L | People and HR | 6 |
| M | Governance and legal | 6 |
| N | Technology and integrations | 5 |
| O | Risks and continuity | 6 |
| P | Knowledge and documents | 2 |
| Q | Indicators and reporting | 2–6 |

Each future operational module needs overview, structured diagnosis, plans/goals, execution, calculated indicators, linked documentation, history and responsible people. None is replaced by a few generic KPI cards.

## Acceptance boundaries

Phase 1: users can create separate projects, instantiate selected template modules, invite with explicit permissions, verify identity, and see only granted areas. Direct forbidden API calls fail; revocation applies to existing sessions on subsequent requests. Last-owner removal and self-escalation fail. Phase 2+ acceptance remains in the original prompt, including financial history, idempotent imports, formulas and multi-currency rules.

Production readiness is not claimed: email delivery authorization/provider, TLS deployment, operations/backup policies, identity recovery policy and independent security review remain outstanding.
