# ScopeLedger

Vertical SaaS for hospital SPD managers to track rigid endoscope repair spend, flag capital-replacement thresholds, and generate CFO-ready capital-request PDFs.

**Status:** Phase 1 foundation scaffold. See `plan.md` (full 14-phase plan) for scope; most features are not yet implemented.

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript strict
- Supabase (Postgres 15 + Auth + Storage + RLS)
- Tailwind CSS + Motion.js
- Anthropic Claude (Sonnet 4.6 extraction, Haiku 4.5 classification)
- AWS Textract (primary OCR) / Azure Document Intelligence (fallback)
- Postmark (inbound mail via MailboxHash per-org routing)
- Zoho CRM / Books / Payments / Subscriptions
- Playwright (E2E) + Vitest (unit)
- Vercel (hosting) + GitHub Actions (CI/CD)

## Quick start

```bash
# 1. Install deps
npm install

# 2. Start Supabase locally (Docker required)
npx supabase start

# 3. Apply migrations
npx supabase db reset

# 4. Copy env template and fill in the URLs/keys supabase prints
cp .env.local.example .env.local

# 5. Run the dev server
npm run dev
```

## Repo layout

```
.claude/agents/           Agent role definitions (frontend/backend/data/qa/security/devops)
artifacts/                Canonical contracts — schema.json is the source of truth
supabase/migrations/      Forward-only DDL migrations
types/schema.ts           Auto-generated TS mirror of schema.json
src/app/                  Next.js App Router pages + API route handlers
src/components/           Shared React components
src/lib/supabase/         Browser / server / service-role Supabase clients
src/lib/metrics/          Pure derivation logic (threshold, stitching)
```

## Testing

```bash
npm run lint        # ESLint (next/core-web-vitals + typescript)
npm run typecheck   # tsc --noEmit (strict)
npm run test        # Vitest unit tests
npm run test:e2e    # Playwright E2E (Phase 12)
npm run build       # Production build
```

## Phase status

| Phase | Name                                | Status |
| ----- | ----------------------------------- | ------ |
| 1     | Foundation & Schema                 | Scaffolded, awaiting schema approval |
| 2     | Ingestion Pipeline                  | Not started |
| 3     | Threshold Engine                    | Pure function only (`src/lib/metrics/threshold.ts`) |
| 4     | Capital-Request PDF                 | Not started (design-gate) |
| 5     | Scope Registry                      | Not started |
| 6     | User-Facing Pages                   | Landing + auth only |
| 7     | Billing (Zoho Payments)             | Not started |
| 8     | Zoho CRM / Books sync               | Not started |
| 9     | Free Calculator                     | Not started |
| 10    | Landing Page                        | Initial version live on `/` |
| 11    | Enterprise / Compliance             | Not started |
| 12    | QA Gauntlet                         | Not started |
| 13    | Security Pentest                    | Not started |
| 14    | DevOps / Deploy                     | CI workflow in place |

## Contributing

- One migration per logical schema change; never edit an applied migration.
- All mutations to tenant data must pass through RLS (verify with tests).
- Webhook handlers must verify HMAC signatures before any side effect.
- No `NEXT_PUBLIC_` prefix on secrets, ever.
