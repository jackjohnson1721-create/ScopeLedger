/**
 * POST /api/capital-request/[id]/clinical-review
 *
 * Records SPD-manager clinical review. Transitions a draft to
 * clinical_review status. The user is captured via auth.
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

  const { data, error } = await supabase
    .from("capital_request")
    .update({
      status: "clinical_review",
      clinical_reviewed_at: new Date().toISOString(),
      clinical_reviewed_by: user.id,
    })
    .eq("id", id)
    .select("id, status, clinical_reviewed_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
