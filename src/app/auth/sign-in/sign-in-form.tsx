"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabaseBrowser } from "@/lib/supabase/browser";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export function SignInForm() {
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email }: FormValues) => {
    setErrorMsg(null);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
      return;
    }
    setStatus("sent");
  };

  if (status === "sent") {
    return (
      <div className="rounded-xl border border-cloud-200 bg-cloud-50 p-4 text-sm text-cloud-800">
        Check your email for a sign-in link. You can close this tab.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <label className="block">
        <span className="text-sm font-medium text-cloud-800">Work email</span>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="mt-1 block w-full rounded-lg border border-cloud-200 bg-white px-3 py-2 text-cloud-900 placeholder:text-cloud-400 focus:border-cloud-500"
          placeholder="name@hospital.org"
          {...register("email")}
        />
        {errors.email && (
          <span id="email-error" className="mt-1 block text-sm text-threshold-red">
            {errors.email.message}
          </span>
        )}
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-full bg-cloud-700 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-cloud-800 disabled:opacity-60"
      >
        {isSubmitting ? "Sending…" : "Send magic link"}
      </button>
      {status === "error" && errorMsg && (
        <p className="text-sm text-threshold-red" role="alert">
          {errorMsg}
        </p>
      )}
    </form>
  );
}
