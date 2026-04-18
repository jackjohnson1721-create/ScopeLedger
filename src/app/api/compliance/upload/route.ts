/**
 * POST /api/compliance/upload
 *
 * Authenticated admin upload of a compliance artifact (SIG Lite, BAA,
 * SOC 2 letter, policy attestation). multipart form: file, kind, title,
 * effective_date?, expires_at?
 */

import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseService } from "@/lib/supabase/service";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED_KIND = new Set(["sig_lite", "baa", "soc2_type2", "policy_attestation", "other"]);

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership || !["admin", "platform_super_admin"].includes(membership.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = String(form?.get("kind") ?? "");
  const title = String(form?.get("title") ?? "");
  const effective = form?.get("effective_date") ? String(form.get("effective_date")) : null;
  const expires = form?.get("expires_at") ? String(form.get("expires_at")) : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_size_invalid" }, { status: 400 });
  }
  if (!ALLOWED_KIND.has(kind)) {
    return NextResponse.json({ error: "unknown_kind" }, { status: 400 });
  }
  if (!title || title.length > 200) {
    return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sha = crypto.createHash("sha256").update(bytes).digest("hex");

  const service = supabaseService();
  const storagePath = `compliance/${membership.org_id}/${kind}/${sha}-${safeName(file.name)}`;
  await service.storage.from("compliance").upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });

  const { data, error } = await service
    .from("compliance_document")
    .insert({
      org_id: membership.org_id,
      kind,
      title,
      storage_path: storagePath,
      sha256: sha,
      uploaded_by: user.id,
      effective_date: effective,
      expires_at: expires,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ compliance_document_id: data.id, sha256: sha });
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
}
