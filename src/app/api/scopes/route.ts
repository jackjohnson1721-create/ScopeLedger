/**
 * GET  /api/scopes  — list scopes for the caller's org
 * POST /api/scopes  — create a scope
 *
 * RLS enforces tenant isolation and role (spd_manager/biomed/admin).
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

const createSchema = z.object({
  oem_serial_number: z.string().trim().min(1).optional().nullable(),
  asset_tag: z.string().trim().min(1).optional().nullable(),
  internal_id: z.string().trim().min(1).optional().nullable(),
  oem: z
    .enum([
      "stryker",
      "olympus",
      "karl_storz",
      "richard_wolf",
      "smith_nephew",
      "conmed",
      "other",
    ])
    .optional()
    .default("other"),
  model_name: z.string().trim().optional().nullable(),
  scope_type: z
    .enum([
      "rigid_arthroscope",
      "rigid_laparoscope",
      "rigid_cystoscope",
      "rigid_hysteroscope",
      "rigid_sinuscope",
      "other",
    ])
    .optional()
    .nullable(),
  acquisition_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  acquisition_cost_cents: z.number().int().nonnegative().optional().nullable(),
  replacement_cost_cents: z.number().int().nonnegative().optional().nullable(),
});

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("scope_identity")
    .select(
      "id, oem_serial_number, asset_tag, internal_id, oem, model_name, scope_type, status, replacement_cost_cents",
    )
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ scopes: data });
}

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: "invalid_body", details: (err as Error).message },
      { status: 400 },
    );
  }

  if (!body.oem_serial_number && !body.asset_tag && !body.internal_id) {
    return NextResponse.json({ error: "need_identity" }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "no_org" }, { status: 403 });

  const { data, error } = await supabase
    .from("scope_identity")
    .insert({ ...body, org_id: membership.org_id })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ scope_id: data.id });
}
