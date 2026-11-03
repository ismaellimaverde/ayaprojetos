# Integrations

Implemented local email delivery adapter: writes verification, password-reset and invitation messages into .data/mail with private filesystem permissions. No external mail, SMTP credentials or real recipients. Changing MAIL_MODE away from local fails closed until an authorized provider adapter is implemented.

Planned connector interface: provider/account, minimal scopes, encrypted secrets, source IDs, initial/incremental cursor, pagination/rate limits, retry policy, idempotency key, provenance, currency, period, sync timestamp, mapping version, errors and controlled reprocessing. Jobs will run outside HTTP request lifetimes.

First external connector: Meta Marketing API in phase 5 after marketing entities exist. Additional candidates: Google Ads/Analytics, payments, authorized banking/Open Finance, CRMs, spreadsheets and custom webhooks. None connected or provisioned.

No automatic double counting: media spend joins finance only through explicit reconciliation; won deals affect forecast but do not recognize financial revenue. AI is phase 6 and must cite internal records, distinguish facts/estimates/recommendations and enforce the requesting user's grants before retrieval or aggregation.
