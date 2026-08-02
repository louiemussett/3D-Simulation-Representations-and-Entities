import { createReadStream } from "node:fs";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { chromium } from "playwright";
import { compatibleEcologyCheckpoint, parseEcologyAuditArguments } from "../src/ecology-audit-config.js";

async function writeCheckpoint(path, report) {
  await mkdir(dirname(path), { recursive: true }); const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8"); await rename(temporary, path);
}

async function previousReport(options) {
  if (!options.resume) return null;
  try { const report = JSON.parse(await readFile(options.output, "utf8")); return compatibleEcologyCheckpoint(report, options) ? report : null; } catch { return null; }
}

const options = parseEcologyAuditArguments(process.argv.slice(2)), root = process.cwd(), port = 4176;
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname), file = normalize(join(root, pathname === "/" ? "index.html" : pathname.slice(1)));
    if (!file.startsWith(root) || !(await stat(file)).isFile()) throw new Error("not found");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end(); }
});

async function runSeed(browser, seed, options, onProgress) {
  const page = await browser.newPage();
  try {
    await page.goto(`http://127.0.0.1:${port}/?test=1`);
    await page.waitForFunction(() => window.rssDiagnostics?.ecologyAuditStart, null, { timeout: 30000 });
    await page.evaluate(() => window.rssDiagnostics.stopAnimationLoop());
    process.stderr.write(`Ecology audit seed ${seed}: generating world…\n`);
    await page.evaluate(({ seedValue, minutes, setup, observationMinutes }) => window.rssDiagnostics.ecologyAuditStart(seedValue, minutes, setup, observationMinutes), { seedValue: seed, minutes: options.minutes, setup: options.setup, observationMinutes: options.observationMinutes });
    process.stderr.write(`Ecology audit seed ${seed}: advancing ${options.minutes} ecological minutes at the ${options.observationMinutes}-minute observation pace…\n`);
    let step;
    do {
      step = await page.evaluate((chunk) => window.rssDiagnostics.ecologyAuditStep(chunk), options.chunk);
      await onProgress(seed, step);
    } while (!step.done);
    return step.result;
  } finally {
    await page.close().catch(() => {});
  }
}

let browser;
try {
  await new Promise((resolveListen, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolveListen); });
  browser = await chromium.launch({ headless: true });
  const prior = await previousReport(options), completed = new Map((prior?.results || []).map((result) => [result.seed, result]));
  const report = { version: 3, status: "running", parameters: { preset: options.preset, minutes: options.minutes, observationMinutes: options.observationMinutes, seeds: options.seeds, setup: options.setup }, startedAt: prior?.startedAt || new Date().toISOString(), updatedAt: new Date().toISOString(), results: [...completed.values()] };
  const progress = new Map(), pending = options.seeds.filter((seed) => !completed.has(seed));
  let checkpointWrites = Promise.resolve(), cursor = 0;
  const checkpoint = () => {
    report.progress = options.seeds.filter((seed) => progress.has(seed)).map((seed) => ({ seed, ...progress.get(seed) }));
    report.results = options.seeds.filter((seed) => completed.has(seed)).map((seed) => completed.get(seed));
    report.updatedAt = new Date().toISOString();
    checkpointWrites = checkpointWrites.then(() => writeCheckpoint(options.output, report));
    return checkpointWrites;
  };
  const worker = async () => {
    while (cursor < pending.length) {
      const seed = pending[cursor++];
      const result = await runSeed(browser, seed, options, async (_seed, step) => {
        progress.set(seed, { completedMinutes: step.completedMinutes, requestedMinutes: step.requestedMinutes }); await checkpoint();
      });
      completed.set(seed, result); progress.delete(seed); await checkpoint();
    }
  };
  await Promise.all(Array.from({ length: Math.min(options.workers, pending.length) }, worker));
  report.status = "complete"; report.completedAt = report.updatedAt = new Date().toISOString(); delete report.progress; await writeCheckpoint(options.output, report);
  process.stdout.write(`${JSON.stringify({ output: options.output, seeds: report.results.length, status: report.status }, null, 2)}\n`);
} finally {
  await browser?.close().catch(() => {}); server.closeAllConnections?.(); await new Promise((resolveClose) => server.close(resolveClose));
}
