"use client";

import { useState } from "react";

export default function UploadForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        const file = data.get("file");
        if (!(file instanceof File) || file.size === 0) {
          setStatus("Choose a file first.");
          return;
        }
        setBusy(true);
        setStatus("Uploading…");
        try {
          const res = await fetch("/api/invoices/upload", { method: "POST", body: data });
          const body = (await res.json()) as { status?: string; error?: string };
          if (!res.ok) {
            setStatus(`Error: ${body.error ?? res.statusText}`);
          } else {
            setStatus(`Done: ${body.status ?? "received"}`);
            form.reset();
          }
        } catch (err) {
          setStatus(`Error: ${(err as Error).message}`);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        type="file"
        name="file"
        accept="application/pdf,image/png,image/jpeg"
        className="text-sm"
        required
      />
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-md bg-cloud-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        {busy ? "Uploading…" : "Upload invoice"}
      </button>
      {status && <p className="text-xs text-cloud-600">{status}</p>}
    </form>
  );
}
