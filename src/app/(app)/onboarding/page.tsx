import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: existing } = await supabase
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1);

  if (existing && existing.length > 0) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-cloud-900">
          Create your organization
        </h1>
        <p className="mt-2 text-sm text-cloud-700">
          One organization per hospital or IDN. You can invite teammates right after.
        </p>
        <div className="mt-8">
          <OnboardingForm />
        </div>
      </div>
    </main>
  );
}
