# Initial KPI catalog — specifications, not implemented calculations

| ID | Formula / unit | Sources | Granularity / aggregation | Quality rule |
|---|---|---|---|---|
| cash.net | settled inflows − settled outflows / currency | cash settlement events | day/month; same currency only | missing settlements = partial |
| revenue.recognized | recognized revenue by accounting period / currency | classified ledger entries | month; recognition policy versioned | never use won opportunities as revenue |
| margin.contribution | revenue − variable costs / currency and % | classified ledger | period/entity | denominator 0 = unavailable |
| budget.variance | actual − planned / currency | budget versions + ledger | period/cost center | show budget version |
| marketing.cpl | attributed spend / leads | campaigns + attribution | campaign/period | zero leads = unavailable |
| marketing.roas | attributed revenue / media spend | reconciled campaigns + revenue | campaign/period | missing attribution = partial |
| sales.conversion | won / eligible closed opportunities | pipeline history | cohort/period | specify denominator |
| execution.completion | weighted completed work / planned work | task history, approved weights | project/period | does not imply business outcome |
| customer.churn | lost eligible customers / opening eligible base | customer lifecycle | month/cohort | explicit inclusion policy |

All definitions require formula version, owner, source lineage, period, target, last update, quality status and filters. Backend services centralize formulas. Mixed currencies cannot be summed without an explicit dated FX policy. Targets are versioned independently from historical results. Portfolio/area aggregates include only authorized source records and require consolidated-report permission.

Current screen: a count of authorized active project records, a static template inventory and an explicit “Sem dados” business-indicator state. No fictional financial metrics or placeholder charts are presented as real. Metric implementations and calculation tests begin in phases 2–4.
