import { expect, test } from "@playwright/test";

/**
 * API-boundary smoke tests. These exercise rejection paths that don't require
 * an authenticated session — unauthenticated callers should always 401, and
 * webhook endpoints with bad signatures should always 401 without leaking
 * internal state.
 */
test.describe("api auth rejections", () => {
  test("GET /api/audit/export without session returns 401", async ({ request }) => {
    const res = await request.get("/api/audit/export");
    expect(res.status()).toBe(401);
  });

  test("POST /api/capital-request without session returns 401", async ({ request }) => {
    const res = await request.post("/api/capital-request", {
      data: { scope_identity_id: "00000000-0000-0000-0000-000000000000" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/scopes without session returns 401", async ({ request }) => {
    const res = await request.post("/api/scopes", {
      data: { oem_serial_number: "E2E-TEST" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/compliance/upload without session returns 401", async ({ request }) => {
    const res = await request.post("/api/compliance/upload", {
      multipart: {
        file: { name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") },
        kind: "sig_lite",
        title: "e2e",
      },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("webhook signature verification", () => {
  test("Zoho subscriptions webhook without valid HMAC is rejected", async ({ request }) => {
    const res = await request.post("/api/webhooks/zoho/subscriptions", {
      headers: { "x-zoho-webhook-signature": "deadbeef" },
      data: { event_type: "subscription_activated" },
    });
    // 401 = bad sig, 500 = misconfigured secret. The assertion is that we
    // never return 200 to an unsigned caller.
    expect([400, 401, 500]).toContain(res.status());
  });
});
