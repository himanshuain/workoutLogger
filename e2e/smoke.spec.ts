import { test, expect } from "@playwright/test";

test("auth page loads", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
});

test("plan page redirects unauthenticated users", async ({ page }) => {
  await page.goto("/plan");
  await expect(page).toHaveURL(/auth/);
});

test("food page requires auth @auth", async ({ page }) => {
  test.skip(!process.env.E2E_TEST_EMAIL, "E2E auth credentials not configured");
  await page.goto("/auth");
  await page.getByLabel(/email/i).fill(process.env.E2E_TEST_EMAIL);
  await page.getByLabel(/password/i).fill(process.env.E2E_TEST_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.goto("/food");
  await expect(page.getByText(/food/i).first()).toBeVisible();
});
