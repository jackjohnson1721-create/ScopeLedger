import Link from "next/link";
import { Cloudscape } from "@/components/cloudscape";
import { Reveal } from "@/components/reveal";

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
