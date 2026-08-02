import { join, resolve } from "node:path";
import { ecologyPreset } from "./ecology-balance.js";

export function parseEcologyAuditArguments(argv, cwd = process.cwd()) {
  const values = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]; if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2); if (key === "no-resume") { values.resume = false; continue; }
    const value = argv[++index]; if (value == null || value.startsWith("--")) throw new Error(`Missing value for --${key}`); values[key] = value;
  }
  const preset = ecologyPreset(values.preset || "opening"), minutes = values.minutes == null ? preset.minutes : Math.floor(Number(values.minutes));
  if (!Number.isFinite(minutes) || minutes < 1) throw new Error("--minutes must be a positive integer");
  const seeds = values.seeds ? values.seeds.split(",").map(Number) : Array.from({ length: preset.seeds }, (_, index) => 1337 + index * 997);
  if (!seeds.length || seeds.some((seed) => !Number.isFinite(seed))) throw new Error("--seeds must be a comma-separated list of numbers");
  let setup = {}; if (values.setup) { setup = JSON.parse(values.setup); if (!setup || Array.isArray(setup) || typeof setup !== "object") throw new Error("--setup must be a JSON object"); }
  const chunk = values.chunk == null ? 250 : Math.floor(Number(values.chunk)); if (!Number.isFinite(chunk) || chunk < 1) throw new Error("--chunk must be a positive integer");
  const workers = values.workers == null ? 1 : Math.floor(Number(values.workers)); if (!Number.isFinite(workers) || workers < 1) throw new Error("--workers must be a positive integer");
  const observationMinutes = values["observation-minutes"] == null ? 180 : Number(values["observation-minutes"]);
  if (![60, 180, 360].includes(observationMinutes)) throw new Error("--observation-minutes must be 60, 180, or 360");
  return { preset: preset.name, minutes, observationMinutes, chunk, workers, seeds: [...new Set(seeds)], setup, output: resolve(cwd, values.output || join("artifacts", `ecology-audit-${preset.name}.json`)), resume: values.resume !== false };
}

export function compatibleEcologyCheckpoint(report, options) {
  return Boolean(report && report.parameters?.minutes === options.minutes && (report.parameters?.observationMinutes || 180) === (options.observationMinutes || 180) && JSON.stringify(report.parameters?.setup || {}) === JSON.stringify(options.setup || {}));
}
