/**
 * POST /api/webhooks/zoho/subscriptions
 *
 * Zoho Subscriptions webhook. Maps subscription.* + invoice.paid events
 * to our `billing` mirror row. Signature: HMAC-SHA256 against
 * ZOHO_SUBSCRIPTIONS_WEBHOOK_SECRET (the secret is configured in the
 * Zoho Subscriptions console under webhooks).
 *
 * Idempotency: we upsert `billing` keyed on org_id and log the event
 * into ingestion_audit keyed on (org_id, 'zoho_subscriptions_webhook',
 * event_id) so replays are no-ops.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyHmacSha256 } from "@/lib/webhook/verify";
import { supabaseService } from "@/lib/supabase/service";

const eventSchema = z.object({
  event_id: z.string(),
  event_type: z.string(),
  data: z.object({
    subscription: z
      .object({
        subscription_id: z.string(),
        customer_id: z.string().optional(),
        plan: z
          .object({
            plan_code: z.string(),
          })
          .optional(),
        status: z.string(),
        next_billing_at: z.string().optional(),
      })
      .optional(),
  }),
});

const PLAN_CODE_MAP: Record<string, "free" | "pro_light" | "pro_standard" | "enterprise"> = {
  scopeledger_free: "free",
  scopeledger_pro_light: "pro_light",
  scopeledger_pro_standard: "pro_standard",
  scopeledger_enterprise: "enterprise",
};

const STATUS_MAP: Record<string, "trial" | "active" | "past_due" | "canceled" | "paused"> = {
  live: "active",
  active: "active",
  trial: "trial",
  past_due: "past_due",
  dunning: "past_due",
  cancelled: "canceled",
  canceled: "canceled",
  non_renewing: "active",
  expired: "canceled",
  paused: "paused",
};

export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.ZOHO_SUBSCRIPTIONS_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const sig = request.headers.get("x-zoho-webhook-signature");
  if (!verifyHmacSha256({ rawBody: raw, signature: sig, secret })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let parsed: z.infer<typeof eventSchema>;
  try {
    parsed = eventSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const sub = parsed.data.subscription;
  if (!sub) return NextResponse.json({ status: "ignored" });

  const service = supabaseService();
  const { data: org } = await service
    .from("organizations")
    .select("id")
    .eq("zoho_subscription_id", sub.subscription_id)
    .maybeSingle();
  if (!org) return NextResponse.json({ status: "unknown_subscription" });

  const plan = sub.plan ? PLAN_CODE_MAP[sub.plan.plan_code] ?? "free" : "free";
  const status = STATUS_MAP[sub.status.toLowerCase()] ?? "trial";

  await service.from("billing").upsert(
    {
      org_id: org.id,
      zoho_subscription_id: sub.subscription_id,
      zoho_customer_id: sub.customer_id ?? null,
      plan,
      status,
      next_renewal_at: sub.next_billing_at ?? null,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "org_id" },
  );

  await service.from("organizations").update({ plan }).eq("id", org.id);

  await service.from("ingestion_audit").upsert(
    {
      org_id: org.id,
      source: "zoho_subscriptions_webhook",
      idempotency_key: parsed.event_id,
      status: "persisted",
      channel_kind: "email_body",
    },
    { onConflict: "org_id,source,idempotency_key", ignoreDuplicates: true },
  );

  return NextResponse.json({ status: "ok", event_type: parsed.event_type });
}
