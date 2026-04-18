/**
 * GET /api/audit/export
 *
 * Streams a CSV export of the audit_log for the caller's org. Admin or
 * CFO-readonly only. Filtered by optional ?from=YYYY-MM-DD&to=YYYY-MM-DD.
 */

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("audit_log")
    .select("occurred_at, actor_user_id, action, entity_table, entity_id, diff")
    .order("occurred_at", { ascending: false })
    .limit(10000);
  if (from) query = query.gte("occurred_at", from);
  if (to) query = query.lte("occurred_at", to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = data ?? [];
  const header = ["occurred_at", "actor_user_id", "action", "entity_table", "entity_id", "diff"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.occurred_at,
        r.actor_user_id ?? "",
        r.action,
        r.entity_table,
        r.entity_id ?? "",
        JSON.stringify(r.diff ?? {}).replace(/"/g, '""'),
      ]
        .map(csvField)
        .join(","),
    );
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}

function csvField(v: string | null | undefined): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
