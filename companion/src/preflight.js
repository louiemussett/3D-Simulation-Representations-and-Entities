import { access, mkdir, statfs } from "node:fs/promises";
import { spawn } from "node:child_process";
import { loadConfig } from "./config.js";
import { OllamaClient } from "./ollama-client.js";
import { PiperClient } from "./piper-client.js";
import { ObsClient } from "./obs-client.js";

const config = await loadConfig(), results = {};
try { await mkdir(config.sessionsDir, { recursive: true }); await access(config.sessionsDir); const disk = await statfs(config.sessionsDir), freeBytes = Number(disk.bavail) * Number(disk.bsize); results.storage = { status: freeBytes < 20 * 1024 ** 3 ? "warning" : "ready", path: config.sessionsDir, freeGiB: Number((freeBytes / 1024 ** 3).toFixed(1)), warning: freeBytes < 20 * 1024 ** 3 ? "Less than 20 GiB remains for documentary sessions" : null }; } catch (error) { results.storage = { status: "error", error: error.message }; }
results.security = { status: config.securityWarning ? "warning" : "ready", warning: config.securityWarning || null, loopback: config.host };
results.ollama = await new OllamaClient(config.ollama).health();
results.piper = await new PiperClient(config.piper).health();
const obs = new ObsClient(config.obs); results.obs = await obs.health(); obs.close();
const executableHealth = path => new Promise(resolve => { const child = spawn(path, ["-version"], { windowsHide: true, stdio: "ignore" }); const timer = setTimeout(() => { child.kill(); resolve({ status: "error", path, error: "version check timed out" }); }, 5000); child.once("error", error => { clearTimeout(timer); resolve({ status: "error", path, error: error.message }); }); child.once("exit", code => { clearTimeout(timer); resolve({ status: code === 0 ? "ready" : "error", path, code }); }); });
results.ffmpeg = await executableHealth(config.ffmpeg.path);
results.ffprobe = await executableHealth(config.ffmpeg.probePath);
console.log(JSON.stringify(results, null, 2));
process.exitCode = Object.values(results).some(item => item.status === "error") ? 1 : 0;
