import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("status", "active");

  const membership = memberships?.[0];
  const { data: org } = membership
    ? await supabase
        .from("organizations")
        .select("name, slug, plan")
        .eq("id", membership.org_id)
        .maybeSingle()
    : { data: null };

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">Dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cloud-900">
              Welcome back
            </h1>
          </div>
          <p className="text-sm text-cloud-700">{user.email}</p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat label="Scopes" value="—" hint="Phase 5" />
          <Stat label="Rolling 12mo spend" value="—" hint="Phase 3" />
          <Stat label="Flagged scopes" value="—" hint="Phase 3" />
        </section>

        <section className="mt-10 rounded-2xl border border-cloud-100 bg-white/80 p-6">
          <h2 className="text-sm font-medium uppercase tracking-wide text-cloud-600">
            Phase 1 foundation
          </h2>
          <p className="mt-2 text-sm text-cloud-700">
            You're signed in and your organization is provisioned. Ingestion, threshold engine,
            PDF generation, and Zoho sync arrive in Phases 2–8.
          </p>
          {org && membership && (
            <p className="mt-4 text-sm text-cloud-700">
              Organization:{" "}
              <span className="font-medium text-cloud-900">{org.name}</span>{" "}
              <span className="text-cloud-500">
                · {membership.role} · {org.plan}
              </span>
            </p>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-cloud-100 bg-white/80 p-5">
      <p className="text-xs uppercase tracking-wide text-cloud-600">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-cloud-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-cloud-500">{hint}</p>}
    </div>
  );
}
