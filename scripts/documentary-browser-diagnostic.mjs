import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const port = 4184;
const outputDirectory = join(root, "test-results");
const outputPath = join(outputDirectory, "acss-browser-commissioning.json");
const contentTypes = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error("outside root");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "content-type": contentTypes[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

const waitFor = async (work, description, timeoutMs = 20_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await work()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${description}`);
};

let browser;
let page;
const pageErrors = [];
let report = null;
try {
  await mkdir(outputDirectory, { recursive: true });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto(`http://127.0.0.1:${port}/?test=1`, { timeout: 20_000 });
  await waitFor(() => page.evaluate(() => Boolean(window.rssDiagnostics?.configureAcss)), "ACSS diagnostic API");
  await page.evaluate(() => {
    const subject = document.querySelector("#movie-subject-mode");
    subject.value = "characters";
    subject.dispatchEvent(new Event("change"));
    window.rssDiagnostics.configureAcss("V3_ACTIVE", "BOUNDED_ACTIVE");
  });
  await page.evaluate(() => window.rssDiagnostics.startMovie());
  await waitFor(() => page.evaluate(() => {
    const state = window.rssDiagnostics.acssAuthorState();
    return state.liveControl && state.contract?.valid && state.cameraSession?.plan?.selected;
  }), "live ACSS contract and camera horizon plan", 25_000);
  await page.waitForTimeout(2_500);
  const beforeNext = await page.evaluate(() => ({ movie: window.rssDiagnostics.movieState(), author: window.rssDiagnostics.acssAuthorState() }));
  await page.evaluate(() => window.rssDiagnostics.nextMovieShot());
  await waitFor(() => page.evaluate(previousSequence => {
    const movie = window.rssDiagnostics.movieState(), state = window.rssDiagnostics.acssAuthorState();
    return movie.sequence > previousSequence && state.contract?.valid;
  }, beforeNext.movie.sequence), "second ACSS presentation boundary");
  await page.waitForTimeout(1_500);
  const state = await page.evaluate(() => ({
    movie: window.rssDiagnostics.movieState(),
    author: window.rssDiagnostics.acssAuthorState(),
    ui: {
      status: document.querySelector("#movie-author-status")?.textContent || "",
      concern: document.querySelector("#movie-acss-concern")?.textContent || "",
      method: document.querySelector("#movie-acss-method")?.textContent || "",
      failures: document.querySelector("#movie-acss-failures")?.textContent || ""
    }
  }));
  const health = state.author.health || {};
  const contract = state.author.contract || {};
  const shotMetrics = state.movie.shot?.metrics || {};
  const checks = {
    movieActive: state.movie.active === true,
    boundedControlActive: state.author.liveControl === true && health.controlActive === true,
    immutableObservationPopulated: health.evidenceRecords > 0 && health.beliefs > 0 && health.activeSituations > 0,
    dependencyPlanSelected: health.selectedModels >= 3 && Boolean(state.author.diagnostic?.currentPlan?.rootModelId),
    validLicensedContract: contract.valid === true && contract.allowedClaimIds?.length > 0 && contract.evidenceIds?.length > 0,
    characterPolicyHonoured: state.movie.subjectMode === "characters" && contract.subjectIds?.length > 0 && !state.movie.shot?.worldSubject,
    executedCameraLicensed: contract.camera?.allowedFamilies?.includes(state.movie.shot?.type) === true,
    narrationSubjectsMatchFrame: (contract.subjectIds || []).every(id => state.movie.shot?.subjectIds?.includes(id)),
    predictiveCameraOwnsPose: Boolean(state.author.cameraSession?.plan?.selected) && contract.camera?.continuousRepairOnly === true,
    measuredCameraHealthy: shotMetrics.valid !== false && Number(shotMetrics.discontinuityCount || 0) === 0,
    noRuntimeErrors: pageErrors.length === 0
  };
  report = {
    schemaVersion: 1,
    evaluatedAtUtc: new Date().toISOString(),
    passed: Object.values(checks).every(Boolean),
    checks,
    pageErrors,
    summary: {
      executionMode: state.author.executionMode,
      lifecycle: health.lifecycle,
      controlActive: health.controlActive,
      evidenceRecords: health.evidenceRecords,
      beliefs: health.beliefs,
      situations: health.activeSituations,
      selectedModels: health.selectedModels,
      contractId: contract.contractId,
      threadId: contract.threadId,
      subjectIds: contract.subjectIds,
      cameraFamily: state.movie.shot?.type,
      shotSequence: state.movie.sequence,
      discontinuities: Number(shotMetrics.discontinuityCount || 0)
    },
    ui: state.ui
  };
  await page.evaluate(() => window.rssDiagnostics.stopMovie());
  if (!report.passed) throw new Error(`ACSS browser commissioning failed: ${JSON.stringify(report)}`);
} catch (error) {
  report ||= { schemaVersion: 1, evaluatedAtUtc: new Date().toISOString(), passed: false, checks: {}, pageErrors, error: error.stack || String(error) };
  if (page) await page.screenshot({ path: join(outputDirectory, "acss-browser-commissioning-failure.png"), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8").catch(() => {});
  if (page) await page.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
