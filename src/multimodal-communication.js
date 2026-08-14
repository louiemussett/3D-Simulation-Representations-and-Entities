import { supportedAcousticCall } from "./acoustic-profiles.js";

const VISUAL_SIGNALS = new Set(["threat", "alarm", "courtship", "care", "reject", "accept", "leave-group", "join-group", "attacked"]);
const CHEMICAL_SIGNALS = new Set(["territory", "courtship", "identity"]);

export function supportedSignalModalities(subject, signalKind) {
  const modalities = [];
  if (supportedAcousticCall(subject, signalKind)) modalities.push("acoustic");
  if (VISUAL_SIGNALS.has(signalKind)) modalities.push("visual-posture");
  if (CHEMICAL_SIGNALS.has(signalKind)) modalities.push("chemical");
  return Object.freeze(modalities);
}

export function signalEmissionRecord(sender, signal, tick) {
  const modalities = supportedSignalModalities(sender, signal?.kind || signal?.signalKind);
  return Object.freeze({
    emissionId: `${tick}:${sender.id}:${signal?.kind || signal?.signalKind || "unknown"}`,
    tick, senderId: sender.id, speciesId: sender.speciesId, signalKind: signal?.kind || signal?.signalKind || null,
    modalities, emitted: modalities.length > 0, position: Object.freeze({ x: sender.x, z: sender.z }),
    audience: signal?.audience || "nearby", evidenceBoundary: "outward-public-signal-only"
  });
}

export function receiverInterpretationRecord(emission, receiver, observations = []) {
  const relevant = observations.filter(item => item && (item.sourceId === emission.senderId || item.targetId === emission.senderId));
  const detectedModalities = [...new Set(relevant.map(item => item.channel === "hearing" ? "acoustic" : item.channel))];
  const confidence = relevant.reduce((best, item) => Math.max(best, Number(item.confidence || 0)), 0);
  return Object.freeze({
    emissionId: emission.emissionId, receiverId: receiver.id, detectedModalities: Object.freeze(detectedModalities),
    detected: detectedModalities.length > 0, interpretedSignalKind: confidence >= .35 ? emission.signalKind : null,
    confidence, missedModalities: Object.freeze(emission.modalities.filter(modality => !detectedModalities.includes(modality)))
  });
}

export class CompactTraceField {
  constructor({ limitPerCell = 8, maximumCells = 2048 } = {}) { this.limitPerCell = limitPerCell; this.maximumCells = maximumCells; this.cells = new Map(); }
  deposit(cellId, record) {
    if (cellId == null || !record?.kind) return;
    let entries = this.cells.get(cellId) || [];
    if (record.kind === "footprint") entries = entries.map(item => item.kind !== "footprint" || item.sourceId === record.sourceId ? item : { ...item, intensity: Math.max(0, (item.intensity || 0) * (1 - Math.min(.82, (record.intensity || 0) * .7))), overwrittenBy: record.sourceId, overwrittenAtAgeHours: item.ageHours || 0 }).filter(item => (item.intensity || 0) > .025);
    if (["water-entry", "water-wake"].includes(record.kind)) entries = entries.map(item => item.kind === "ground-scent" || item.kind === "blood-in-water" ? { ...item, intensity: (item.intensity || 0) * .35, waterWashed: true } : item.kind === "footprint" ? { ...item, intensity: (item.intensity || 0) * .08, waterWashed: true } : item).filter(item => (item.intensity || 0) > .025);
    const compatible = entries.find(item => item.kind === record.kind && item.sourceId === record.sourceId);
    if (compatible) Object.assign(compatible, record, { intensity: Math.max(compatible.intensity || 0, record.intensity || 0), depositionCount: (compatible.depositionCount || 1) + 1 });
    else entries.push({ ...record });
    entries.sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
    this.cells.set(cellId, entries.slice(0, this.limitPerCell));
    if (this.cells.size > this.maximumCells) this.cells.delete(this.cells.keys().next().value);
  }
  advance({ rain = 0, wind = 0, elapsedHours = 1, weatherAt = null } = {}) {
    for (const [cellId, entries] of this.cells) {
      const retained = entries.map(item => {
        const localWeather = weatherAt?.(item) || {}, localRain = Number(localWeather.rain ?? rain) || 0, localWind = Number(localWeather.wind ?? wind) || 0;
        const substrateRetention = ({ mud: .84, clay: .76, peat: .82, snow: .78, sand: .48, loam: .58, soil: .5, vegetation: .62, rock: .08, water: 0 })[item.substrate] ?? .5;
        const durable = ["bone", "shed-antler"].includes(item.kind), organicFragment = ["hair", "feather"].includes(item.kind);
        const rainLoss = durable ? localRain * .0001 : ["footprint", "disturbance"].includes(item.kind) ? localRain * .38 * (1 - substrateRetention * .55) : item.kind === "blood" ? localRain * .46 : item.kind === "dung" ? localRain * .035 : localRain * .18;
        const windLoss = item.kind.includes("scent") || item.kind === "urine" ? localWind * .22 * (1 - substrateRetention * .35) : organicFragment ? localWind * .008 : 0;
        return { ...item, ageHours: (item.ageHours || 0) + elapsedHours, intensity: Math.max(0, (item.intensity || 0) * Math.exp(-(item.decayPerHour || .04) * elapsedHours) - rainLoss - windLoss) };
      }).filter(item => item.intensity > .025);
      if (retained.length) this.cells.set(cellId, retained); else this.cells.delete(cellId);
    }
  }
  recordsAt(cellId) { return Object.freeze((this.cells.get(cellId) || []).map(item => Object.freeze({ ...item }))); }
  snapshot() { return Object.fromEntries([...this.cells].map(([key, value]) => [key, value.map(item => ({ ...item }))])); }
  static fromSnapshot(snapshot = {}) { const field = new CompactTraceField(); for (const [key, entries] of Object.entries(snapshot || {})) field.cells.set(Number.isNaN(Number(key)) ? key : Number(key), entries.map(item => ({ ...item }))); return field; }
}
