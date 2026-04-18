# ScopeLedger operations runbook

Last updated: 2026-04-18 (Phase 14).

## 1. Deploy target

- **Vercel** project `scopeledger` (framework: Next.js 15, Node 20).
- Primary region: `iad1` (co-located with Supabase us-east-1). Failover: `sfo1`.
- See `vercel.json` for per-route memory/timeout overrides and the
  Zoho CRM sync cron (every 15 min via GET `/api/zoho/sync`).

## 2. Environments

| Env        | URL                               | Branch                        | Supabase project  |
| ---------- | --------------------------------- | ----------------------------- | ----------------- |
| production | https://app.scopeledger.io        | `main`                        | `scopeledger-prod` |
| preview    | https://<sha>.scopeledger.vercel  | any PR                        | `scopeledger-prod` read-only |
| local      | http://localhost:3000             | any                           | `supabase start`  |

Previews read production data via anon key (RLS enforced) but never
mutate — service-role key is *only* set on production.

## 3. Secrets inventory

All secrets live in Vercel (Project → Settings → Environment Variables).
Never commit real values. Template: `.env.local.example`.

| Secret                                | Owner        | Rotation cadence |
| ------------------------------------- | ------------ | ---------------- |
| `SUPABASE_SERVICE_ROLE_KEY`           | Platform     | on compromise    |
| `ANTHROPIC_API_KEY`                   | Platform     | 90 days          |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | Platform | 90 days   |
| `AZURE_DOC_INTELLIGENCE_KEY`          | Platform     | 90 days          |
| `POSTMARK_INBOUND_WEBHOOK_SECRET`     | Ingestion    | 180 days         |
| `ZOHO_CLIENT_SECRET`                  | Billing      | 180 days         |
| `ZOHO_WEBHOOK_SECRET`                 | Billing      | 180 days         |
| `ZOHO_SUBSCRIPTIONS_WEBHOOK_SECRET`   | Billing      | 180 days         |
| `ZOHO_SYNC_CRON_SECRET`               | Billing      | 180 days         |
| `CENSITRAC_API_KEY` / `SPM_API_KEY` / `NUVOLO_API_KEY` | CMMS | per-customer |

Rotation procedure: generate new secret → set in Vercel for Preview +
Production → redeploy → update upstream (Postmark console, Zoho
webhook config, etc.) → remove old secret after one deploy cycle.

## 4. Deploy procedure

1. Merge PR to `main`. Vercel auto-deploys to production.
2. Supabase migrations run via `supabase db push` from CI — see
   `.github/workflows/ci.yml`. New migrations MUST be additive-only;
   never amend an applied migration (see `docs/decisions.md`).
3. Smoke test post-deploy: `GET /api/health` (TODO Phase 14.1), manual
   check of `/calculator` and `/legal/editorial-independence`.

## 5. Observability

- **Sentry** (`SENTRY_DSN`) catches uncaught server + client errors.
- **Vercel function logs** retain 24h on Hobby, 30d on Pro. For longer
  retention, use `vercel logs --since=24h | tee archive.log`.
- **Supabase logs** (`supabase logs`): Postgres, Auth, Storage.
- **Audit log**: `public.audit_log` table — every service-role write
  stamps here via pg trigger. Export via `GET /api/audit/export`.

## 6. Rate limiting

`src/lib/security/rate-limit.ts` is an in-memory sliding-window limiter.
**In production this MUST be fronted by Upstash Ratelimit**, otherwise
the 10/hr/IP cap on `/api/calculator/lead` is per-function-instance
rather than global. Action item for Phase 14.1: wire `@upstash/ratelimit`
and redirect `consume()` to the Upstash backend when `UPSTASH_REDIS_URL`
is set; fall back to in-memory otherwise.

## 7. RLS verification

Run tenant-isolation assertions:

```bash
supabase db test
```

This executes every `.sql` under `supabase/tests/`, including
`rls_isolation.sql` (12 pg-tap assertions — see Phase 13 commit).

Re-run after every migration that touches `public.*` policies.

## 8. Incident response

### 8.1 Credential leak

1. Revoke the leaked secret in Vercel + upstream (Anthropic, AWS, etc.).
2. Rotate per §3.
3. Audit `public.audit_log` for unexpected writes since suspected
   leak time: `GET /api/audit/export?from=YYYY-MM-DD`.
4. File an incident note under `docs/incidents/YYYY-MM-DD-slug.md`.

### 8.2 Ingestion stuck (HITL queue > 50)

1. Check `/hitl` for stuck candidates.
2. Inspect `public.ingestion_audit` rows with `status='hitl_pending'`.
3. Root cause buckets:
   - OCR failure → check Textract/Azure quota
   - Classifier failure → check Anthropic API status
   - Low stitching confidence → scopes need better serial/asset_tag
     coverage; consider importing a fresh CSV
4. Re-queue by updating `ingestion_audit.status='received'` for the
   affected org.

### 8.3 Zoho webhook storm

1. Zoho retries failed webhooks with exponential backoff. If the
   function times out repeatedly, logs show 500s.
2. Disable the webhook in Zoho console while root cause is
   investigated. The billing mirror will drift but can be reconciled
   via `POST /api/zoho/sync` (bearer-gated).
3. Once fixed, re-enable — ingestion is idempotent keyed on
   `event_id`.

### 8.4 Capital-request PDF render failure

1. Chromium binary is lazy-loaded via `@sparticuz/chromium` — if it
   fails to download, the PDF route returns 502.
2. Check function logs for the OcrProviderError / chromium error.
3. Workaround: generate HTML preview via `GET /api/capital-request/:id/pdf?format=html` (TODO Phase 14.2).

## 9. Backup & restore

- Supabase nightly backups (7-day retention on Pro, 30-day on Team).
- Point-in-time recovery available on Team+.
- Storage buckets (`ingest-raw`, `compliance`, `capital-request-pdfs`)
  are NOT backed up by Supabase default — configure S3 replication or
  accept the risk before GA.

## 10. On-call

Escalation: platform@scopeledger.io → Slack #oncall → pager.
Error-budget SLO: 99.5% monthly on `/dashboard`, `/api/capital-request/*`.
