"use client";

import { useState } from "react";
import { computeThreshold } from "@/lib/metrics/threshold";

export default function CalculatorForm() {
  const [spend, setSpend] = useState("");
  const [replacement, setReplacement] = useState("");
  const [email, setEmail] = useState("");
  const [cohortOptIn, setCohortOptIn] = useState(true);
  const [result, setResult] = useState<ReturnType<typeof computeThreshold> | null>(null);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const onCompute = (e: React.FormEvent) => {
    e.preventDefault();
    const spendCents = Math.round(Number(spend) * 100);
    const replaceCents = Math.round(Number(replacement) * 100);
    if (!Number.isFinite(spendCents) || !Number.isFinite(replaceCents)) {
      setResult(null);
      return;
    }
    setResult(
      computeThreshold({
        rolling12MoSpendCents: spendCents,
        replacementCostCents: replaceCents,
        yellowPct: 0.45,
        redPct: 0.6,
      }),
    );
  };

  const onSubmitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !result) return;
    setSubmitStatus("Submitting…");
    try {
      const res = await fetch("/api/calculator/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          spend_cents: Math.round(Number(spend) * 100),
          replacement_cents: Math.round(Number(replacement) * 100),
          result_flag: result.flag,
          result_ratio: result.ratio,
          cohort_opt_in: cohortOptIn,
        }),
      });
      if (!res.ok) {
        setSubmitStatus(`Error: ${res.statusText}`);
      } else {
        setSubmitStatus("Sent! We'll be in touch.");
      }
    } catch (err) {
      setSubmitStatus(`Error: ${(err as Error).message}`);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={onCompute} className="space-y-4 rounded-2xl border border-cloud-100 bg-white p-6">
        <label className="block text-sm">
          <span className="text-cloud-700">Repair spend last 12 months (USD)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={spend}
            onChange={(e) => setSpend(e.target.value)}
            className="mt-1 w-full rounded-md border border-cloud-200 px-3 py-1.5 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-cloud-700">Replacement cost (USD)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            className="mt-1 w-full rounded-md border border-cloud-200 px-3 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-cloud-900 px-4 py-2 text-sm text-white hover:bg-cloud-800"
        >
          Compute
        </button>
      </form>

      {result && (
        <div className="rounded-2xl border border-cloud-100 bg-cloud-50 p-6">
          <p className="text-xs uppercase text-cloud-600">Result</p>
          <p className="mt-2 text-2xl font-semibold text-cloud-900">
            {result.flag.replace("_", " ")}
          </p>
          {result.ratio !== null && (
            <p className="mt-1 text-sm text-cloud-700">
              Ratio: {(result.ratio * 100).toFixed(1)}% of replacement cost
            </p>
          )}
          <hr className="my-6 border-cloud-200" />

          <form onSubmit={onSubmitLead} className="space-y-3">
            <p className="text-sm text-cloud-700">Want the full report in your inbox?</p>
            <label className="block text-sm">
              <span className="text-cloud-700">Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-cloud-200 px-3 py-1.5 text-sm"
              />
            </label>
            <label className="flex items-start gap-2 text-xs text-cloud-600">
              <input
                type="checkbox"
                checked={cohortOptIn}
                onChange={(e) => setCohortOptIn(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                Include my anonymized figure (spend + ratio, no org name or email) in the
                ScopeLedger industry benchmark cohort. You can uncheck this and still receive
                the report.
              </span>
            </label>
            <button
              type="submit"
              className="rounded-md bg-cloud-900 px-4 py-2 text-sm text-white hover:bg-cloud-800"
            >
              Email me the report
            </button>
            {submitStatus && <p className="text-xs text-cloud-600">{submitStatus}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
