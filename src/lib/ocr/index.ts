/**
 * OCR adapter. Primary: AWS Textract. Fallback: Azure Document Intelligence.
 * Falls through to the next provider when the primary errors or returns
 * confidence below `minConfidence`.
 *
 * The adapter returns raw page text + per-page confidence; extraction of
 * structured fields is the LLM's job (src/lib/llm/extractor.ts).
 */

export interface OcrPage {
  pageIndex: number;
  text: string;
  confidence: number;
}

export interface OcrResult {
  provider: "aws_textract" | "azure_document_intelligence";
  pages: OcrPage[];
  avgConfidence: number;
}

export interface OcrInput {
  /** Raw bytes of the source document (PDF, PNG, JPG). */
  bytes: Uint8Array;
  /** Mime type hint (image/png | image/jpeg | application/pdf). */
  mimeType: string;
}

export interface OcrProvider {
  name: "aws_textract" | "azure_document_intelligence";
  extract(input: OcrInput): Promise<OcrResult>;
}

export class OcrProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
    public override cause?: unknown,
  ) {
    super(`[${provider}] ${message}`);
  }
}

/**
 * Runs providers in order; returns the first result meeting `minConfidence`,
 * else returns the highest-confidence result seen.
 */
export async function runOcrWithFallback(params: {
  providers: OcrProvider[];
  input: OcrInput;
  minConfidence: number;
}): Promise<OcrResult> {
  const { providers, input, minConfidence } = params;
  const errors: unknown[] = [];
  let best: OcrResult | null = null;

  for (const p of providers) {
    try {
      const res = await p.extract(input);
      if (res.avgConfidence >= minConfidence) return res;
      if (!best || res.avgConfidence > best.avgConfidence) best = res;
    } catch (err) {
      errors.push(err);
    }
  }

  if (best) return best;
  throw new OcrProviderError("all", "all providers failed", errors);
}
