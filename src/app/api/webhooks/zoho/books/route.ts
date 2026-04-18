/**
 * POST /api/webhooks/zoho/books
 *
 * Zoho Books webhook. Fires on invoice_created / payment_received etc.
 * Phase 8: when the invoice line items reference scope serials or
 * asset tags, we ingest them through the standard orchestrator so they
 * land in repair_event_candidates (HITL). Unmatched events are
 * logged-only.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyHmacSha256 } from "@/lib/webhook/verify";
import { supabaseService } from "@/lib/supabase/service";
import { orchestrateIngest } from "@/lib/ingest/orchestrate";
import { awsTextractProvider } from "@/lib/ocr/textract";
import { azureDocIntelProvider } from "@/lib/ocr/azure";

const payloadSchema = z.object({
  event_id: z.string(),
  event_type: z.string().optional(),
  organization_id: z.string(),
  invoice: z
    .object({
      invoice_id: z.string(),
      invoice_number: z.string().optional(),
      date: z.string().optional(),
      total: z.number().optional(),
      currency_code: z.string().optional(),
      customer_name: z.string().optional(),
      line_items: z
        .array(
          z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().optional(),
            rate: z.number().optional(),
            item_total: z.number().optional(),
          }),
        )
        .optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.ZOHO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "misconfigured" }, { status: 500 });

  const sig = request.headers.get("x-zoho-webhook-signature");
  if (!verifyHmacSha256({ rawBody: raw, signature: sig, secret })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: z.infer<typeof payloadSchema>;
  try {
    payload = payloadSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
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

  // Log-first, process-after: if parsing line-items fails, we still
  // have an audit trail we can replay.
  await service.from("ingestion_audit").upsert(
    {
      org_id: org.id,
      source: "zoho_books_webhook",
      idempotency_key: payload.event_id,
      status: "received",
    },
    { onConflict: "org_id,source,idempotency_key", ignoreDuplicates: true },
  );

  if (payload.invoice && payload.invoice.line_items?.length) {
    const bodyText = formatInvoiceAsText(payload.invoice);
    const bytes = new TextEncoder().encode(bodyText);
    const providers = [awsTextractProvider(), azureDocIntelProvider()];

    await orchestrateIngest(
      { service, ocrProviders: providers },
      {
        orgId: org.id,
        source: "zoho_books_webhook",
        idempotencyKey: payload.event_id,
        storagePath: null,
        channelKind: "email_body",
        bytes,
        mimeType: "text/plain",
      },
    );
  }

  return NextResponse.json({ status: "ok", event_type: payload.event_type });
}

function formatInvoiceAsText(inv: NonNullable<z.infer<typeof payloadSchema>["invoice"]>): string {
  const lines: string[] = [];
  lines.push(`Zoho Books invoice ${inv.invoice_number ?? inv.invoice_id}`);
  lines.push(`Date: ${inv.date ?? ""}`);
  lines.push(`Vendor: ${inv.customer_name ?? ""}`);
  lines.push(`Total: ${inv.currency_code ?? "USD"} ${inv.total ?? ""}`);
  lines.push("Line items:");
  for (const li of inv.line_items ?? []) {
    lines.push(
      `- ${li.name ?? ""} ${li.description ?? ""} qty=${li.quantity ?? 1} rate=${li.rate ?? 0} total=${li.item_total ?? 0}`,
    );
  }
  return lines.join("\n");
}
