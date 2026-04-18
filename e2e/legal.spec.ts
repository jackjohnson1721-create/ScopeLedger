import { expect, test } from "@playwright/test";

test.describe("legal surface", () => {
  test("editorial-independence charter lists the five commitments", async ({ page }) => {
    await page.goto("/legal/editorial-independence");
    await expect(
      page.getByRole("heading", { name: /Editorial.independence charter/i }),
    ).toBeVisible();
    await expect(page.getByText(/No OEM equity/i)).toBeVisible();
    await expect(page.getByText(/No referral fees/i)).toBeVisible();
    await expect(page.getByText(/Transparent methodology/i)).toBeVisible();
    await expect(page.getByText(/Per-field provenance/i)).toBeVisible();
    await expect(page.getByText(/Customer-owned data/i)).toBeVisible();
  });
});
