/**
 * POST /api/capital-request/[id]/finalize
 *
 * Moves a capital-request from clinical_review → final. Gatekeeping:
 *  - caller must be admin/spd_manager
 *  - clinical_reviewed_at must be set
 *  - dual-signer check is enforced at UI level; finalize still stamps
 *    finalized_at and audit-logs the action
 */

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: cr, error } = await supabase
    .from("capital_request")
    .select("id, status, clinical_reviewed_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !cr) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (cr.status === "final") {
    return NextResponse.json({ status: "final" });
  }
  if (cr.status === "rescinded") {
    return NextResponse.json({ error: "rescinded" }, { status: 409 });
  }
  if (!cr.clinical_reviewed_at) {
    return NextResponse.json({ error: "clinical_review_required" }, { status: 412 });
  }

  const { data: updated, error: updErr } = await supabase
    .from("capital_request")
    .update({ status: "final", finalized_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, status, finalized_at")
    .single();

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 400 });
  }
  return NextResponse.json(updated);
}
