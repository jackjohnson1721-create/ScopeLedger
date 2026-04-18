/**
 * POST /api/webhooks/postmark
 *
 * Postmark inbound email webhook. MailboxHash on the "To" address routes
 * to the org slug (slug@in.scopeledger.io). Attachments become ingestion
 * artifacts; the email body is itself an "email_body" channel artifact
 * for plain-text invoice forwards.
 *
 * Security:
 *  1. Verify HMAC-SHA256 signature against POSTMARK_INBOUND_WEBHOOK_SECRET.
 *  2. Resolve the org from MailboxHash via a service-role lookup. Reject
 *     unknown slugs with 404 (do not leak slug existence).
 *  3. Use MessageID as idempotency_key so replays are no-ops.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyHmacSha256 } from "@/lib/webhook/verify";
import { supabaseService } from "@/lib/supabase/service";
import { orchestrateIngest } from "@/lib/ingest/orchestrate";
import { awsTextractProvider } from "@/lib/ocr/textract";
import { azureDocIntelProvider } from "@/lib/ocr/azure";

const attachmentSchema = z.object({
  Name: z.string(),
  Content: z.string(),
  ContentType: z.string(),
  ContentLength: z.number().int().nonnegative(),
});

const inboundSchema = z.object({
  MessageID: z.string(),
  MailboxHash: z.string().min(1),
  From: z.string().email(),
  Subject: z.string().optional().default(""),
  TextBody: z.string().optional().default(""),
  HtmlBody: z.string().optional().default(""),
  Attachments: z.array(attachmentSchema).optional().default([]),
});

const ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const raw = await request.text();

  const secret = process.env.POSTMARK_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }
  const sig = request.headers.get("x-postmark-signature");
  if (!verifyHmacSha256({ rawBody: raw, signature: sig, secret })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let parsed;
  try {
    parsed = inboundSchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const service = supabaseService();
  const { data: org } = await service
    .from("organizations")
    .select("id")
    .eq("slug", parsed.MailboxHash)
    .maybeSingle();
  if (!org) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const providers = [awsTextractProvider(), azureDocIntelProvider()];

  const tasks: Promise<unknown>[] = [];

  for (const [idx, att] of parsed.Attachments.entries()) {
    if (att.ContentLength > ATTACHMENT_MAX_BYTES) continue;
    const mime = att.ContentType;
    if (!/^(application\/pdf|image\/(png|jpe?g))$/.test(mime)) continue;

    const bytes = Uint8Array.from(Buffer.from(att.Content, "base64"));
    const storagePath = `inbound/${org.id}/${parsed.MessageID}/${idx}-${safeName(att.Name)}`;
    await service.storage.from("ingest-raw").upload(storagePath, bytes, {
      contentType: mime,
      upsert: true,
    });

    tasks.push(
      orchestrateIngest(
        { service, ocrProviders: providers },
        {
          orgId: org.id,
          source: "postmark_inbound",
          idempotencyKey: `${parsed.MessageID}:${idx}`,
          storagePath,
          channelKind: mime === "application/pdf" ? "native_pdf" : "photo",
          bytes,
          mimeType: mime,
        },
      ),
    );
  }

  if (parsed.TextBody.trim().length > 0 && parsed.Attachments.length === 0) {
    const bytes = new TextEncoder().encode(parsed.TextBody);
    tasks.push(
      orchestrateIngest(
        { service, ocrProviders: providers },
        {
          orgId: org.id,
          source: "postmark_inbound",
          idempotencyKey: parsed.MessageID,
          storagePath: null,
          channelKind: "email_body",
          bytes,
          mimeType: "text/plain",
        },
      ),
    );
  }

  const results = await Promise.allSettled(tasks);
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    received: results.length,
    failed,
    message_id: parsed.MessageID,
  });
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
