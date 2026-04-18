import { beforeEach, describe, expect, it } from "vitest";
import { clientKey, consume, resetAllBuckets } from "./rate-limit";

describe("sliding-window rate limiter", () => {
  beforeEach(() => {
    resetAllBuckets();
  });

  it("permits up to the limit then rejects", () => {
    const cfg = { limit: 3, intervalMs: 60_000 };
    const t0 = 1_000_000;

    expect(consume("k", cfg, t0).allowed).toBe(true);
    expect(consume("k", cfg, t0 + 10).allowed).toBe(true);
    expect(consume("k", cfg, t0 + 20).allowed).toBe(true);
    const denied = consume("k", cfg, t0 + 30);
    expect(denied.allowed).toBe(false);
    expect(denied.remaining).toBe(0);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it("drops expired entries past the window edge", () => {
    const cfg = { limit: 2, intervalMs: 1_000 };
    const t0 = 2_000_000;

    consume("k", cfg, t0);
    consume("k", cfg, t0 + 100);
    expect(consume("k", cfg, t0 + 500).allowed).toBe(false);

    // Advance past the 1s window — the first two hits expire.
    const after = consume("k", cfg, t0 + 1_200);
    expect(after.allowed).toBe(true);
  });

  it("isolates buckets per key", () => {
    const cfg = { limit: 1, intervalMs: 60_000 };
    const t0 = 3_000_000;

    expect(consume("alice", cfg, t0).allowed).toBe(true);
    expect(consume("bob", cfg, t0).allowed).toBe(true);
    expect(consume("alice", cfg, t0 + 10).allowed).toBe(false);
  });

  it("retryAfterMs reflects time until the oldest hit ages out", () => {
    const cfg = { limit: 1, intervalMs: 10_000 };
    const t0 = 4_000_000;

    consume("k", cfg, t0);
    const denied = consume("k", cfg, t0 + 3_000);
    expect(denied.retryAfterMs).toBe(7_000);
  });

  it("clientKey prefers the first XFF entry", () => {
    const req = new Request("http://localhost/x", {
      headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
    });
    expect(clientKey(req, "lead")).toBe("lead:203.0.113.7");
  });

  it("clientKey falls back through XRI to a shared anon bucket", () => {
    const req1 = new Request("http://localhost/x", {
      headers: { "x-real-ip": "198.51.100.9" },
    });
    expect(clientKey(req1, "lead")).toBe("lead:198.51.100.9");

    const req2 = new Request("http://localhost/x");
    expect(clientKey(req2, "lead")).toBe("lead:anon");
  });
});
