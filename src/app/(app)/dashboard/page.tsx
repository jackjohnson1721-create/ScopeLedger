import { redirect } from "next/navigation";
import Link from "next/link";
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
  if (!membership) redirect("/onboarding");

  const [{ data: org }, { count: scopeCount }, { data: metricsRows }, { count: hitlCount }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("name, slug, plan")
        .eq("id", membership.org_id)
        .maybeSingle(),
      supabase
        .from("scope_identity")
        .select("*", { count: "exact", head: true })
        .eq("org_id", membership.org_id),
      supabase
        .from("derived_metrics")
        .select("threshold_flag, rolling_12mo_spend_cents")
        .eq("org_id", membership.org_id),
      supabase
        .from("repair_event_candidates")
        .select("*", { count: "exact", head: true })
        .eq("org_id", membership.org_id)
        .eq("hitl_status", "pending"),
    ]);

  const totalSpendCents = (metricsRows ?? []).reduce(
    (a, r) => a + Number(r.rolling_12mo_spend_cents ?? 0),
    0,
  );
  const flaggedCount = (metricsRows ?? []).filter(
    (r) => r.threshold_flag === "yellow" || r.threshold_flag === "red",
  ).length;

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">Dashboard</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cloud-900">
              {org?.name ?? "Welcome"}
            </h1>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/scopes" className="text-cloud-700 hover:text-cloud-900">Scopes</Link>
            <Link href="/invoices" className="text-cloud-700 hover:text-cloud-900">Invoices</Link>
            <Link href="/hitl" className="text-cloud-700 hover:text-cloud-900">HITL</Link>
            <Link href="/admin" className="text-cloud-700 hover:text-cloud-900">Admin</Link>
            <span className="text-cloud-500">{user.email}</span>
          </nav>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat label="Scopes" value={String(scopeCount ?? 0)} />
          <Stat
            label="Rolling 12mo spend"
            value={`$${(totalSpendCents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`}
          />
          <Stat
            label="Flagged scopes"
            value={String(flaggedCount)}
            hint={hitlCount ? `${hitlCount} awaiting HITL` : undefined}
          />
        </section>

        {org && membership && (
          <p className="mt-6 text-sm text-cloud-500">
            {membership.role} · plan: {org.plan}
          </p>
        )}
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
