import Link from "next/link";
import { Cloudscape } from "@/components/cloudscape";
import { SignInForm } from "@/app/auth/sign-in/sign-in-form";

export default function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  return (
    <SignUpInner searchParamsPromise={searchParams} />
  );
}

async function SignUpInner({
  searchParamsPromise,
}: {
  searchParamsPromise: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParamsPromise;
  const heading =
    plan === "pro_light"
      ? "Start Pro Light"
      : plan === "pro_standard"
        ? "Start Pro Standard"
        : "Start free";

  return (
    <main className="relative min-h-screen">
      <div className="absolute inset-0 -z-10">
        <Cloudscape className="h-full w-full" />
      </div>
      <div className="mx-auto flex min-h-screen max-w-md items-center px-6">
        <div className="w-full rounded-2xl border border-cloud-100 bg-white/80 p-8 shadow-sm backdrop-blur">
          <Link href="/" className="text-sm text-cloud-600 hover:text-cloud-900">
            ← ScopeLedger
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-cloud-900">
            {heading}
          </h1>
          <p className="mt-1 text-sm text-cloud-700">
            Enter your work email. We'll send a magic link; after you sign in we'll walk you
            through creating your organization.
          </p>
          <div className="mt-6">
            <SignInForm />
          </div>
        </div>
      </div>
    </main>
  );
}
