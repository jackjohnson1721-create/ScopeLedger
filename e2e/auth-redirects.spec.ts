import { expect, test } from "@playwright/test";

/**
 * Protected-route redirect checks. Every (app) route calls
 * supabase.auth.getUser() server-side and redirects unauthenticated callers
 * to /auth/sign-in. Exercising the redirect verifies RLS + auth middleware
 * without needing a seeded tenant.
 */
const protectedRoutes = [
  "/dashboard",
  "/scopes",
  "/hitl",
  "/invoices",
  "/admin",
  "/billing",
  "/compliance",
  "/onboarding",
];

test.describe("auth redirects", () => {
  for (const route of protectedRoutes) {
    test(`unauthenticated ${route} redirects to /auth/sign-in`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL(/\/auth\/sign-in/);
      await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    });
  }

  test("sign-in page renders magic-link form", async ({ page }) => {
    await page.goto("/auth/sign-in");
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
    await expect(page.getByText(/magic link/i)).toBeVisible();
  });
});

test.describe("seeded-tenant flows (pending fixtures)", () => {
  test.skip("admin uploads invoice and sees it in ingest log", () => {
    // TODO Phase 12.1: seed fixture org + magic-link bypass for test@scopeledger
  });

  test.skip("HITL reviewer promotes a candidate to repair_event", () => {
    // TODO Phase 12.1: seed candidate row with stitching_confidence 0.85
  });

  test.skip("CFO generates a capital-request PDF and the sha256 stamps on storage", () => {
    // TODO Phase 12.1: chromium binary + seeded scope with red flag
  });
});
