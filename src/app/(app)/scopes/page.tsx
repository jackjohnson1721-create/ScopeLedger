import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function ScopesPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: scopes } = await supabase
    .from("scope_identity")
    .select(
      "id, oem_serial_number, asset_tag, oem, model_name, status, replacement_cost_cents",
    )
    .order("created_at", { ascending: false });

  const { data: metrics } = await supabase
    .from("derived_metrics")
    .select(
      "scope_id, threshold_flag, threshold_ratio, rolling_12mo_spend_cents",
    );

  const metricsByScope = new Map(
    (metrics ?? []).map((m) => [m.scope_id, m] as const),
  );

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">Scope registry</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cloud-900">
              Scopes
            </h1>
          </div>
          <div className="flex gap-3">
            <Link
              href="/scopes/import"
              className="rounded-md border border-cloud-200 bg-white px-3 py-1.5 text-sm text-cloud-800 hover:bg-cloud-50"
            >
              Import CSV
            </Link>
            <Link
              href="/scopes/new"
              className="rounded-md bg-cloud-900 px-3 py-1.5 text-sm text-white hover:bg-cloud-800"
            >
              New scope
            </Link>
          </div>
        </header>

        <section className="mt-8 overflow-hidden rounded-2xl border border-cloud-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cloud-50 text-xs uppercase text-cloud-600">
              <tr>
                <th className="px-4 py-2 text-left">Serial / Tag</th>
                <th className="px-4 py-2 text-left">OEM / Model</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Flag</th>
                <th className="px-4 py-2 text-right">12mo spend</th>
                <th className="px-4 py-2 text-right">Replacement</th>
              </tr>
            </thead>
            <tbody>
              {(scopes ?? []).map((s) => {
                const m = metricsByScope.get(s.id);
                return (
                  <tr key={s.id} className="border-t border-cloud-100">
                    <td className="px-4 py-2 font-mono text-xs">
                      {s.oem_serial_number ?? s.asset_tag ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      {s.oem} {s.model_name ? `· ${s.model_name}` : ""}
                    </td>
                    <td className="px-4 py-2">{s.status}</td>
                    <td className="px-4 py-2">
                      <FlagPill flag={m?.threshold_flag ?? "insufficient_data"} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      {m ? `$${((m.rolling_12mo_spend_cents ?? 0) / 100).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {s.replacement_cost_cents
                        ? `$${(s.replacement_cost_cents / 100).toLocaleString()}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {(scopes ?? []).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-cloud-500">
                    No scopes yet. Import a CSV or add one manually.
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

function FlagPill({ flag }: { flag: string }) {
  const cls: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800",
    yellow: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    insufficient_data: "bg-cloud-100 text-cloud-600",
  };
  return (
    <span className={`rounded px-2 py-0.5 text-xs ${cls[flag] ?? cls.insufficient_data}`}>
      {flag}
    </span>
  );
}
