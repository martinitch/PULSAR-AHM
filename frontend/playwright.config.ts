import { defineConfig, devices } from "@playwright/test";

// Smoke test: each demo identity opens the right dashboard, route guards, sign-out.
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4173", viewport: { width: 1194, height: 834 }, locale: "en-US" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1194, height: 834 } } }],
  webServer: { command: "npm run build && npm run preview -- --port 4173 --strictPort", env: { VITE_USE_MOCK: "true" }, url: "http://localhost:4173", reuseExistingServer: true, timeout: 180_000 },
});
