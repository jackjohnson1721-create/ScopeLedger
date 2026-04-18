import Link from "next/link";

export const metadata = {
  title: "Editorial independence · ScopeLedger",
};

export default function EditorialIndependencePage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Link href="/" className="text-xs uppercase tracking-[0.18em] text-cloud-600">
          &larr; ScopeLedger
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-cloud-900">
          Editorial-independence charter
        </h1>
        <p className="mt-4 text-sm text-cloud-700">
          ScopeLedger exists to help hospital sterile-processing departments decide when a rigid
          endoscope has crossed the threshold at which repair is no longer rational. The value of
          that signal depends on it being independent.
        </p>

        <h2 className="mt-10 text-lg font-semibold text-cloud-900">Commitments</h2>
        <ul className="mt-4 space-y-3 text-sm text-cloud-800">
          <li>
            <strong>No OEM equity.</strong> No scope manufacturer or OEM-affiliated service
            company holds any equity, convertible note, revenue share, or board seat in
            ScopeLedger. This is a perpetual condition of the company&rsquo;s articles.
          </li>
          <li>
            <strong>No referral fees.</strong> ScopeLedger does not accept commissions, finder&rsquo;s
            fees, or MDF dollars from vendors for routing repair work or influencing
            replacement decisions.
          </li>
          <li>
            <strong>Transparent methodology.</strong> Our threshold algorithm, failure-mode
            taxonomy, and avoided-replacement estimator are published in this repository and
            version-controlled. Customers can audit the exact math behind any figure on their
            capital-request PDFs.
          </li>
          <li>
            <strong>Per-field provenance.</strong> Every dollar in a capital-request PDF is
            traceable to a source document with extraction confidence. If confidence is below
            0.85 on any field, the row is queued for human review before it counts.
          </li>
          <li>
            <strong>Customer-owned data.</strong> Hospitals own their repair ledgers. ScopeLedger
            will not resell de-identified repair data to OEMs or ISOs without explicit written
            opt-in, separate from the product EULA.
          </li>
        </ul>

        <h2 className="mt-10 text-lg font-semibold text-cloud-900">Audits</h2>
        <p className="mt-4 text-sm text-cloud-700">
          Enterprise customers receive an annual independent audit of the threshold engine&rsquo;s
          math against their own ledger, delivered in the same PDF format as the capital request.
          See the{" "}
          <Link href="/legal/privacy" className="underline">
            privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/legal/terms" className="underline">
            terms
          </Link>{" "}
          for contractual particulars.
        </p>
      </div>
    </main>
  );
}
