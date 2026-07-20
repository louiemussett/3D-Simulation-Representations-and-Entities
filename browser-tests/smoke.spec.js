import { expect, test } from "@playwright/test";

test("small test-mode world starts and renders", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  await expect(page.locator("#viewport canvas")).toBeVisible();
  await expect(page.locator("#startup-error")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.report().resources["renderer.info.render.calls"])).toBeGreaterThan(0);
  await page.evaluate(() => window.rssDiagnostics.prepareBaseline("follow"));
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.report().resources.fogBufferCapacityVertices)).toBeGreaterThan(0);
  await expect(page.locator("#startup-error")).toHaveCount(0);
  await page.evaluate(() => window.rssDiagnostics.clear());
  await page.locator("#hud-reality").click();
  await expect(page.locator("#reality-panel")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.rssDiagnostics.report().timings["UI.reality"].samples)).toBeGreaterThan(0);
  await page.locator("#reality-close").click();
  const closedSamples = await page.evaluate(() => window.rssDiagnostics.report().timings["UI.reality"].samples);
  await page.waitForTimeout(900);
  expect(await page.evaluate(() => window.rssDiagnostics.report().timings["UI.reality"].samples)).toBe(closedSamples);
  expect(errors).toEqual([]);
});
