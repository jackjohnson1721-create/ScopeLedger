import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function BillingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: billing } = await supabase
    .from("billing")
    .select("org_id, plan, status, channel_mix_native_pdf_pct, channel_mix_gate_met, next_renewal_at, synced_at")
    .maybeSingle();

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">Billing</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cloud-900">
            Subscription
          </h1>
        </header>

        <section className="mt-8 rounded-2xl border border-cloud-100 bg-white p-6">
          {!billing ? (
            <p className="text-sm text-cloud-700">
              Your plan mirror will appear here after Zoho Subscriptions sync (Phase 7).
            </p>
          ) : (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-cloud-600">Plan</dt>
              <dd>{billing.plan}</dd>
              <dt className="text-cloud-600">Status</dt>
              <dd>{billing.status}</dd>
              <dt className="text-cloud-600">Native-PDF channel mix</dt>
              <dd>
                {billing.channel_mix_native_pdf_pct !== null
                  ? `${(Number(billing.channel_mix_native_pdf_pct) * 100).toFixed(1)}%`
                  : "—"}
              </dd>
              <dt className="text-cloud-600">Channel-mix gate</dt>
              <dd>{billing.channel_mix_gate_met ? "met" : "not met"}</dd>
              <dt className="text-cloud-600">Next renewal</dt>
              <dd>
                {billing.next_renewal_at
                  ? new Date(billing.next_renewal_at).toLocaleDateString()
                  : "—"}
              </dd>
              <dt className="text-cloud-600">Last synced</dt>
              <dd className="text-xs text-cloud-500">
                {new Date(billing.synced_at).toLocaleString()}
              </dd>
            </dl>
          )}
        </section>
      </div>
    </main>
  );
}
