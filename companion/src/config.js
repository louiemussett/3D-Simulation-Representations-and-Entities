import { resolve } from "node:path";

function parseEnvFile(text) { const output = {}; for (const line of String(text).split(/\r?\n/)) { const trimmed = line.trim(); if (!trimmed || trimmed.startsWith("#")) continue; const index = trimmed.indexOf("="); if (index < 1) continue; const key = trimmed.slice(0, index).trim(), raw = trimmed.slice(index + 1).trim(); output[key] = raw.replace(/^(['"])(.*)\1$/, "$2"); } return output; }

export async function loadConfig({ cwd = process.cwd(), environment = process.env } = {}) {
  let file = {}; try { file = parseEnvFile(await (await import("node:fs/promises")).readFile(resolve(cwd, ".env"), "utf8")); } catch {}
  const env = { ...file, ...environment }, number = (key, fallback) => Number.isFinite(Number(env[key])) ? Number(env[key]) : fallback;
  const config = {
    host: env.DOCUMENTARY_HOST || "127.0.0.1", port: number("DOCUMENTARY_PORT", 8765), token: env.DOCUMENTARY_SESSION_TOKEN || "", sessionsDir: resolve(cwd, env.DOCUMENTARY_SESSIONS_DIR || "sessions"), profilesDir: resolve(cwd, env.DOCUMENTARY_PROFILES_DIR || "profiles"), maxMessageBytes: number("DOCUMENTARY_MAX_MESSAGE_BYTES", 1048576), orphanGraceMs: number("DOCUMENTARY_ORPHAN_GRACE_MS", 10000), healthTimeoutMs: number("DOCUMENTARY_HEALTH_TIMEOUT_MS", 5000),
    ollama: { baseUrl: env.OLLAMA_BASE_URL || "http://127.0.0.1:11434", model: env.OLLAMA_LIVE_MODEL || "qwen3.5:4b", timeoutMs: number("OLLAMA_TIMEOUT_MS", 15000), keepAlive: env.OLLAMA_KEEP_ALIVE || "30m" },
    piper: { python: env.PIPER_PYTHON || "python", dataDir: resolve(cwd, env.PIPER_DATA_DIR || "runtime/piper-voices"), voice: env.PIPER_VOICE || "en_GB-alan-medium", timeoutMs: number("PIPER_TIMEOUT_MS", 20000) },
    obs: { enabled: String(env.OBS_ENABLED).toLowerCase() === "true", url: env.OBS_WEBSOCKET_URL || "ws://127.0.0.1:4455", password: env.OBS_WEBSOCKET_PASSWORD || "", timeoutMs: number("OBS_TIMEOUT_MS", 5000), executable: env.OBS_EXECUTABLE || "C:\\Program Files\\obs-studio\\bin\\64bit\\obs64.exe", launchTimeoutMs: number("OBS_LAUNCH_TIMEOUT_MS", 20000) },
    ffmpeg: { path: env.FFMPEG_PATH || "ffmpeg", probePath: env.FFPROBE_PATH || "ffprobe" }
  };
  if (!["127.0.0.1", "::1", "localhost"].includes(config.host)) throw new Error("Documentary companion must bind to loopback unless source is explicitly reviewed");
  if (!config.token || config.token.length < 16) config.securityWarning = "DOCUMENTARY_SESSION_TOKEN should contain at least 16 characters";
  return config;
}
