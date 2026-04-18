/**
 * Lazy-loaded Anthropic client. Keeps the SDK out of edge bundles and
 * lets us swap transport in tests. Uses Sonnet 4.6 for both extraction
 * and classification (user directive: classifier on Sonnet, not Haiku).
 */
import type { Anthropic } from "@anthropic-ai/sdk";

export const MODELS = {
  extractor: "claude-sonnet-4-6",
  classifier: "claude-sonnet-4-6",
} as const;

let cached: Anthropic | null = null;

export async function anthropicClient(): Promise<Anthropic> {
  if (cached) return cached;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY missing");
  const { default: AnthropicCtor } = await import("@anthropic-ai/sdk");
  cached = new AnthropicCtor({ apiKey: key });
  return cached;
}
