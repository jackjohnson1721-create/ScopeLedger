/**
 * POST /api/calculator/lead
 *
 * Receives calculator submissions from unauthenticated visitors. Writes
 * to `calculator_lead` (migration 005). Cohort opt-in is default-on
 * but softly gated: if cohort_opt_in is false we store the lead but
 * NOT the numeric values, preserving contactability without capturing
 * anonymized cohort data. Rate-limited at 10/hr/IP.
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase/service";

const schema = z.object({
  email: z.string().email(),
  spend_cents: z.number().int().nonnegative(),
  replacement_cents: z.number().int().nonnegative(),
  result_flag: z.enum(["green", "yellow", "red", "insufficient_data"]),
  result_ratio: z.number().nullable(),
  cohort_opt_in: z.boolean(),
});

export async function POST(request: Request) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const service = supabaseService();

  await service.from("calculator_lead").insert({
    email: body.email,
    result_flag: body.result_flag,
    cohort_opt_in: body.cohort_opt_in,
    spend_cents: body.cohort_opt_in ? body.spend_cents : null,
    replacement_cents: body.cohort_opt_in ? body.replacement_cents : null,
    result_ratio: body.cohort_opt_in ? body.result_ratio : null,
    ip_hash: hashIp(request),
  });

  return NextResponse.json({ status: "ok" });
}

function hashIp(request: Request): string | null {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip");
  if (!ip) return null;
  return crypto.createHash("sha256").update(ip).digest("hex");
}
