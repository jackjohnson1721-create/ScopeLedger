/**
 * Free single-scope calculator — top-of-funnel lead magnet.
 *
 * Stays purely client-side: data never touches our DB unless the user
 * opts in. Per the softened cohort gate (see docs/decisions.md), the
 * opt-in checkbox is default-ON, but visibly togglable and explained.
 */

import CalculatorForm from "./CalculatorForm";

export const metadata = {
  title: "Rigid endoscope cost calculator · ScopeLedger",
  description:
    "Estimate your 12-month repair-to-replacement ratio and whether a rigid endoscope is due for capital replacement.",
};

export default function CalculatorPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-14">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">Free tool</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-cloud-900">
            Rigid endoscope replacement calculator
          </h1>
          <p className="mt-3 max-w-xl text-sm text-cloud-700">
            Enter last-12-month repair spend and current replacement cost for a single scope.
            We&#39;ll tell you whether the ratio crosses the industry yellow (45%) or red (60%)
            thresholds.
          </p>
        </header>
        <section className="mt-10">
          <CalculatorForm />
        </section>
        <section className="mt-14 text-xs text-cloud-500">
          <p>
            Thresholds are ScopeLedger defaults informed by OEM maintenance literature and common
            SPD-manager practice. Your organization can tune these in the full product.
          </p>
        </section>
      </div>
    </main>
  );
}
