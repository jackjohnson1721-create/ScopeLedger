import crypto from "node:crypto";

/**
 * Constant-time HMAC-SHA256 verification for inbound webhooks. Used for
 * Postmark, Zoho CRM, Zoho Books, Zoho Payments. Rejects on mismatch;
 * callers must return 401 before any side effect.
 */
export function verifyHmacSha256(params: {
  rawBody: string;
  signature: string | null;
  secret: string;
  encoding?: "base64" | "hex";
}): boolean {
  const { rawBody, signature, secret, encoding = "base64" } = params;
  if (!signature) return false;
  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest(encoding);
  try {
    const a = Buffer.from(digest);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
