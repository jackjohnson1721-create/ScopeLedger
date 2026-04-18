import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders hero, tiers, and charter link", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: /ScopeLedger/i }).first()).toBeVisible();

    await expect(page.getByText("Pro Light")).toBeVisible();
    await expect(page.getByText("Pro Standard")).toBeVisible();
    await expect(page.getByText("Enterprise")).toBeVisible();

    await expect(
      page.getByRole("link", { name: /editorial.independence/i }).first(),
    ).toBeVisible();
  });

  test("calculator tier links to /calculator", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /run the calculator/i }).first();
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", "/calculator");
  });
});
