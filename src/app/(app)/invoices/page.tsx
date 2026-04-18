import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import UploadForm from "./UploadForm";

export default async function InvoicesPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/sign-in");

  const { data: audit } = await supabase
    .from("ingestion_audit")
    .select(
      "id, source, storage_path, received_at, status, channel_kind, ocr_provider, ocr_confidence, extraction_confidence",
    )
    .order("received_at", { ascending: false })
    .limit(50);

  return (
    <main className="min-h-screen bg-cloud-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <header>
          <p className="text-xs uppercase tracking-[0.18em] text-cloud-600">Invoices</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-cloud-900">
            Ingestion log
          </h1>
        </header>

        <section className="mt-8 rounded-2xl border border-cloud-100 bg-white p-6">
          <h2 className="text-sm font-medium text-cloud-900">Upload an invoice</h2>
          <p className="mt-1 text-xs text-cloud-600">
            PDF, PNG, or JPEG. Up to 25MB. Forward emails to your org mailbox for automatic
            ingestion.
          </p>
          <div className="mt-4">
            <UploadForm />
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-cloud-100 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-cloud-50 text-xs uppercase text-cloud-600">
              <tr>
                <th className="px-4 py-2 text-left">Received</th>
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">OCR</th>
                <th className="px-4 py-2 text-left">Channel</th>
              </tr>
            </thead>
            <tbody>
              {(audit ?? []).map((a) => (
                <tr key={a.id} className="border-t border-cloud-100">
                  <td className="px-4 py-2">{new Date(a.received_at).toLocaleString()}</td>
                  <td className="px-4 py-2">{a.source}</td>
                  <td className="px-4 py-2">{a.status}</td>
                  <td className="px-4 py-2">
                    {a.ocr_provider ?? "—"}
                    {a.ocr_confidence ? ` · ${(a.ocr_confidence * 100).toFixed(0)}%` : ""}
                  </td>
                  <td className="px-4 py-2">{a.channel_kind ?? "—"}</td>
                </tr>
              ))}
              {(audit ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-cloud-500">
                    No ingestion activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
