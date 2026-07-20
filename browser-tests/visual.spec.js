import { expect, test } from "@playwright/test";

test("production-quality world visual review", async ({ page }) => {
  await page.goto("/?profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 30_000 }).toBe("object");
  await expect(page.locator("#viewport canvas")).toBeVisible();
  await expect(page.locator("#startup-error")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.report().resources["renderer.info.render.calls"])).toBeGreaterThan(0);
});
