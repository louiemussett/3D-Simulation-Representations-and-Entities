export class PerceptionResultCache {
  constructor(maxEntries = 1024) {
    this.maxEntries = Math.max(1, Math.floor(maxEntries));
    this.signature = null;
    this.results = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  prepare(signature) {
    if (signature === this.signature) return false;
    this.signature = signature;
    this.results.clear();
    return true;
  }

  get(key) {
    const result = this.results.get(key);
    if (result === undefined) { this.misses += 1; return null; }
    this.hits += 1;
    return result;
  }

  set(key, result) {
    if (this.results.size >= this.maxEntries && !this.results.has(key)) {
      const oldest = this.results.keys().next().value;
      this.results.delete(oldest);
    }
    this.results.set(key, result);
    return result;
  }

  resetCounters() { this.hits = 0; this.misses = 0; }
}

export function perceptionPoseSignature(animal, context) {
  return [
    animal.x, animal.z, animal.orientation || 0, animal.headYaw || 0,
    Math.min(3, animal.sensoryFocusTicks || 0), context.range,
    context.terrainVersion || 0, context.vegetationVersion || 0,
    context.season || "", context.ecologicalHour || 0
  ].join("|");
}
