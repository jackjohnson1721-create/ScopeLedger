/**
 * POST /api/onboarding/org
 *
 * Creates an organization and the caller's initial admin membership.
 * Phase 1 scaffold — plan selection / Zoho subscription provisioning is
 * wired in Phase 7 and gates non-free tiers at that time.
 *
 * Request:  { name: string, slug: string }
 * Response: { org_id: string } | { error: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

const bodySchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/)
    .transform((s) => s.toLowerCase()),
});

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }

  const service = supabaseService();

  const { data: existing } = await service
    .from("organizations")
    .select("id")
    .eq("slug", parsed.data.slug)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: "slug_taken" }, { status: 409 });
  }

  const { data: org, error: orgErr } = await service
    .from("organizations")
    .insert({ name: parsed.data.name, slug: parsed.data.slug, plan: "free" })
    .select("id")
    .single();
  if (orgErr || !org) {
    return NextResponse.json({ error: orgErr?.message ?? "create_failed" }, { status: 500 });
  }

  const { error: memberErr } = await service.from("memberships").insert({
    user_id: user.id,
    org_id: org.id,
    role: "admin",
    status: "active",
  });
  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 });
  }

  return NextResponse.json({ org_id: org.id });
}
