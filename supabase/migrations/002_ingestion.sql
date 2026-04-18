-- Phase 2 · Ingestion staging.
--
-- repair_event_candidates holds LLM-extracted line items that have NOT YET
-- been stitched to a concrete scope_identity. Once the stitcher (Phase 3)
-- matches a candidate to a scope with acceptable confidence, it is
-- promoted into repair_event. Until then, the candidate sits here for
-- HITL review.

create table public.repair_event_candidates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  ingestion_audit_id uuid not null references public.ingestion_audit(id) on delete cascade,
  candidate_oem_serial_number text,
  candidate_asset_tag text,
  service_date date,
  completion_date date,
  failure_mode_code text references public.failure_mode_taxonomy(code) on delete set null,
  description text,
  cost_cents bigint check (cost_cents >= 0),
  currency text not null default 'USD' check (char_length(currency) = 3),
  loaner_days integer check (loaner_days >= 0),
  extraction_confidence numeric(4, 3) check (extraction_confidence between 0 and 1),
  stitching_confidence numeric(4, 3) check (stitching_confidence between 0 and 1),
  matched_scope_id uuid references public.scope_identity(id) on delete set null,
  source repair_source not null default 'contracts_mailbox',
  hitl_status hitl_status not null default 'pending',
  promoted_repair_event_id uuid references public.repair_event(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index on public.repair_event_candidates (org_id, hitl_status, created_at desc);
create index on public.repair_event_candidates (ingestion_audit_id);

create trigger repair_event_candidates_set_updated_at
  before update on public.repair_event_candidates
  for each row execute function public.tg_set_updated_at();

-- RLS
alter table public.repair_event_candidates enable row level security;

create policy repair_event_candidates_select on public.repair_event_candidates
  for select to authenticated
  using (public.is_member_of(org_id));

create policy repair_event_candidates_write on public.repair_event_candidates
  for all to authenticated
  using (public.has_role_in(org_id, array['spd_manager','biomed','admin','platform_super_admin']::member_role[]))
  with check (public.has_role_in(org_id, array['spd_manager','biomed','admin','platform_super_admin']::member_role[]));
