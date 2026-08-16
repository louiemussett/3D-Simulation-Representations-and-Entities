import { sampleSummary } from "./diagnostics.js";

const canonicalValue = (value, seen = new WeakSet()) => {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : String(value);
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[circular]";
  seen.add(value);
  let result;
  if (Array.isArray(value)) result = value.map((entry) => canonicalValue(entry, seen));
  else if (value instanceof Map) result = [...value.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))).map(([key, entry]) => [key, canonicalValue(entry, seen)]);
  else result = Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalValue(value[key], seen)]));
  seen.delete(value); return result;
};

export function deterministicChecksum(value) {
  const text = JSON.stringify(canonicalValue(value));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) { hash ^= text.charCodeAt(index); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

const numericSnapshot = (value = {}) => Object.fromEntries(Object.entries(value).filter(([, entry]) => Number.isFinite(Number(entry))).map(([key, entry]) => [key, Number(entry)]));

/** Runs isolated deterministic fixtures and verifies semantic output per iteration. */
export async function runDeterministicBenchmarkFixture(fixture, {
  iterations = fixture.iterations ?? 25,
  warmup = fixture.warmup ?? 3,
  clock = () => performance.now()
} = {}) {
  if (!fixture?.name || typeof fixture.run !== "function") throw new TypeError("Benchmark fixtures require a name and run function");
  iterations = Math.max(1, Math.floor(iterations)); warmup = Math.max(0, Math.floor(warmup));
  for (let index = 0; index < warmup; index += 1) {
    const context = await fixture.setup?.(index, "warmup");
    try { await fixture.run(context, index); } finally { await fixture.teardown?.(context, index, "warmup"); }
  }
  const durations = [], growth = {}, checksums = [];
  for (let index = 0; index < iterations; index += 1) {
    const context = await fixture.setup?.(index, "measure");
    try {
      const before = numericSnapshot(await fixture.resources?.(context, "before") || {});
      const started = clock();
      let result;
      try { result = await fixture.run(context, index); }
      finally { durations.push(Math.max(0, clock() - started)); }
      const semantic = fixture.semanticResult ? fixture.semanticResult(result, context) : result;
      checksums.push(deterministicChecksum(semantic));
      const after = numericSnapshot(await fixture.resources?.(context, "after") || {});
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        const delta = (after[key] || 0) - (before[key] || 0);
        const entry = growth[key] || { minimum: delta, maximum: delta, final: delta };
        entry.minimum = Math.min(entry.minimum, delta); entry.maximum = Math.max(entry.maximum, delta); entry.final = delta; growth[key] = entry;
        const maximum = fixture.maximumGrowth?.[key];
        if (Number.isFinite(maximum) && delta > maximum) throw new Error(`${fixture.name} ${key} grew by ${delta}, above ${maximum}`);
      }
    } finally {
      await fixture.teardown?.(context, index, "measure");
    }
  }
  const expectedChecksum = checksums[0], deterministic = checksums.every((checksum) => checksum === expectedChecksum);
  if (!deterministic) throw new Error(`${fixture.name} produced non-deterministic checksums: ${[...new Set(checksums)].join(", ")}`);
  const timings = sampleSummary(durations), maximumP95Ms = Number(fixture.maximumP95Ms);
  if (Number.isFinite(maximumP95Ms) && timings.p95Ms > maximumP95Ms) throw new Error(`${fixture.name} p95 ${timings.p95Ms.toFixed(3)}ms exceeded ${maximumP95Ms}ms`);
  return Object.freeze({
    name: fixture.name,
    iterations,
    warmup,
    checksum: expectedChecksum,
    deterministic,
    timings: Object.freeze(timings),
    timingBudget: Object.freeze({ maximumP95Ms: Number.isFinite(maximumP95Ms) ? maximumP95Ms : null, withinBudget: !Number.isFinite(maximumP95Ms) || timings.p95Ms <= maximumP95Ms }),
    resourceGrowth: Object.freeze(Object.fromEntries(Object.entries(growth).map(([key, entry]) => [key, Object.freeze(entry)])))
  });
}

export async function runDeterministicBenchmarkSuite(fixtures, options = {}) {
  const reports = [];
  for (const fixture of fixtures) reports.push(await runDeterministicBenchmarkFixture(fixture, options));
  return Object.freeze(reports);
}
