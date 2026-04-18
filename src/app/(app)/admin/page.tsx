import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AdminPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: memberships } = await supabase
    .from("memberships")
    .select(
      "id, user_id, org_id, role, status, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, plan, threshold_yellow_pct, threshold_red_pct");

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cloud-900">
            Organization settings
          </h1>
        </header>

        <section className="mt-8 rounded-2xl border border-cloud-100 bg-white p-6">
          <h2 className="text-sm font-medium text-cloud-900">Organizations</h2>
          <ul className="mt-3 divide-y divide-cloud-100 text-sm">
            {(orgs ?? []).map((o) => (
              <li key={o.id} className="py-3">
                <div className="font-medium text-cloud-900">{o.name}</div>
                <div className="text-xs text-cloud-500">
                  slug: {o.slug} · plan: {o.plan} · thresholds: {o.threshold_yellow_pct} /{" "}
                  {o.threshold_red_pct}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-2xl border border-cloud-100 bg-white p-6">
          <h2 className="text-sm font-medium text-cloud-900">Members</h2>
          <table className="mt-3 w-full text-sm">
            <thead className="text-xs uppercase text-cloud-600">
              <tr>
                <th className="py-2 text-left">User</th>
                <th className="py-2 text-left">Role</th>
                <th className="py-2 text-left">Status</th>
                <th className="py-2 text-left">Since</th>
              </tr>
            </thead>
            <tbody>
              {(memberships ?? []).map((m) => (
                <tr key={m.id} className="border-t border-cloud-100">
                  <td className="py-2 font-mono text-xs">{m.user_id.slice(0, 8)}</td>
                  <td className="py-2">{m.role}</td>
                  <td className="py-2">{m.status}</td>
                  <td className="py-2 text-xs text-cloud-500">
                    {new Date(m.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
