import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { chromium } from "playwright";

const root = process.cwd(), port = 4174;
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript" };
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = normalize(join(root, pathname === "/" ? "index.html" : pathname.slice(1)));
    if (!file.startsWith(root)) throw new Error("outside root");
    const { stat } = await import("node:fs/promises"); if (!(await stat(file)).isFile()) throw new Error("not file");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" }); createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end(); }
});

let browser;
try {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  browser = await chromium.launch({ headless: true }); const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${port}/?test=1`);
  await page.waitForFunction(() => window.rssDiagnostics?.huntAudit, null, { timeout: 20000 });
  const reports = await page.evaluate(() => [window.rssDiagnostics.huntAudit(1337, 240)]);
  process.stdout.write(`${JSON.stringify(reports, null, 2)}\n`);
} finally {
  await browser?.close().catch(() => {}); server.closeAllConnections?.(); await new Promise((resolve) => server.close(resolve));
}
