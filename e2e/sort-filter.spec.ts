/**
 * sort-filter.spec.ts — sorting and filtering the quotes list.
 *
 * What:        Logs in, sorts the Total column, and applies a status filter,
 *              asserting the URL params update and the table still renders.
 * Notes:       Hits the live Supabase project + seeded demo users (like
 *              core-flow.spec.ts). Assumes at least one seeded quote exists.
 */
import { test, expect } from "@playwright/test";

test("sort and filter the quotes list via the URL", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sarah", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.goto("/quotes");
  await expect(page.getByRole("table")).toBeVisible();

  // Sort by Total — clicking the header sets ?sort=total_cents&dir=desc.
  await page.getByRole("link", { name: /Sort by Total/i }).click();
  await expect(page).toHaveURL(/sort=total_cents/);
  await expect(page).toHaveURL(/dir=desc/);
  await expect(page.getByRole("table")).toBeVisible();

  // Clicking again flips the direction.
  await page.getByRole("link", { name: /Sort by Total/i }).click();
  await expect(page).toHaveURL(/dir=asc/);

  // Filter by status — pick "Sent".
  await page.getByRole("combobox", { name: /All statuses/i }).click();
  await page.getByRole("option", { name: "Sent", exact: true }).click();
  await expect(page).toHaveURL(/status=sent/);
  // Sort survives the filter change (params compose).
  await expect(page).toHaveURL(/sort=total_cents/);
});
