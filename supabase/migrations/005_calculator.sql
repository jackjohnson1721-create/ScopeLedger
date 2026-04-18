-- Phase 9 · Free single-scope calculator leads.
--
-- Stores calculator submissions. Numeric figures are stored only if the
-- user opted in to the cohort (default-on, soft gate). The email is
-- always stored so we can send the report.

create table public.calculator_lead (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  result_flag threshold_flag not null,
  result_ratio numeric(6, 4),
  spend_cents bigint check (spend_cents is null or spend_cents >= 0),
  replacement_cents bigint check (replacement_cents is null or replacement_cents >= 0),
  cohort_opt_in boolean not null default true,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index on public.calculator_lead (created_at desc);
create index on public.calculator_lead (email);

-- Not tenant-scoped (pre-signup lead); locked to service role writes.
alter table public.calculator_lead enable row level security;
-- No SELECT policy — platform admins read via service-role Edge Functions.
