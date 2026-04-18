-- Phase 3 · Threshold engine + derived metrics recomputation.
--
-- On any repair_event mutation we recompute the affected scope's row in
-- derived_metrics. The algorithm:
--   rolling_12mo_spend_cents       = sum(cost_cents) over last 365 days
--   lifetime_spend_cents           = sum(cost_cents) over all time
--   rolling_12mo_repair_count      = count(*) over last 365 days
--   distal_tip_12mo_count          = count(*) where failure_mode.distal_tip=true
--   wear_mode_spend_cents          = sum cost where causation='wear'        (lifetime)
--   handling_mode_spend_cents      = sum cost where causation='handling'    (lifetime)
--   threshold_ratio                = rolling_12mo / replacement_cost
--   threshold_flag                 = green <yellow, yellow <red, red >=red
--                                    insufficient_data if replacement_cost null/0
--   handling_audit_flag            = >=3 handling events in last 180 days
--   loaner_days_attributable_12mo  = sum(loaner_days) where loaner_attributable,
--                                    over last 365 days
--   avoided_replacement_estimate   = max(0, (replacement_cost - rolling_12mo) / 100)
--                                    reported in dollars, for UI only

create or replace function public.recompute_derived_metrics(target_scope uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_replace bigint;
  v_yellow numeric;
  v_red numeric;
  v_12mo_spend bigint := 0;
  v_lifetime bigint := 0;
  v_12mo_count int := 0;
  v_distal_12 int := 0;
  v_wear bigint := 0;
  v_handling bigint := 0;
  v_handling_count_180 int := 0;
  v_loaner_12 int := 0;
  v_ratio numeric(6, 4);
  v_flag threshold_flag;
  v_audit bool;
  v_avoided numeric(6, 2);
begin
  select s.org_id, s.replacement_cost_cents
    into v_org, v_replace
  from public.scope_identity s
  where s.id = target_scope;

  if v_org is null then
    return;
  end if;

  select o.threshold_yellow_pct, o.threshold_red_pct
    into v_yellow, v_red
  from public.organizations o
  where o.id = v_org;

  select
    coalesce(sum(case when r.service_date >= current_date - 365
                      then r.cost_cents end), 0),
    coalesce(sum(r.cost_cents), 0),
    coalesce(count(*) filter (where r.service_date >= current_date - 365), 0),
    coalesce(sum(case when r.loaner_attributable
                       and r.service_date >= current_date - 365
                      then r.loaner_days end), 0)
    into v_12mo_spend, v_lifetime, v_12mo_count, v_loaner_12
  from public.repair_event r
  where r.scope_id = target_scope;

  select
    coalesce(count(*) filter (
      where r.service_date >= current_date - 365
        and f.distal_tip = true), 0),
    coalesce(sum(case when f.causation = 'wear' then r.cost_cents end), 0),
    coalesce(sum(case when f.causation = 'handling' then r.cost_cents end), 0),
    coalesce(count(*) filter (
      where f.causation = 'handling'
        and r.service_date >= current_date - 180), 0)
    into v_distal_12, v_wear, v_handling, v_handling_count_180
  from public.repair_event r
  left join public.failure_mode_taxonomy f on f.code = r.failure_mode_code
  where r.scope_id = target_scope;

  if v_replace is null or v_replace <= 0 then
    v_ratio := null;
    v_flag := 'insufficient_data';
  else
    v_ratio := v_12mo_spend::numeric / v_replace::numeric;
    if v_ratio >= v_red then
      v_flag := 'red';
    elsif v_ratio >= v_yellow then
      v_flag := 'yellow';
    else
      v_flag := 'green';
    end if;
  end if;

  v_audit := v_handling_count_180 >= 3;

  if v_replace is null or v_replace <= 0 then
    v_avoided := 0;
  else
    v_avoided := greatest(0, (v_replace - v_12mo_spend)::numeric / 100.0);
  end if;

  insert into public.derived_metrics (
    scope_id, org_id,
    rolling_12mo_spend_cents, lifetime_spend_cents,
    rolling_12mo_repair_count, distal_tip_12mo_count,
    wear_mode_spend_cents, handling_mode_spend_cents,
    threshold_ratio, threshold_flag,
    handling_audit_flag, avoided_replacement_estimate,
    loaner_days_attributable_12mo, computed_at
  )
  values (
    target_scope, v_org,
    v_12mo_spend, v_lifetime,
    v_12mo_count, v_distal_12,
    v_wear, v_handling,
    v_ratio, v_flag,
    v_audit, v_avoided,
    v_loaner_12, now()
  )
  on conflict (scope_id) do update set
    org_id = excluded.org_id,
    rolling_12mo_spend_cents = excluded.rolling_12mo_spend_cents,
    lifetime_spend_cents = excluded.lifetime_spend_cents,
    rolling_12mo_repair_count = excluded.rolling_12mo_repair_count,
    distal_tip_12mo_count = excluded.distal_tip_12mo_count,
    wear_mode_spend_cents = excluded.wear_mode_spend_cents,
    handling_mode_spend_cents = excluded.handling_mode_spend_cents,
    threshold_ratio = excluded.threshold_ratio,
    threshold_flag = excluded.threshold_flag,
    handling_audit_flag = excluded.handling_audit_flag,
    avoided_replacement_estimate = excluded.avoided_replacement_estimate,
    loaner_days_attributable_12mo = excluded.loaner_days_attributable_12mo,
    computed_at = excluded.computed_at;
end;
$$;

-- Trigger: recompute on repair_event insert/update/delete.
create or replace function public.tg_repair_event_recompute()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_derived_metrics(old.scope_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and new.scope_id is distinct from old.scope_id then
    perform public.recompute_derived_metrics(old.scope_id);
  end if;

  perform public.recompute_derived_metrics(new.scope_id);
  return new;
end;
$$;

create trigger repair_event_recompute_metrics
  after insert or update or delete on public.repair_event
  for each row execute function public.tg_repair_event_recompute();

-- Trigger: when a scope's replacement_cost or thresholds change, recompute.
create or replace function public.tg_scope_recompute()
returns trigger
language plpgsql
as $$
begin
  if new.replacement_cost_cents is distinct from old.replacement_cost_cents then
    perform public.recompute_derived_metrics(new.id);
  end if;
  return new;
end;
$$;

create trigger scope_identity_recompute_metrics
  after update on public.scope_identity
  for each row execute function public.tg_scope_recompute();

-- Helpful index for the rolling-window scans above.
create index if not exists repair_event_scope_service_date_idx
  on public.repair_event (scope_id, service_date);
