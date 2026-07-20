import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./browser-tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  outputDir: "test-results",
  reporter: [["line"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    viewport: { width: 960, height: 640 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "node scripts/static-server.mjs 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 10_000,
    gracefulShutdown: { signal: "SIGTERM", timeout: 3_000 }
  },
  projects: [
    { name: "smoke", testMatch: /smoke\.spec\.js/ },
    { name: "visual", testMatch: /visual\.spec\.js/, use: { viewport: { width: 1920, height: 1080 } } }
  ]
});
