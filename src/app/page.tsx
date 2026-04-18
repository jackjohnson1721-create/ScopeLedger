import Link from "next/link";
import { Cloudscape } from "@/components/cloudscape";
import { Reveal } from "@/components/reveal";

function Compare({ title, differs }: { title: string; differs: string }) {
  return (
    <div className="rounded-2xl border border-cloud-100 bg-white p-5">
      <div className="text-xs uppercase text-cloud-500">Not us:</div>
      <div className="mt-1 font-medium text-cloud-900">{title}</div>
      <p className="mt-3 text-cloud-700">{differs}</p>
    </div>
  );
}

const tiers = [
  {
    name: "Free",
    price: "$0",
    cadence: "one scope",
    blurb: "Single-scope threshold calculator. Contributes anonymized data to the public cohort.",
    cta: { href: "/calculator", label: "Run the calculator" },
    features: ["1 scope", "Rolling-12mo threshold", "Cohort benchmark"],
  },
  {
    name: "Pro Light",
    price: "$349",
    cadence: "per month",
    blurb: "Up to 50 scopes, email-forward ingestion, HITL review queue.",
    cta: { href: "/auth/sign-up?plan=pro_light", label: "Start Pro Light" },
    features: ["50 scopes", "Email ingest", "Capital-request PDF", "≥55% native-PDF gate"],
  },
  {
    name: "Pro Standard",
    price: "$899",
    cadence: "per month",
    blurb: "Unlimited scopes, Zoho CRM/Books sync, full audit trail.",
    cta: { href: "/auth/sign-up?plan=pro_standard", label: "Start Pro Standard" },
    features: ["Unlimited scopes", "Zoho sync", "Threshold tuning", "Clinical dual-signer"],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "annual",
    blurb: "CMMS bi-directional, SIG Lite + BAA, dedicated SLAs.",
    cta: { href: "/contact?tier=enterprise", label: "Request demo" },
    features: ["Nuvolo read/write", "SIG Lite + BAA", "SSO / SAML", "Named support"],
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Hero */}
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10">
          <Cloudscape className="h-full w-full" />
        </div>
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-8">
          <Link href="/" className="font-semibold tracking-tight text-cloud-800">
            ScopeLedger
          </Link>
          <div className="flex items-center gap-6 text-sm text-cloud-700">
            <Link href="/calculator" className="hover:text-cloud-900">
              Calculator
            </Link>
            <Link href="/pricing" className="hover:text-cloud-900">
              Pricing
            </Link>
            <Link href="/docs" className="hover:text-cloud-900">
              Docs
            </Link>
            <Link
              href="/auth/sign-in"
              className="rounded-full border border-cloud-300 bg-white/60 px-4 py-1.5 text-cloud-800 backdrop-blur hover:bg-white"
            >
              Sign in
            </Link>
          </div>
        </nav>

        <div className="mx-auto max-w-4xl px-6 pb-24 pt-24 text-center">
          <Reveal>
            <p className="text-sm uppercase tracking-[0.2em] text-cloud-600">
              Capital-replacement decision support for SPD
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="mt-4 text-5xl font-semibold leading-tight tracking-tight text-cloud-900 md:text-6xl">
              Know when to replace.
            </h1>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-cloud-700">
              ScopeLedger watches your rigid-scope repair spend, flags the moment repairs outpace
              replacement, and hands your CFO a signed capital-request PDF with every number
              traced to a source document.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/calculator"
                className="rounded-full bg-cloud-700 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:-translate-y-px hover:bg-cloud-800"
              >
                Start free — one scope
              </Link>
              <Link
                href="/contact"
                className="rounded-full border border-cloud-300 bg-white/70 px-6 py-3 text-sm font-medium text-cloud-800 backdrop-blur transition hover:bg-white"
              >
                Request a demo
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="grid gap-8 md:grid-cols-3">
          {[
            {
              title: "Cross-OEM, not OEM-aligned",
              body: "Stryker, Olympus, Karl Storz, Richard Wolf — one ledger. No vendor has equity, no vendor writes our methodology.",
            },
            {
              title: "Threshold that fires on its own",
              body: "Rolling 12-month repair spend over replacement cost. Yellow at 45%, red at 60%. Every repair retriggers the flag.",
            },
            {
              title: "A PDF your CFO will sign",
              body: "Eight sections, per-field confidence, provenance for every number, dual-signer when anything is <0.90 confident.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-cloud-100 bg-white/70 p-6 shadow-sm backdrop-blur"
            >
              <h3 className="text-lg font-semibold text-cloud-900">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-cloud-700">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo */}
      <section className="border-y border-cloud-100 bg-cloud-50 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cloud-600">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-cloud-900">
                Forward an invoice. Get a ledger.
              </h2>
              <ol className="mt-8 space-y-5 text-sm text-cloud-800">
                <li className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cloud-900 text-xs text-white">1</span>
                  <span>
                    Forward repair invoices to your org&rsquo;s dedicated mailbox
                    (<code className="rounded bg-white px-1 py-0.5 text-xs">slug@in.scopeledger.io</code>), or upload the PDF.
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cloud-900 text-xs text-white">2</span>
                  <span>
                    Textract + Claude extract line items with per-field confidence. Anything below
                    0.85 queues for human review.
                  </span>
                </li>
                <li className="flex gap-4">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cloud-900 text-xs text-white">3</span>
                  <span>
                    The threshold flag updates instantly per scope. When it hits red, one click
                    renders the 8-section capital-request PDF with dual-signer block.
                  </span>
                </li>
              </ol>
              <div className="mt-8">
                <Link
                  href="/calculator"
                  className="rounded-full bg-cloud-900 px-5 py-2.5 text-sm text-white hover:bg-cloud-800"
                >
                  Try it on one scope, free
                </Link>
              </div>
            </div>
            <div className="rounded-3xl border border-cloud-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between text-xs text-cloud-500">
                <span>Scope SN-42 · Stryker 1588 AIM</span>
                <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800">red</span>
              </div>
              <div className="mt-4 font-semibold text-cloud-900 text-2xl">
                $18,400 <span className="text-sm font-normal text-cloud-500">12-mo spend</span>
              </div>
              <div className="mt-1 text-sm text-cloud-700">
                61% of $30,000 replacement cost · threshold crossed 2025-03-12
              </div>
              <hr className="my-4 border-cloud-100" />
              <ul className="text-xs text-cloud-700 space-y-1">
                <li>2025-03-01 · Stryker Service · distal tip bent · $4,800</li>
                <li>2024-12-19 · ISO Repair Co. · fiber broken · $3,200</li>
                <li>2024-09-05 · Stryker Service · lens fogged · $5,100</li>
                <li>2024-07-22 · ISO Repair Co. · sheath dented · $5,300</li>
              </ul>
              <hr className="my-4 border-cloud-100" />
              <div className="text-xs text-cloud-500">Handling-audit flag: <span className="font-medium text-cloud-900">YES</span> &middot; 3 handling-mode events in 180 days</div>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive positioning */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <p className="text-xs uppercase tracking-[0.2em] text-cloud-600">How we differ</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-cloud-900">
          Independent by design
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-3 text-sm">
          <Compare title="OEM service portals" differs="One vendor per portal. No cross-fleet rollup. Reports tuned to the OEM&rsquo;s upsell narrative." />
          <Compare title="Generic CMMS (SPM, Nuvolo, Censitrac)" differs="Work orders, not capital decisions. No rolling-12mo threshold. No CFO-ready PDF." />
          <Compare title="Spreadsheets" differs="Invisible to audit. No HITL quality control. No line-of-sight to replacement-ratio crossing." />
        </div>
        <div className="mt-8 text-sm text-cloud-700">
          <Link href="/legal/editorial-independence" className="underline hover:text-cloud-900">
            Read our editorial-independence charter &rarr;
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-3xl font-semibold tracking-tight text-cloud-900">Pricing</h2>
        <p className="mt-2 max-w-2xl text-cloud-700">
          Start free. Upgrade when you need fleet coverage, ingest, or CFO-ready PDFs.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="flex flex-col rounded-2xl border border-cloud-100 bg-white/80 p-6 shadow-sm"
            >
              <h3 className="text-sm font-medium uppercase tracking-wide text-cloud-600">
                {tier.name}
              </h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-cloud-900">{tier.price}</span>
                <span className="text-sm text-cloud-600">/ {tier.cadence}</span>
              </div>
              <p className="mt-3 text-sm text-cloud-700">{tier.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm text-cloud-800">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <span aria-hidden className="mt-1 h-1.5 w-1.5 rounded-full bg-cloud-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={tier.cta.href}
                className="mt-6 inline-flex justify-center rounded-full border border-cloud-300 bg-white px-4 py-2 text-sm font-medium text-cloud-800 transition hover:bg-cloud-100"
              >
                {tier.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-cloud-100 bg-white/60 py-10 text-sm text-cloud-700">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} ScopeLedger</p>
          <div className="flex gap-5">
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/editorial-independence">Editorial independence</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
