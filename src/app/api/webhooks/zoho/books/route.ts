/**
 * POST /api/webhooks/zoho/books
 *
 * Zoho Books webhook. Fires on invoice_created / payment_received etc.
 * Phase 2 scaffold: verifies signature, logs an ingestion_audit row
 * keyed on Zoho's event id; actual invoice-to-repair mapping is
 * implemented in Phase 8 when the Zoho Books sync goes bidirectional.
 */

import { NextResponse } from "next/server";
import { verifyHmacSha256 } from "@/lib/webhook/verify";
import { supabaseService } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const sig = request.headers.get("x-zoho-webhook-signature");
  if (!verifyHmacSha256({ rawBody: raw, signature: sig, secret })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: { event_id?: string; organization_id?: string; event_type?: string };
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!payload.event_id || !payload.organization_id) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const service = supabaseService();
  const { data: org } = await service
    .from("organizations")
    .select("id")
    .eq("zoho_books_customer_id", payload.organization_id)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ status: "ignored" });
  }

  await service
    .from("ingestion_audit")
    .upsert(
      {
        org_id: org.id,
        source: "zoho_books_webhook",
        idempotency_key: payload.event_id,
        status: "received",
      },
      { onConflict: "org_id,source,idempotency_key", ignoreDuplicates: true },
    );

  return NextResponse.json({ status: "received", event_type: payload.event_type });
}
