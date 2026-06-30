/**
 * core-flow.spec.ts — the critical end-to-end flow.
 *
 * What:        Logs in as a seeded user, creates an estimate, adds a line item,
 *              checks the live total, saves, and confirms it persists on reload.
 * Notes:       Hits the live Supabase project; creates a real quote row.
 */
import { test, expect } from "@playwright/test";

test("create, edit, save, and persist an estimate", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sarah", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.getByRole("link", { name: /new estimate/i }).click();
  await expect(page).toHaveURL(/\/quotes\/new$/);
  await page.getByRole("button", { name: /create estimate/i }).click();
  await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]+$/);

  await page.getByRole("button", { name: /add line/i }).click();
  await page.getByPlaceholder("Description").first().fill("Test workshop");
  await page.locator('input[inputmode="decimal"]').first().fill("4000");

  await expect(page.getByTestId("grand-total")).toHaveText("$4,000.00");

  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByTestId("grand-total")).toHaveText("$4,000.00");
});
