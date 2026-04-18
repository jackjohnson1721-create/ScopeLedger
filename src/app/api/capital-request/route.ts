/**
 * POST /api/capital-request
 *
 * Creates a draft capital-request tied to a scope. Caller must be a member
 * with spd_manager/admin role (enforced by RLS).
 *
 * Body: { scope_id: uuid }
 * Returns: { capital_request_id: uuid }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const schema = z.object({ scope_id: z.string().uuid() });

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: scope, error: scopeErr } = await supabase
    .from("scope_identity")
    .select("id, org_id, replacement_cost_cents")
    .eq("id", body.scope_id)
    .maybeSingle();
  if (scopeErr || !scope) {
    return NextResponse.json({ error: "scope_not_found" }, { status: 404 });
  }

  const { data: metrics } = await supabase
    .from("derived_metrics")
    .select("threshold_flag, threshold_ratio")
    .eq("scope_id", scope.id)
    .maybeSingle();

  const dualSigner =
    metrics?.threshold_flag === "red" ||
    (scope.replacement_cost_cents !== null && scope.replacement_cost_cents >= 2_000_000);

  const { data, error } = await supabase
    .from("capital_request")
    .insert({
      org_id: scope.org_id,
      scope_id: scope.id,
      status: "draft",
      dual_signer_required: dualSigner,
    })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "insert_failed" }, { status: 400 });
  }
  return NextResponse.json({ capital_request_id: data.id });
}
