-- ScopeLedger initial schema (Phase 1).
-- Derived from artifacts/schema.json v1.0.0-draft.
-- Hand-edit only via a new migration file; never amend an applied migration.

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- Enums ---------------------------------------------------------------------
create type plan_tier as enum ('free', 'pro_light', 'pro_standard', 'enterprise');
create type member_role as enum ('spd_manager', 'biomed', 'cfo_readonly', 'admin', 'platform_super_admin');
create type member_status as enum ('invited', 'active', 'disabled');
create type identity_key_policy as enum ('oem_serial_number', 'asset_tag', 'internal_id', 'composite');
create type scope_oem as enum ('stryker', 'olympus', 'karl_storz', 'richard_wolf', 'smith_nephew', 'conmed', 'other');
create type scope_type as enum ('rigid_arthroscope', 'rigid_laparoscope', 'rigid_cystoscope', 'rigid_hysteroscope', 'rigid_sinuscope', 'other');
create type scope_status as enum ('active', 'retired', 'replaced', 'loaner_pool');
create type failure_causation as enum ('wear', 'handling', 'contamination', 'unknown');
create type repair_source as enum ('spd_forward', 'contracts_mailbox', 'oem_portal', 'manual_entry', 'zoho_books', 'censitrac', 'spm', 'nuvolo');
create type hitl_status as enum ('not_required', 'pending', 'resolved');
create type threshold_flag as enum ('green', 'yellow', 'red', 'insufficient_data');
create type vendor_category as enum ('oem_direct', 'iso_third_party', 'internal_biomed', 'unknown');
create type ingest_source as enum ('postmark_inbound', 'web_upload', 'zoho_books_webhook', 'zoho_crm_webhook', 'manual_entry');
create type ocr_provider as enum ('aws_textract', 'azure_document_intelligence', 'none');
create type channel_kind as enum ('native_pdf', 'scanned_pdf', 'photo', 'email_body');
create type ingest_status as enum ('received', 'ocr_ok', 'classified', 'extracted', 'hitl_pending', 'persisted', 'failed');
create type capital_request_status as enum ('draft', 'clinical_review', 'final', 'rescinded');
create type billing_status as enum ('trial', 'active', 'past_due', 'canceled', 'paused');

-- Organizations (tenants) ---------------------------------------------------
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  plan plan_tier not null default 'free',
  identity_key_policy identity_key_policy not null default 'oem_serial_number',
  threshold_yellow_pct numeric(4, 3) not null default 0.45 check (threshold_yellow_pct between 0 and 1),
  threshold_red_pct numeric(4, 3) not null default 0.60 check (threshold_red_pct between 0 and 1),
  zoho_crm_account_id text,
  zoho_books_customer_id text,
  zoho_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (threshold_red_pct >= threshold_yellow_pct)
);

-- Memberships: user <-> org join with role ---------------------------------
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role member_role not null,
  status member_status not null default 'invited',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, org_id)
);

create index on public.memberships (org_id);
create index on public.memberships (user_id);

-- Scope identity -----------------------------------------------------------
create table public.scope_identity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  oem_serial_number text,
  asset_tag text,
  internal_id text,
  oem scope_oem not null default 'other',
  model_name text,
  scope_type scope_type,
  acquisition_date date,
  acquisition_cost_cents bigint check (acquisition_cost_cents >= 0),
  replacement_cost_cents bigint check (replacement_cost_cents >= 0),
  status scope_status not null default 'active',
  retirement_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.scope_identity (org_id);
create unique index scope_identity_org_serial_uniq
  on public.scope_identity (org_id, oem_serial_number)
  where oem_serial_number is not null;
create unique index scope_identity_org_asset_tag_uniq
  on public.scope_identity (org_id, asset_tag)
  where asset_tag is not null;

-- Failure mode taxonomy (global reference, seeded) -------------------------
create table public.failure_mode_taxonomy (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]+$'),
  label text not null,
  description text,
  causation failure_causation not null default 'unknown',
  distal_tip boolean not null default false
);

-- Vendor metadata (repair vendors, not scope OEMs) -------------------------
create table public.vendor_metadata (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  canonical_key text not null,
  category vendor_category not null default 'unknown',
  classification_confidence numeric(4, 3) check (classification_confidence between 0 and 1),
  created_at timestamptz not null default now(),
  unique (org_id, canonical_key)
);

-- Ingestion audit ----------------------------------------------------------
create table public.ingestion_audit (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  source ingest_source not null,
  idempotency_key text not null,
  storage_path text,
  received_at timestamptz not null default now(),
  ocr_provider ocr_provider,
  ocr_confidence numeric(4, 3) check (ocr_confidence between 0 and 1),
  classification_confidence numeric(4, 3) check (classification_confidence between 0 and 1),
  extraction_confidence numeric(4, 3) check (extraction_confidence between 0 and 1),
  channel_kind channel_kind,
  status ingest_status not null default 'received',
  error text,
  unique (org_id, source, idempotency_key)
);

