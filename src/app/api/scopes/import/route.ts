/**
 * POST /api/scopes/import
 *
 * CSV upload (multipart form, field "file"). Parses with parseScopeCsv
 * and upserts rows keyed on (org_id, oem_serial_number) or (org_id,
 * asset_tag). Returns per-row errors so the UI can surface them.
 */

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { parseScopeCsv } from "@/lib/scopes/csv";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!membership) return NextResponse.json({ error: "no_org" }, { status: 403 });
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

  const text = await file.text();
  const { rows, errors } = parseScopeCsv(text);

  let inserted = 0;
  const rowErrors: Array<{ line: number; error: string }> = [...errors];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const { error } = await supabase
      .from("scope_identity")
      .upsert(
        { ...row, org_id: membership.org_id },
        {
          onConflict: row.oem_serial_number
            ? "org_id,oem_serial_number"
            : "org_id,asset_tag",
        },
      );
    if (error) {
      rowErrors.push({ line: i + 2, error: error.message });
    } else {
      inserted++;
    }
  }

  return NextResponse.json({ inserted, errors: rowErrors });
}
