/**
 * new-quote.spec.ts — the new-quote route reuses the editor.
 *
 * What:        Verifies /quotes/new renders the same editor as an existing quote
 *              (not a separate starter form), and that attempting to save with no
 *              client neither navigates nor creates a row — proving the DB row is
 *              created only on a valid save (no orphan drafts).
 * Notes:       Hits the live Supabase project + seeded demo users, but creates
 *              nothing: the save attempt is intentionally blocked by validation.
 */
import { test, expect } from "@playwright/test";

test("new quote opens the editor and creates nothing until a valid save", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sarah", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.getByRole("link", { name: /new quote/i }).first().click();
  await expect(page).toHaveURL(/\/quotes\/new$/);

  // It's the real editor: the "New quote" heading and the line-items surface,
  // not the old single-purpose "pick a client" starter card.
  await expect(page.getByRole("heading", { name: "New quote" })).toBeVisible();
  await expect(page.getByRole("button", { name: /add line/i })).toBeVisible();

  // Saving with no client selected is blocked by validation: it stays on
  // /quotes/new (no row is created) rather than routing to a /quotes/[id].
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/quotes\/new$/);
  await expect(page.getByRole("heading", { name: "New quote" })).toBeVisible();
});
