-- Phase 11 · Enterprise compliance vault.
--
-- compliance_document: catalogs signed compliance artifacts (SIG Lite,
-- BAA, SOC 2 Type II letter, policy attestations). Documents live in
-- Storage; this table stores metadata + sha256 for verification.

create type compliance_doc_kind as enum (
  'sig_lite',
  'baa',
  'soc2_type2',
  'policy_attestation',
  'other'
);

create table public.compliance_document (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind compliance_doc_kind not null,
  title text not null,
  storage_path text not null,
  sha256 text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  effective_date date,
  expires_at date,
  created_at timestamptz not null default now()
);

create index on public.compliance_document (org_id, kind);
create index on public.compliance_document (org_id, expires_at);

alter table public.compliance_document enable row level security;

create policy compliance_document_select on public.compliance_document
  for select to authenticated
  using (public.has_role_in(org_id, array['admin','cfo_readonly','platform_super_admin']::member_role[]));

create policy compliance_document_write on public.compliance_document
  for all to authenticated
  using (public.has_role_in(org_id, array['admin','platform_super_admin']::member_role[]))
  with check (public.has_role_in(org_id, array['admin','platform_super_admin']::member_role[]));
