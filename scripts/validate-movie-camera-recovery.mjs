import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { stat } from "node:fs/promises";
import { chromium } from "playwright";

const root = process.cwd(), port = 4187;
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname), relative = pathname === "/" ? "index.html" : pathname.slice(1), file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error("outside root");
    const info = await stat(file); if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end("Not found"); }
});
const waitFor = async (work, description, timeoutMs = 15_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) { if (await work()) return; await new Promise(resolve => setTimeout(resolve, 80)); }
  throw new Error(`Timed out waiting for ${description}`);
};
const bounded = (promise, timeoutMs = 2500) => Promise.race([promise, new Promise(resolve => setTimeout(resolve, timeoutMs))]);

let browser, page, exitCode = 0;
try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  browser = await chromium.launch({ headless: true }); page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
  const pageErrors = []; page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { timeout: 15_000 });
  await waitFor(() => page.evaluate(() => Boolean(window.rssDiagnostics?.startMovie)), "Cinema diagnostics");
  await page.evaluate(() => window.rssDiagnostics.startMovie());
  await waitFor(() => page.evaluate(() => Boolean(window.rssDiagnostics.movieState().shot)), "first Cinema shot");
  const before = await page.evaluate(() => window.rssDiagnostics.movieCameraRecoveryState().recoveryCount);
  await page.evaluate(() => window.rssDiagnostics.injectMovieCameraFault());
  await waitFor(() => page.evaluate(count => window.rssDiagnostics.movieCameraRecoveryState().recoveryCount > count, before), "automatic non-finite camera recovery");
  const automatic = await page.evaluate(() => window.rssDiagnostics.movieCameraRecoveryState());
  await page.evaluate(() => { const code = document.querySelector("#movie-audience-fault-code"), severity = document.querySelector("#movie-audience-fault-severity"); code.value = "CAMERA_BLANK_VIEW"; severity.value = "UNUSABLE"; document.querySelector("#movie-audience-report-fault").click(); });
  await waitFor(() => page.evaluate(count => window.rssDiagnostics.movieCameraRecoveryState().recoveryCount > count, automatic.recoveryCount), "report-driven camera recovery");
  const result = await page.evaluate(() => ({ movie: window.rssDiagnostics.movieState(), recovery: window.rssDiagnostics.movieCameraRecoveryState(), message: document.querySelector("#movie-audience-scene-status")?.textContent || "" }));
  const checks = { automaticRecovery: automatic.poseFinite && automatic.lastReason === "non-finite-inherited-camera", reportRecovery: result.recovery.recoveryCount > automatic.recoveryCount && result.message.includes("camera repaired immediately"), sessionPreserved: result.movie.active === true, finiteFinalPose: result.recovery.poseFinite === true, noPageErrors: pageErrors.length === 0 };
  const report = { passed: Object.values(checks).every(Boolean), checks, automatic, final: result.recovery, message: result.message, pageErrors };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`); if (!report.passed) exitCode = 1;
} catch (error) { process.stderr.write(`${error.stack || error}\n`); exitCode = 1; }
finally {
  if (page) await bounded(page.close().catch(() => {}));
  if (browser) await bounded(browser.close().catch(() => {}));
  server.closeAllConnections?.(); await bounded(new Promise(resolve => server.close(resolve)));
  process.exit(exitCode);
}
