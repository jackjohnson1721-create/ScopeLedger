"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1, "Required").max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9-]{3,40}$/, "Lowercase letters, numbers, hyphens; 3–40 chars")
    .transform((s) => s.toLowerCase()),
});

type FormValues = z.infer<typeof schema>;

export function OnboardingForm() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const slug = watch("slug") || "your-org";

  const onSubmit = async (values: FormValues) => {
    setErrorMsg(null);
    const res = await fetch("/api/onboarding/org", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErrorMsg(body.error ?? "Failed to create organization");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <label className="block">
        <span className="text-sm font-medium text-cloud-800">Organization name</span>
        <input
          className="mt-1 block w-full rounded-lg border border-cloud-200 bg-white px-3 py-2"
          placeholder="Midtown Regional Hospital"
          {...register("name")}
        />
        {errors.name && (
          <span className="mt-1 block text-sm text-threshold-red">{errors.name.message}</span>
        )}
      </label>
      <label className="block">
        <span className="text-sm font-medium text-cloud-800">URL slug</span>
        <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-cloud-200 bg-white">
          <span className="flex items-center bg-cloud-50 px-3 text-sm text-cloud-600">
            scopeledger.io/
          </span>
          <input
            className="w-full border-0 px-3 py-2"
            placeholder="midtown-regional"
            {...register("slug")}
          />
        </div>
        <p className="mt-1 text-xs text-cloud-600">
          Your inbound email will be{" "}
          <code className="font-mono text-cloud-800">{slug}@in.scopeledger.io</code>.
        </p>
        {errors.slug && (
          <span className="mt-1 block text-sm text-threshold-red">{errors.slug.message}</span>
        )}
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-cloud-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cloud-800 disabled:opacity-60"
      >
        {isSubmitting ? "Creating…" : "Create organization"}
      </button>
      {errorMsg && (
        <p className="text-sm text-threshold-red" role="alert">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
