import type { OcrInput, OcrProvider, OcrResult } from "./index";
import { OcrProviderError } from "./index";

/**
 * AWS Textract adapter.
 *
 * Phase 2 scaffold: uses @aws-sdk/client-textract at runtime. The SDK is
 * imported dynamically so the bundle stays small and Vercel edge routes
 * don't pay the cost until an ingestion actually hits Textract. Credentials
 * resolve from the default AWS SDK chain (env vars set in Vercel).
 */
export function awsTextractProvider(opts?: { region?: string }): OcrProvider {
  return {
    name: "aws_textract",
    async extract(input: OcrInput): Promise<OcrResult> {
      try {
        const { TextractClient, AnalyzeDocumentCommand } = await import(
          "@aws-sdk/client-textract"
        );
        const client = new TextractClient({
          region: opts?.region ?? process.env.AWS_REGION ?? "us-east-1",
        });
        const res = await client.send(
          new AnalyzeDocumentCommand({
            Document: { Bytes: input.bytes },
            FeatureTypes: ["FORMS", "TABLES"],
          }),
        );
        const blocks = res.Blocks ?? [];
        const lineBlocks = blocks.filter((b) => b.BlockType === "LINE");
        const text = lineBlocks.map((b) => b.Text ?? "").join("\n");
        const conf = lineBlocks.length
          ? lineBlocks.reduce((a, b) => a + (b.Confidence ?? 0), 0) /
            lineBlocks.length /
            100
          : 0;
        return {
          provider: "aws_textract",
          pages: [{ pageIndex: 0, text, confidence: conf }],
          avgConfidence: conf,
        };
      } catch (err) {
        throw new OcrProviderError("aws_textract", "analyze_document_failed", err);
      }
    },
  };
}
