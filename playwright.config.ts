import { defineConfig, devices } from "@playwright/test";

// E2E runs against the production build, the same thing Docker serves.
export default defineConfig({
  testDir: "e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://localhost:3100/healthz",
    env: { PORT: "3100", LOG_LEVEL: "warn" },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
