import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function CompliancePage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: docs } = await supabase
    .from("compliance_document")
    .select("id, kind, title, sha256, effective_date, expires_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">
            Enterprise compliance
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cloud-900">
            Compliance vault
          </h1>
          <p className="mt-2 max-w-xl text-sm text-cloud-700">
            Signed SIG Lite, BAA, SOC 2 letters, and policy attestations. Files are stored
            immutably with sha256 verification. Audit-log export is available in the menu below.
          </p>
        </header>

        <section className="mt-8 flex flex-wrap gap-3 text-sm">
          <a
            href="/api/audit/export"
            className="rounded-md border border-cloud-200 bg-white px-3 py-1.5 text-cloud-800 hover:bg-cloud-50"
          >
            Export audit log (CSV)
          </a>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-cloud-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cloud-50 text-xs uppercase text-cloud-600">
              <tr>
                <th className="px-4 py-2 text-left">Kind</th>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Effective</th>
                <th className="px-4 py-2 text-left">Expires</th>
                <th className="px-4 py-2 text-left">sha256</th>
              </tr>
            </thead>
            <tbody>
              {(docs ?? []).map((d) => (
                <tr key={d.id} className="border-t border-cloud-100">
                  <td className="px-4 py-2">{d.kind}</td>
                  <td className="px-4 py-2">{d.title}</td>
                  <td className="px-4 py-2 text-xs">{d.effective_date ?? "—"}</td>
                  <td className="px-4 py-2 text-xs">{d.expires_at ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-cloud-500">
                    {d.sha256.slice(0, 16)}…
                  </td>
                </tr>
              ))}
              {(docs ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-cloud-500">
                    No documents uploaded yet.
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
