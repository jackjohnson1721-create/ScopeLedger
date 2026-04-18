import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function HitlPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: candidates } = await supabase
    .from("repair_event_candidates")
    .select(
      "id, candidate_oem_serial_number, candidate_asset_tag, service_date, cost_cents, currency, description, extraction_confidence, stitching_confidence, matched_scope_id, hitl_status, created_at",
    )
    .eq("hitl_status", "pending")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">Review queue</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cloud-900">HITL</h1>
          <p className="mt-2 max-w-xl text-sm text-cloud-700">
            Candidates below could not be auto-promoted to a repair event. Confirm the scope
            match and data values, then promote or discard.
          </p>
        </header>

        <section className="mt-8 overflow-hidden rounded-2xl border border-cloud-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cloud-50 text-xs uppercase text-cloud-600">
              <tr>
                <th className="px-4 py-2 text-left">Service date</th>
                <th className="px-4 py-2 text-left">Candidate ID</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right">Cost</th>
                <th className="px-4 py-2 text-left">Field conf</th>
                <th className="px-4 py-2 text-left">Stitch conf</th>
              </tr>
            </thead>
            <tbody>
              {(candidates ?? []).map((c) => (
                <tr key={c.id} className="border-t border-cloud-100">
                  <td className="px-4 py-2">{c.service_date ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs">
                    {c.candidate_oem_serial_number ?? c.candidate_asset_tag ?? "—"}
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate">{c.description ?? "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {c.cost_cents ? `${c.currency ?? "USD"} ${(c.cost_cents / 100).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-2">{c.extraction_confidence ?? "—"}</td>
                  <td className="px-4 py-2">
                    {c.matched_scope_id
                      ? `${((c.stitching_confidence ?? 0) * 100).toFixed(0)}%`
                      : "unmatched"}
                  </td>
                </tr>
              ))}
              {(candidates ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-cloud-500">
                    Queue clear.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