create index on public.ingestion_audit (org_id, received_at desc);

-- Repair events ------------------------------------------------------------
create table public.repair_event (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  scope_id uuid not null references public.scope_identity(id) on delete cascade,
  vendor_id uuid references public.vendor_metadata(id) on delete set null,
  service_date date not null,
  completion_date date,
  failure_mode_code text references public.failure_mode_taxonomy(code) on delete set null,
  description text,
  cost_cents bigint not null check (cost_cents >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  loaner_days integer check (loaner_days >= 0),
  loaner_attributable boolean not null default false,
  stitching_confidence numeric(4, 3) check (stitching_confidence between 0 and 1),
  extraction_confidence numeric(4, 3) check (extraction_confidence between 0 and 1),
  source repair_source not null,
  ingestion_audit_id uuid references public.ingestion_audit(id) on delete set null,
  hitl_status hitl_status not null default 'not_required',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.repair_event (org_id, service_date desc);
create index on public.repair_event (scope_id, service_date desc);
create index repair_event_hitl_pending_idx on public.repair_event (org_id) where hitl_status = 'pending';

-- Derived metrics (materialized per scope) ---------------------------------
create table public.derived_metrics (
  scope_id uuid primary key references public.scope_identity(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  rolling_12mo_spend_cents bigint not null default 0,
  lifetime_spend_cents bigint not null default 0,
  rolling_12mo_repair_count integer not null default 0,
  distal_tip_12mo_count integer not null default 0,
  wear_mode_spend_cents bigint not null default 0,
  handling_mode_spend_cents bigint not null default 0,
  threshold_ratio numeric(6, 4),
  threshold_flag threshold_flag not null default 'insufficient_data',
  handling_audit_flag boolean not null default false,
  avoided_replacement_estimate numeric(6, 2) not null default 0,
  loaner_days_attributable_12mo integer not null default 0,
  computed_at timestamptz not null default now()
);

create index on public.derived_metrics (org_id, threshold_flag);

-- Capital requests ---------------------------------------------------------
create table public.capital_request (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  scope_id uuid not null references public.scope_identity(id) on delete cascade,
  status capital_request_status not null default 'draft',
  coverage_pct numeric(4, 3) check (coverage_pct between 0 and 1),
  min_field_confidence numeric(4, 3) check (min_field_confidence between 0 and 1),
  dual_signer_required boolean not null default false,
  clinical_reviewed_at timestamptz,
  clinical_reviewed_by uuid references auth.users(id) on delete set null,
  finalized_at timestamptz,
  pdf_storage_path text,
  pdf_sha256 text,
  zoho_books_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.capital_request (org_id, status, created_at desc);

-- Billing mirror (source of truth = Zoho) ----------------------------------
create table public.billing (
  org_id uuid primary key references public.organizations(id) on delete cascade,
  zoho_subscription_id text not null,
  zoho_customer_id text,
  plan plan_tier not null,
  status billing_status not null default 'trial',
  channel_mix_native_pdf_pct numeric(4, 3) check (channel_mix_native_pdf_pct between 0 and 1),
  channel_mix_gate_met boolean,
  next_renewal_at timestamptz,
  synced_at timestamptz not null default now()
);

-- Audit log (append-only) --------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  diff jsonb,
  occurred_at timestamptz not null default now()
);

create index on public.audit_log (org_id, occurred_at desc);

-- updated_at touchers ------------------------------------------------------
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.tg_set_updated_at();
create trigger memberships_set_updated_at
  before update on public.memberships
  for each row execute function public.tg_set_updated_at();
create trigger scope_identity_set_updated_at
  before update on public.scope_identity
  for each row execute function public.tg_set_updated_at();
create trigger repair_event_set_updated_at
  before update on public.repair_event
  for each row execute function public.tg_set_updated_at();
create trigger capital_request_set_updated_at
  before update on public.capital_request
  for each row execute function public.tg_set_updated_at();

-- Membership lookup helper -------------------------------------------------
create or replace function public.is_member_of(target_org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_role_in(target_org uuid, required member_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    where m.org_id = target_org
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(required)
  );
$$;

-- RLS: enable on every tenant-scoped table ---------------------------------
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.scope_identity enable row level security;
alter table public.vendor_metadata enable row level security;
alter table public.ingestion_audit enable row level security;
alter table public.repair_event enable row level security;
alter table public.derived_metrics enable row level security;
alter table public.capital_request enable row level security;
alter table public.billing enable row level security;
alter table public.audit_log enable row level security;
alter table public.failure_mode_taxonomy enable row level security;

-- Organizations: read if member; write if admin ----------------------------
create policy organizations_select on public.organizations
  for select
  to authenticated
  using (public.is_member_of(id));

create policy organizations_update_admin on public.organizations
  for update
  to authenticated
  using (public.has_role_in(id, array['admin', 'platform_super_admin']::member_role[]))
  with check (public.has_role_in(id, array['admin', 'platform_super_admin']::member_role[]));

-- Memberships: members can see their org's memberships; admins mutate ------
create policy memberships_select on public.memberships
  for select
  to authenticated
  using (user_id = auth.uid() or public.is_member_of(org_id));

create policy memberships_write_admin on public.memberships
  for all
  to authenticated
  using (public.has_role_in(org_id, array['admin', 'platform_super_admin']::member_role[]))
  with check (public.has_role_in(org_id, array['admin', 'platform_super_admin']::member_role[]));

-- Tenant-scoped tables (standard pattern) ----------------------------------
-- scope_identity
create policy scope_identity_select on public.scope_identity
  for select to authenticated using (public.is_member_of(org_id));
create policy scope_identity_write on public.scope_identity
  for all to authenticated
  using (public.has_role_in(org_id, array['spd_manager','biomed','admin','platform_super_admin']::member_role[]))
  with check (public.has_role_in(org_id, array['spd_manager','biomed','admin','platform_super_admin']::member_role[]));

-- vendor_metadata
create policy vendor_metadata_select on public.vendor_metadata
  for select to authenticated using (public.is_member_of(org_id));
create policy vendor_metadata_write on public.vendor_metadata
  for all to authenticated
  using (public.has_role_in(org_id, array['spd_manager','biomed','admin','platform_super_admin']::member_role[]))
  with check (public.has_role_in(org_id, array['spd_manager','biomed','admin','platform_super_admin']::member_role[]));

-- ingestion_audit (read-only to app users; writes via service role)
create policy ingestion_audit_select on public.ingestion_audit
  for select to authenticated using (public.is_member_of(org_id));

-- repair_event
create policy repair_event_select on public.repair_event
  for select to authenticated using (public.is_member_of(org_id));
create policy repair_event_write on public.repair_event
  for all to authenticated
  using (public.has_role_in(org_id, array['spd_manager','biomed','admin','platform_super_admin']::member_role[]))
  with check (public.has_role_in(org_id, array['spd_manager','biomed','admin','platform_super_admin']::member_role[]));

-- derived_metrics (read-only to users; writes via triggers + service role)
create policy derived_metrics_select on public.derived_metrics
  for select to authenticated using (public.is_member_of(org_id));

-- capital_request
create policy capital_request_select on public.capital_request
  for select to authenticated using (public.is_member_of(org_id));
create policy capital_request_write on public.capital_request
  for all to authenticated
  using (public.has_role_in(org_id, array['spd_manager','admin','platform_super_admin']::member_role[]))
  with check (public.has_role_in(org_id, array['spd_manager','admin','platform_super_admin']::member_role[]));

-- billing (read-only to admins)
create policy billing_select_admin on public.billing
  for select to authenticated
  using (public.has_role_in(org_id, array['admin','cfo_readonly','platform_super_admin']::member_role[]));

-- audit_log (read-only to admins; writes via service role)
create policy audit_log_select_admin on public.audit_log
  for select to authenticated
  using (public.has_role_in(org_id, array['admin','platform_super_admin']::member_role[]));

-- failure_mode_taxonomy (global readable; writes via service role)
create policy failure_mode_taxonomy_select on public.failure_mode_taxonomy
  for select to authenticated using (true);

-- Seed failure modes -------------------------------------------------------
insert into public.failure_mode_taxonomy (code, label, description, causation, distal_tip) values
  ('distal_tip_bend',         'Distal tip bent',          'Tip deformation from mishandling', 'handling', true),
  ('distal_tip_crush',        'Distal tip crushed',       'Tip crush damage',                 'handling', true),
  ('fiber_broken',            'Light fibers broken',      'Broken light bundle fibers',       'wear',     false),
  ('lens_fogged',             'Lens fogged / cloudy',     'Seal failure, moisture intrusion', 'wear',     false),
  ('sheath_dented',           'Outer sheath dented',      'Dented outer tube',                'handling', false),
  ('eyepiece_loose',          'Eyepiece loose',           'Loose eyepiece coupling',          'wear',     false),
  ('reprocessing_damage',     'Reprocessing damage',      'Damage from reprocessing cycle',   'contamination', false),
  ('leak_test_fail',          'Leak test failure',        'Positive-pressure leak test fail', 'wear',     false),
  ('unknown',                 'Unknown / unclassified',   'Pending HITL review',              'unknown',  false)
on conflict (code) do nothing;
