import Link from "next/link";
import { Cloudscape } from "@/components/cloudscape";
import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
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
            Sign in
          </h1>
          <p className="mt-1 text-sm text-cloud-700">
            We'll email you a magic link — no passwords to remember.
          </p>
          <div className="mt-6">
            <SignInForm />
          </div>
          <p className="mt-6 text-sm text-cloud-700">
            Don't have an account?{" "}
            <Link href="/auth/sign-up" className="font-medium text-cloud-800 underline">
              Start free
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
