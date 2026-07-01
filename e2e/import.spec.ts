/**
 * import.spec.ts — end-to-end spreadsheet import (quotes target).
 *
 * What:        Logs in as a seeded user, imports a quotes CSV through the wizard
 *              (upload → auto-mapped columns → preview → commit), and confirms
 *              the imported clients/quotes appear afterward.
 * Notes:       Hits the live Supabase project + seeded demo users (like
 *              core-flow.spec.ts). Creates real client + quote rows named
 *              "Import Test Co" / "Second Import Co".
 */
import { test, expect } from "@playwright/test";
import path from "node:path";

test("imports a quotes CSV end to end", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Sarah", exact: true }).click();
  await expect(page).toHaveURL("http://localhost:3000/");

  await page.goto("/import?target=quotes");

  // Step 1: upload the fixture (target "quotes" is pre-selected via the query).
  await page.setInputFiles(
    "#file",
    path.join(process.cwd(), "src/lib/import/__fixtures__/quotes-sample.csv"),
  );
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2: headers auto-map to required fields; proceed to the preview.
  await page.getByRole("button", { name: "Preview" }).click();

  // Step 3: summary reflects 2 quotes across 2 new clients.
  await expect(page.getByText(/2 quotes/)).toBeVisible();
  await page.getByRole("button", { name: /Import \d+ rows/ }).click();
  await expect(page.getByText("Import complete.")).toBeVisible();

  // The imported quotes now exist on the quotes list.
  await page.goto("/clients");
  await expect(page.getByText("Import Test Co")).toBeVisible();
});
