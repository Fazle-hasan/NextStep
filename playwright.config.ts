import { defineConfig, devices } from "@playwright/test";

import { localStack } from "./tests/e2e/support/stack";

// E2E tests run against the LOCAL Supabase stack (pnpm exec supabase start), never the hosted project:
// the app is started on its own port with the local URL and demo keys, which override .env.local.
const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;
const stack = localStack();

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  // The dev server compiles each route on first visit, which can take a while.
  timeout: 180_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "en-IN",
    timezoneId: "Asia/Kolkata",
    navigationTimeout: 90_000,
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: "mobile-375",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // A production build: it does not compete with a running `pnpm dev` (which locks .next/dev), and pages
  // respond quickly. NEXT_PUBLIC_* values are inlined at build time, so the build gets the local values too.
  webServer: {
    command: `pnpm exec next build && pnpm exec next start --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 600_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: stack.apiUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: stack.anonKey,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: stack.anonKey,
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
