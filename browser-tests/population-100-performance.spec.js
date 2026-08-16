import { expect, test } from "@playwright/test";

test("100 entities on a 300-scale 40k-hex world sustain the 30 FPS target", async ({ page }, testInfo) => {
  test.setTimeout(5 * 60_000);
  page.on("console", message => { if (message.text().startsWith("[high-hex]")) console.log(message.text()); });
  await page.goto("/?test=1&profile=1");
  await expect.poll(() => page.evaluate(() => typeof window.rssDiagnostics), { timeout: 20_000 }).toBe("object");
  await page.evaluate(() => {
    window.__populationPerformanceResult = null;
    window.__populationPerformanceError = null;
    window.rssDiagnostics.highHexBenchmark(40000, { runningState: true, performanceMode: true, population: 100, frameSamples: 60, includeAuthoritativeHash: false })
      .then(result => { window.__populationPerformanceResult = result; })
      .catch(error => { window.__populationPerformanceError = error?.stack || error?.message || String(error); });
  });
  let lastPhase = "";
  await expect.poll(async () => {
    const status = await page.evaluate(() => ({ result: window.__populationPerformanceResult, error: window.__populationPerformanceError, progress: window.rssDiagnostics.highHexBenchmarkState(), generation: window.rssDiagnostics.worldGenerationState() }));
    if (status.error) throw new Error(status.error);
    const phase = `${status.progress.phase}:${status.progress.detail?.sampledFrames || 0}`;
    if (phase !== lastPhase) { lastPhase = phase; console.log("benchmark progress", JSON.stringify(status.progress)); }
    return Boolean(status.result);
  }, { timeout: 4.5 * 60_000, intervals: [1000, 2000, 5000] }).toBe(true);
  const result = await page.evaluate(() => window.__populationPerformanceResult);
  expect(result.cancelled).not.toBe(true);
  expect(result.population).toBe(100);
  expect(result.cells).toBeGreaterThanOrEqual(36000);
  expect(result.averageFps).toBeGreaterThanOrEqual(30);
  await testInfo.attach("population-100-performance.json", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
});
