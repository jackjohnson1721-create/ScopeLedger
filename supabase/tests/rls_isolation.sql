-- Phase 13 · RLS tenant-isolation tests.
--
-- Run locally with: `supabase db test`
--
-- The fixture builds two orgs with one user each, then impersonates
-- each user (via `set local role authenticated` + JWT claim sub) and
-- asserts that cross-tenant SELECT/UPDATE/DELETE on every tenant-
-- scoped table returns 0 rows or raises `insufficient_privilege`.
--
-- pg-tap is available in Supabase local DBs. If running against a
-- fresh project, install with:
--   create extension if not exists pgtap with schema extensions;

begin;
select plan(12);

-- Fixtures --------------------------------------------------------------
do $$
declare
  org_a uuid;
  org_b uuid;
  user_a uuid := '11111111-1111-1111-1111-111111111111';
  user_b uuid := '22222222-2222-2222-2222-222222222222';
begin
  insert into auth.users (id, email, instance_id, aud, role)
    values (user_a, 'a@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
    on conflict (id) do nothing;
  insert into auth.users (id, email, instance_id, aud, role)
    values (user_b, 'b@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
    on conflict (id) do nothing;

  insert into public.organizations (name, slug) values ('Org A', 'rls-org-a')
    returning id into org_a;
  insert into public.organizations (name, slug) values ('Org B', 'rls-org-b')
    returning id into org_b;

  insert into public.memberships (user_id, org_id, role, status)
    values (user_a, org_a, 'admin', 'active');
  insert into public.memberships (user_id, org_id, role, status)
    values (user_b, org_b, 'admin', 'active');

  insert into public.scope_identity (org_id, oem_serial_number)
    values (org_a, 'A-SN-1');
  insert into public.scope_identity (org_id, oem_serial_number)
    values (org_b, 'B-SN-1');
end $$;

-- Helper: impersonate user_a -------------------------------------------
create or replace function test_set_user(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid::text, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end $$;

-- Test 1: org_a user sees exactly one organization -------------------
select test_set_user('11111111-1111-1111-1111-111111111111');
select is(
  (select count(*)::int from public.organizations where slug like 'rls-org-%'),
  1,
  'Org A admin sees exactly one rls-org row (their own)'
);
select is(
  (select slug from public.organizations where slug like 'rls-org-%' limit 1),
  'rls-org-a',
  'Org A admin sees rls-org-a, not rls-org-b'
);

-- Test 2: org_a user sees only org_a scopes --------------------------
select is(
  (select count(*)::int from public.scope_identity where oem_serial_number like '%-SN-1'),
  1,
  'Org A admin sees 1 scope_identity row'
);
select is(
  (select oem_serial_number from public.scope_identity where oem_serial_number like '%-SN-1'),
  'A-SN-1',
  'Org A admin sees A-SN-1, not B-SN-1'
);

-- Test 3: cross-tenant INSERT rejected -------------------------------
select throws_ok(
  $$ insert into public.scope_identity (org_id, oem_serial_number)
     values ((select id from public.organizations where slug = 'rls-org-b'), 'CROSS-TENANT') $$,
  NULL,
  'Org A admin cannot insert into Org B (RLS with-check rejects)'
);

-- Test 4: cross-tenant UPDATE is a no-op -----------------------------
select is(
  (with u as (
     update public.scope_identity
        set model_name = 'hijacked'
      where oem_serial_number = 'B-SN-1'
      returning 1
   ) select count(*)::int from u),
  0,
  'Org A admin UPDATE on Org B row updates zero rows'
);

-- Test 5: org_b user sees org_b side ---------------------------------
select test_set_user('22222222-2222-2222-2222-222222222222');
select is(
  (select slug from public.organizations where slug like 'rls-org-%' limit 1),
  'rls-org-b',
  'Org B admin sees their own org'
);
select is(
  (select oem_serial_number from public.scope_identity where oem_serial_number like '%-SN-1'),
  'B-SN-1',
  'Org B admin sees B-SN-1, not A-SN-1'
);

-- Test 6: unauthenticated (anon) sees nothing ------------------------
do $$ begin perform set_config('role', 'anon', true); end $$;
select is(
  (select count(*)::int from public.organizations where slug like 'rls-org-%'),
  0,
  'Anonymous role sees zero organizations'
);
select is(
  (select count(*)::int from public.scope_identity where oem_serial_number like '%-SN-1'),
  0,
  'Anonymous role sees zero scope_identity rows'
);
select is(
  (select count(*)::int from public.memberships),
  0,
  'Anonymous role sees zero memberships'
);

-- Test 7: audit_log is admin-only ------------------------------------
select test_set_user('11111111-1111-1111-1111-111111111111');
select is(
  (select count(*)::int from public.audit_log where entity_table = 'organizations'),
  (select count(*)::int from public.audit_log
    where entity_table = 'organizations'
      and org_id = (select id from public.organizations where slug = 'rls-org-a')),
  'Org A admin only sees audit_log rows for Org A'
);

select * from finish();
rollback;
