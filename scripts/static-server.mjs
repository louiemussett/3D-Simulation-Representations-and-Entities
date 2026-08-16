import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.argv[2]) || 4173;
const types = { ".css": "text/css", ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml" };
const menuImageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);
async function menuBackgroundManifest(directory = join(root, "assets", "menu"), relativeDirectory = "assets/menu") {
  const entries = await readdir(directory, { withFileTypes: true });
  const images = [];
  for (const entry of entries) {
    const absolute = join(directory, entry.name), relative = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) images.push(...await menuBackgroundManifest(absolute, relative));
    else if (entry.isFile() && menuImageExtensions.has(extname(entry.name).toLowerCase())) { const info = await stat(absolute); images.push({ path: relative, name: entry.name, size: info.size, modified: info.mtime.toISOString() }); }
  }
  return images.sort((a, b) => a.path.localeCompare(b.path));
}
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname === "/__menu-backgrounds") { const body = JSON.stringify({ version: 1, images: await menuBackgroundManifest() }); response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" }); response.end(body); return; }
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error("outside root");
    const info = await stat(file);
    if (!info.isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(file).pipe(response);
  } catch { response.writeHead(404); response.end("Not found"); }
});
server.listen(port, "127.0.0.1");
const stop = () => server.close(() => process.exit(0));
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
