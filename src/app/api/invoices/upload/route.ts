/**
 * POST /api/invoices/upload
 *
 * User-uploaded invoice (multipart/form-data, field name "file").
 * Authenticated — the caller's session resolves the org via membership.
 * Caller must have an active membership with the spd_manager, biomed, or
 * admin role (enforced by RLS on repair_event_candidates writes).
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";
import { orchestrateIngest } from "@/lib/ingest/orchestrate";
import { awsTextractProvider } from "@/lib/ocr/textract";
import { azureDocIntelProvider } from "@/lib/ocr/azure";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["application/pdf", "image/png", "image/jpeg"]);

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) {
    return NextResponse.json({ error: "no_org" }, { status: 403 });
  }
  if (!["spd_manager", "biomed", "admin", "platform_super_admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_size_invalid" }, { status: 400 });
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return NextResponse.json({ error: "unsupported_mime" }, { status: 415 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");

  const service = supabaseService();
  const storagePath = `upload/${membership.org_id}/${sha}-${safeName(file.name)}`;
  await service.storage.from("ingest-raw").upload(storagePath, bytes, {
    contentType: file.type,
    upsert: true,
  });

  const providers = [awsTextractProvider(), azureDocIntelProvider()];
  const result = await orchestrateIngest(
    { service, ocrProviders: providers },
    {
      orgId: membership.org_id,
      source: "web_upload",
      idempotencyKey: sha,
      storagePath,
      channelKind: file.type === "application/pdf" ? "native_pdf" : "photo",
      bytes,
      mimeType: file.type,
    },
  );

  return NextResponse.json(result);
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
