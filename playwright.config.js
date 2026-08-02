import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

const installedChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const executablePath = process.env.PLAYWRIGHT_CHROME_PATH || (existsSync(installedChrome) ? installedChrome : undefined);

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
    headless: true,
    viewport: { width: 960, height: 640 },
    screenshot: "only-on-failure",
    trace: "off",
    video: "off"
    , launchOptions: executablePath ? { executablePath } : {}
  },
  webServer: {
    command: "node scripts/static-server.mjs 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
    timeout: 10_000
  },
  projects: [
    { name: "smoke", testMatch: /smoke\.spec\.js/ },
    { name: "embodiment", testMatch: /embodiment\.spec\.js/ },
    { name: "movie", testMatch: /movie-mode\.spec\.js/, use: { viewport: { width: 1440, height: 900 } } },
    { name: "visual", testMatch: /visual\.spec\.js/, use: { viewport: { width: 1920, height: 1080 } } }
  ]
});
