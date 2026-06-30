/**
 * playwright.config.ts — end-to-end test configuration.
 *
 * What:        Runs the e2e/ specs against a local dev server.
 * Notes:       Reuses an already-running dev server if present; otherwise starts
 *              one. Requires .env.local (Supabase) and the seeded demo users.
 */
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
