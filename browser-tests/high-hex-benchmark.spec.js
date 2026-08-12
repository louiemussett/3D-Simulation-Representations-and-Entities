import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const details = [5000, 10000, 20000, 40000];

test("cooperative world reloads settle without leaking presentation resources", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  const load = async () => {
    await page.evaluate(() => { window.__highHexTestResult = null; window.rssDiagnostics.asyncWorldLoad(2718).then(result => { window.__highHexTestResult = result; }).catch(error => { window.__highHexTestResult = { error: String(error?.stack || error) }; }); });
    await page.waitForFunction(() => window.__highHexTestResult !== null, null, { timeout: 60_000, polling: 250 });
    return page.evaluate(() => window.__highHexTestResult);
  };
  const first = await load(), second = await load();
  expect(first.loaded).toBe(true); expect(second.loaded).toBe(true);
  expect(second.hash).toBe(first.hash);
  expect(second.loadingVisible).toBe(false);
  expect(second.resources["renderer.info.memory.geometries"]).toBeLessThanOrEqual(first.resources["renderer.info.memory.geometries"] + 8);
  expect(second.resources["renderer.info.memory.textures"]).toBeLessThanOrEqual(first.resources["renderer.info.memory.textures"] + 4);
  await expect(page.locator("#startup-error")).toHaveCount(0);
});

test("fixed-seed high-hex construction, update, route, render, and memory benchmark", async ({ page }, testInfo) => {
  test.setTimeout(15 * 60_000);
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  const results = [];
  for (const hexDetail of details) {
    const paused = await page.evaluate(detail => window.rssDiagnostics.highHexBenchmark(detail, { runningState: false, performanceMode: false, frameSamples: 45 }), hexDetail);
    const running = await page.evaluate(detail => window.rssDiagnostics.highHexBenchmark(detail, { runningState: true, performanceMode: false, frameSamples: 90 }), hexDetail);
    expect(paused.cancelled).not.toBe(true); expect(running.cancelled).not.toBe(true);
    expect(paused.cells).toBeGreaterThanOrEqual(Math.floor(hexDetail * .9));
    expect(paused.authoritativeHash).toBeTruthy();
    results.push({ hexDetail, paused, running });
  }
  const performanceMode = await page.evaluate(() => window.rssDiagnostics.highHexBenchmark(40000, { runningState: false, performanceMode: true, frameSamples: 90 }));
  expect(performanceMode.authoritativeHash).toBe(results.at(-1).paused.authoritativeHash);
  const current40k = results.at(-1).running;
  expect(current40k.routeP95Ms).toBeLessThanOrEqual(100);
  expect(current40k.dailyUpdateMs).toBeLessThan(100);
  expect(current40k.frameP95Ms).toBeLessThanOrEqual(33.3);
  await testInfo.attach("high-hex-benchmark.json", { body: JSON.stringify({ benchmarkSchema: 1, generatedAt: new Date().toISOString(), results, performanceMode }, null, 2), contentType: "application/json" });

  if (process.env.HIGH_HEX_BASELINE) {
    const baseline = JSON.parse(await readFile(process.env.HIGH_HEX_BASELINE, "utf8")), baseline40k = baseline.results.find(item => item.hexDetail === 40000)?.running;
    expect(baseline40k, "baseline must contain a running 40k record").toBeTruthy();
    expect(current40k.constructionMs).toBeLessThanOrEqual(baseline40k.constructionMs * .55);
    expect(current40k.completeLoadMs).toBeLessThanOrEqual(baseline40k.completeLoadMs * .65);
    expect(current40k.routeP95Ms).toBeLessThanOrEqual(baseline40k.routeP95Ms * .2);
    if (current40k.heapBytes && baseline40k.heapBytes) expect(current40k.heapBytes).toBeLessThanOrEqual(baseline40k.heapBytes * .8);
  }
});
