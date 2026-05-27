import { expect, test } from "@playwright/test";

test.describe("Smoke tests", () => {
  test("app loads without crashing", async ({ page }) => {
    await page.goto("/");
    // App should render something — at minimum the root container
    await expect(page.locator("#root")).toBeVisible();
  });

  test("login page renders when not authenticated", async ({ page }) => {
    await page.goto("/");
    // Without auth, app should show login or redirect to login
    // Check for either the login form or the brand mark
    const hasLoginOrBrand = await page
      .locator('text="Rheo"')
      .or(page.locator('input[type="email"]'))
      .or(page.locator('text="Σύνδεση"'))
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasLoginOrBrand).toBeTruthy();
  });
});

test.describe("Mobile viewport", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("app renders on mobile viewport", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });
});
