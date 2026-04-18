import type { OcrInput, OcrProvider, OcrResult } from "./index";
import { OcrProviderError } from "./index";

/**
 * Azure Document Intelligence (formerly Form Recognizer) fallback.
 * Phase 2 scaffold — uses REST API via fetch so we don't add another
 * SDK to the bundle. Endpoint + key come from env.
 *
 * Docs: https://learn.microsoft.com/azure/ai-services/document-intelligence
 */
export function azureDocIntelProvider(opts?: {
  endpoint?: string;
  key?: string;
}): OcrProvider {
  return {
    name: "azure_document_intelligence",
    async extract(input: OcrInput): Promise<OcrResult> {
      const endpoint = opts?.endpoint ?? process.env.AZURE_DOC_INTELLIGENCE_ENDPOINT;
      const key = opts?.key ?? process.env.AZURE_DOC_INTELLIGENCE_KEY;
      if (!endpoint || !key) {
        throw new OcrProviderError("azure_document_intelligence", "missing_credentials");
      }
      try {
        const analyzeUrl = `${endpoint.replace(/\/$/, "")}/formrecognizer/documentModels/prebuilt-invoice:analyze?api-version=2023-07-31`;
        const submit = await fetch(analyzeUrl, {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": key,
            "Content-Type": input.mimeType,
          },
          body: new Blob([new Uint8Array(input.bytes)], { type: input.mimeType }),
        });
        if (submit.status !== 202) {
          throw new OcrProviderError(
            "azure_document_intelligence",
            `submit_failed_${submit.status}`,
          );
        }
        const opUrl = submit.headers.get("operation-location");
        if (!opUrl) {
          throw new OcrProviderError(
            "azure_document_intelligence",
            "missing_operation_location",
          );
        }

        for (let attempt = 0; attempt < 20; attempt++) {
          await new Promise((r) => setTimeout(r, 1000));
          const poll = await fetch(opUrl, {
            headers: { "Ocp-Apim-Subscription-Key": key },
          });
          const body = (await poll.json()) as {
            status: string;
            analyzeResult?: {
              pages?: Array<{
                pageNumber: number;
                words?: Array<{ content: string; confidence: number }>;
              }>;
            };
          };
          if (body.status === "succeeded") {
            const pages = (body.analyzeResult?.pages ?? []).map((p) => {
              const words = p.words ?? [];
              const text = words.map((w) => w.content).join(" ");
              const conf = words.length
                ? words.reduce((a, b) => a + b.confidence, 0) / words.length
                : 0;
              return { pageIndex: p.pageNumber - 1, text, confidence: conf };
            });
            const avg = pages.length
              ? pages.reduce((a, b) => a + b.confidence, 0) / pages.length
              : 0;
            return {
              provider: "azure_document_intelligence",
              pages,
              avgConfidence: avg,
            };
          }
          if (body.status === "failed") {
            throw new OcrProviderError("azure_document_intelligence", "analyze_failed");
          }
        }
        throw new OcrProviderError("azure_document_intelligence", "poll_timeout");
      } catch (err) {
        if (err instanceof OcrProviderError) throw err;
        throw new OcrProviderError("azure_document_intelligence", "unexpected", err);
      }
    },
  };
}
