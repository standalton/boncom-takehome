/**
 * vitest.config.ts — unit/integration test runner configuration.
 *
 * What:        Configures Vitest (jsdom environment, React plugin) to run the
 *              *.test.ts(x) files under src/.
 * Notes:       E2E tests run separately via Playwright (playwright.config.ts).
 */
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
