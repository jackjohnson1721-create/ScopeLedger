import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyHmacSha256 } from "./verify";

const secret = "test-secret-key";
const body = JSON.stringify({ event: "ping", at: 1_700_000_000 });

const sign = (payload: string, encoding: "base64" | "hex" = "base64") =>
  crypto.createHmac("sha256", secret).update(payload).digest(encoding);

describe("verifyHmacSha256", () => {
  it("accepts a valid base64 signature", () => {
    expect(verifyHmacSha256({ rawBody: body, signature: sign(body), secret })).toBe(true);
  });

  it("accepts a valid hex signature when explicitly requested", () => {
    expect(
      verifyHmacSha256({
        rawBody: body,
        signature: sign(body, "hex"),
        secret,
        encoding: "hex",
      }),
    ).toBe(true);
  });

  it("rejects a tampered body", () => {
    const sig = sign(body);
    expect(verifyHmacSha256({ rawBody: body + "x", signature: sig, secret })).toBe(false);
  });

  it("rejects a missing signature", () => {
    expect(verifyHmacSha256({ rawBody: body, signature: null, secret })).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const sig = sign(body);
    expect(verifyHmacSha256({ rawBody: body, signature: sig, secret: "other" })).toBe(false);
  });

  it("rejects a length-mismatched signature without throwing", () => {
    expect(verifyHmacSha256({ rawBody: body, signature: "short", secret })).toBe(false);
  });
});
