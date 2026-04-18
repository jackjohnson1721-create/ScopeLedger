-- Phase 7 · Zoho integration storage.

-- Extend ingest_source enum with Zoho Subscriptions + Payments webhooks.
alter type ingest_source add value if not exists 'zoho_subscriptions_webhook';
alter type ingest_source add value if not exists 'zoho_payments_webhook';
--
-- One row per org per Zoho product. Refresh tokens live here under the
-- service role only (never exposed via RLS to authenticated users).

create type zoho_dc as enum ('com', 'eu', 'in', 'au', 'jp');
create type zoho_product as enum ('subscriptions', 'books', 'crm', 'payments');

create table public.zoho_connection (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product zoho_product not null,
  dc zoho_dc not null,
  api_domain text not null,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  scope text not null,
  connected_by uuid references auth.users(id) on delete set null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, product)
);

create index on public.zoho_connection (org_id);

create trigger zoho_connection_set_updated_at
  before update on public.zoho_connection
  for each row execute function public.tg_set_updated_at();

-- RLS: no direct user read. Service role handles all tokens. We expose a
-- SELECT-only view if a UI surface ever needs "connected" status.
alter table public.zoho_connection enable row level security;

create policy zoho_connection_select_admin on public.zoho_connection
  for select to authenticated
  using (public.has_role_in(org_id, array['admin','platform_super_admin']::member_role[]));
