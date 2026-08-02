import { spawn } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import { basename, join } from "node:path";

const safeId = value => String(value).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 96);
export class PiperClient {
  constructor(config) { this.config = config; }
  async health() { return new Promise(resolve => { const child = spawn(this.config.python, ["-m", "piper", "--help"], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] }), timer = setTimeout(() => { child.kill(); resolve({ status: "offline", error: "timeout" }); }, 3000); child.once("error", error => { clearTimeout(timer); resolve({ status: "offline", error: error.message }); }); child.once("close", code => { clearTimeout(timer); resolve({ status: code === 0 ? "ready" : "offline", code, voice: this.config.voice }); }); }); }
  async synthesize({ narrationId, text, sessionRoot }) { const id = safeId(narrationId), directory = join(sessionRoot, "narration"); await mkdir(directory, { recursive: true }); const outputPath = join(directory, `${id}.wav`), args = ["-m", this.config.voice, "--data-dir", this.config.dataDir, "-f", outputPath, "--", text]; return new Promise((resolve, reject) => { const child = spawn(this.config.python, ["-m", "piper", ...args], { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] }); let stderr = "", settled = false; const finish = callback => value => { if (settled) return; settled = true; clearTimeout(timer); callback(value); }, timer = setTimeout(() => { child.kill(); finish(reject)(new Error("piper-timeout")); }, this.config.timeoutMs); child.stderr.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-4000); }); child.once("error", finish(reject)); child.once("close", finish(async code => { if (code !== 0) return reject(new Error(`Piper exited ${code}: ${stderr}`)); const info = await stat(outputPath); resolve({ narrationId: id, outputPath, fileName: basename(outputPath), bytes: info.size, voice: this.config.voice }); })); }); }
}
