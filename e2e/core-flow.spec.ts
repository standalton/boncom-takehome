/**
 * core-flow.spec.ts — the critical end-to-end flow.
 *
 * What:        Logs in as a seeded user, starts a new quote in the editor, picks
 *              a client, adds a line item, checks the live total, saves (which
 *              creates the row and routes to it), and confirms it persists on
 *              reload.
 * Notes:       Hits the live Supabase project; creates a real quote row. The row
 *              is created only on save, so /quotes/new alone writes nothing.
 */
import { test, expect } from "@playwright/test";

test("create, edit, save, and persist a quote", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sarah", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.getByRole("link", { name: /new quote/i }).first().click();
  await expect(page).toHaveURL(/\/quotes\/new$/);
  // The new-quote route is the full editor (not a separate starter), and no row
  // exists yet — the URL stays on /quotes/new until the first save.
  await expect(page.getByRole("heading", { name: "New quote" })).toBeVisible();

  // A client is required before the quote can be created.
  await page.getByText("Select a customer…").click();
  await page.getByRole("option", { name: "Northwind Foods" }).click();

  await page.getByRole("button", { name: /add line/i }).click();
  await page.getByPlaceholder("Add a description…").first().fill("Test workshop");
  await page.getByLabel("Rate", { exact: true }).fill("4000");

  await expect(page.getByTestId("grand-total")).toHaveText("$4,000.00");

  // Saving a new quote creates the row and routes to its own editor URL.
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/quotes\/[0-9a-f-]+$/);
  await expect(page.getByTestId("grand-total")).toHaveText("$4,000.00");

  await page.reload();
  await expect(page.getByTestId("grand-total")).toHaveText("$4,000.00");
});
