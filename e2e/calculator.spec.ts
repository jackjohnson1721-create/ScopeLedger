import { expect, test } from "@playwright/test";

test.describe("single-scope calculator", () => {
  test("computes a red flag when spend crosses 60% of replacement cost", async ({ page }) => {
    await page.goto("/calculator");

    await page.getByLabel(/Repair spend last 12 months/i).fill("12000");
    await page.getByLabel(/Replacement cost/i).fill("18000");
    await page.getByRole("button", { name: /^compute$/i }).click();

    // 12000 / 18000 = 0.667 -> red
    await expect(page.getByText(/^red$/i)).toBeVisible();
    await expect(page.getByText(/ratio:\s*66\.7%/i)).toBeVisible();
  });

  test("computes a green flag well below the yellow threshold", async ({ page }) => {
    await page.goto("/calculator");

    await page.getByLabel(/Repair spend last 12 months/i).fill("1000");
    await page.getByLabel(/Replacement cost/i).fill("20000");
    await page.getByRole("button", { name: /^compute$/i }).click();

    await expect(page.getByText(/^green$/i)).toBeVisible();
  });

  test("cohort opt-in checkbox is on by default", async ({ page }) => {
    await page.goto("/calculator");
    await page.getByLabel(/Repair spend last 12 months/i).fill("5000");
    await page.getByLabel(/Replacement cost/i).fill("20000");
    await page.getByRole("button", { name: /^compute$/i }).click();

    const checkbox = page.getByRole("checkbox");
    await expect(checkbox).toBeChecked();
  });
});
