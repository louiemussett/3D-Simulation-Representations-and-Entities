const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const unit = (x, z) => { const length = Math.max(.000001, Math.hypot(x, z)); return { x: x / length, z: z / length }; };
const hash01 = value => { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0) / 4294967295; };

export const AIRBORNE_SCENT_SCHEMA = 1;

export function localWindVector(cell = {}, { baseX = 1, baseZ = 0, speed = .2 } = {}) {
  const base = unit(baseX, baseZ), neighbours = cell.neighbours || [];
  let gradientX = 0, gradientZ = 0, weight = 0;
  for (const neighbour of neighbours) { const dx = neighbour.x - cell.x, dz = neighbour.z - cell.z, span = Math.max(.001, dx * dx + dz * dz), rise = Number(neighbour.elevation || 0) - Number(cell.elevation || 0); gradientX += dx / span * rise; gradientZ += dz / span * rise; weight += 1; }
  if (weight) { gradientX /= weight; gradientZ /= weight; }
  const cross = gradientX * base.z - gradientZ * base.x, contourDeflection = clamp(cross * .32, -.42, .42), canopy = clamp(cell.canopyCover || (cell.woodland ? .65 : 0)), vegetation = clamp(canopy * .72 + (cell.shrubland ? .18 : 0) + (cell.grassHeight || 0) * .08), shelter = clamp(cell.windShelter || 0), exposure = clamp(cell.windExposure || 0), channel = clamp(cell.windChannel || 0);
  const direction = unit(base.x - base.z * contourDeflection + gradientX * channel * .08, base.z + base.x * contourDeflection + gradientZ * channel * .08);
  const magnitude = clamp(Number(speed) * (1 + exposure * .38 + channel * .24) * (1 - shelter * .52) * (1 - vegetation * .44), .015, 1.8);
  return Object.freeze({ x: direction.x * magnitude, z: direction.z * magnitude, speed: magnitude, directionX: direction.x, directionZ: direction.z, terrainDeflection: contourDeflection, vegetationShelter: vegetation, informationBoundary: "local-environment-only" });
}

export function deterministicIntermittency({ sourceId = "unknown", observerId = "unknown", cellId = "unknown", tick = 0, concentration = 0, turbulence = .5 } = {}) {
  const phase = hash01(`${sourceId}:${observerId}:${cellId}`) * Math.PI * 2, pulse = .5 + .5 * Math.sin(Number(tick) * (.73 + clamp(turbulence) * 1.17) + phase), filament = hash01(`${sourceId}:${cellId}:${Math.floor(Number(tick) / 2)}`);
  const availability = clamp(Number(concentration) * (.28 + pulse * .92) * (filament > .16 + clamp(turbulence) * .24 ? 1 : .08));
  return Object.freeze({ available: availability >= .045, availability, pulse, filament, deterministic: true });
}

export class AirborneScentField {
  constructor({ maximumCells = 4096, limitPerCell = 6 } = {}) { this.maximumCells = maximumCells; this.limitPerCell = limitPerCell; this.cells = new Map(); }
  deposit(cellId, packet = {}) {
    if (cellId == null || !packet.sourceId || !packet.guild) return;
    const entries = this.cells.get(cellId) || [], compatible = entries.find(item => item.sourceId === packet.sourceId && item.guild === packet.guild);
    if (compatible) Object.assign(compatible, packet, { concentration: clamp((compatible.concentration || 0) + (packet.concentration || 0), 0, 5), ageHours: Math.min(compatible.ageHours || 0, packet.ageHours || 0) }); else entries.push({ ...packet, concentration: clamp(packet.concentration, 0, 5) });
    entries.sort((a, b) => b.concentration - a.concentration); this.cells.set(cellId, entries.slice(0, this.limitPerCell));
    if (this.cells.size > this.maximumCells) this.cells.delete(this.cells.keys().next().value);
  }
  advance({ cellFor, neighboursFor, windAt, sources = [], elapsedHours = 1 } = {}) {
    const next = new AirborneScentField({ maximumCells: this.maximumCells, limitPerCell: this.limitPerCell }), elapsed = Math.max(0, Number(elapsedHours) || 0);
    for (const [cellId, entries] of this.cells) {
      const cell = cellFor?.(cellId); if (!cell) continue; const wind = windAt(cell), neighbours = neighboursFor?.(cell) || [];
      const downwind = neighbours.slice().sort((left, right) => ((right.x - cell.x) * wind.directionX + (right.z - cell.z) * wind.directionZ) - ((left.x - cell.x) * wind.directionX + (left.z - cell.z) * wind.directionZ))[0];
      for (const packet of entries) {
        const surviving = packet.concentration * Math.exp(-(.18 + wind.speed * .07) * elapsed), advected = surviving * clamp(.18 + wind.speed * .3, .12, .62);
        next.deposit(cellId, { ...packet, concentration: surviving - advected, ageHours: (packet.ageHours || 0) + elapsed, windX: wind.x, windZ: wind.z });
        if (downwind) next.deposit(downwind.id, { ...packet, concentration: advected, ageHours: (packet.ageHours || 0) + elapsed, windX: wind.x, windZ: wind.z });
      }
    }
    for (const source of sources) if (source.cellId != null && source.sourceId && source.guild) next.deposit(source.cellId, { sourceId: source.sourceId, speciesId: source.speciesId || null, guild: source.guild, concentration: clamp(source.strength ?? .7, .02, 2), ageHours: 0 });
    this.cells = next.cells; return this;
  }
  observe(cell, observer, { tick = 0, guild, neighbours = [] } = {}) {
    if (!cell) return null; const samples = [{ cell, weight: 1 }, ...neighbours.map(item => ({ cell: item, weight: .62 }))], candidates = [];
    for (const sample of samples) for (const packet of this.cells.get(sample.cell.id) || []) if (!guild || packet.guild === guild) {
      const intermittent = deterministicIntermittency({ sourceId: packet.sourceId, observerId: observer.id, cellId: sample.cell.id, tick, concentration: packet.concentration * sample.weight, turbulence: Math.hypot(packet.windX || 0, packet.windZ || 0) });
      if (intermittent.available) candidates.push({ packet, sample, intermittent });
    }
    if (!candidates.length) return null; candidates.sort((a, b) => b.intermittent.availability - a.intermittent.availability); const best = candidates[0], wind = unit(best.packet.windX || 1, best.packet.windZ || 0), confidence = clamp(best.intermittent.availability / 1.4);
    return Object.freeze({ channel: "smell", type: best.packet.guild === "hunter" ? "predator" : "preyTrail", x: observer.x, z: observer.z, confidence, uncertainty: 1 + (1 - confidence) * 4, age: best.packet.ageHours || 0, airborne: true, plumeCellId: best.sample.cell.id, upwindX: -wind.x, upwindZ: -wind.z, intermittency: best.intermittent, sourceSpeciesId: confidence >= .68 ? best.packet.speciesId : null, informationBoundary: "airborne-plume-at-observer" });
  }
  snapshot() { return Object.freeze({ schemaVersion: AIRBORNE_SCENT_SCHEMA, cells: Object.fromEntries([...this.cells].map(([key, entries]) => [key, entries.map(item => ({ ...item }))])) }); }
  static fromSnapshot(snapshot = {}) { const field = new AirborneScentField(); const cells = snapshot.cells || snapshot; for (const [key, entries] of Object.entries(cells || {})) if (Array.isArray(entries)) field.cells.set(Number.isNaN(Number(key)) ? key : Number(key), entries.map(item => ({ ...item }))); return field; }
}

export function castingDestination(observer = {}, wind = {}, { tick = 0, lastDetectionTick = -Infinity, distance = 2.5 } = {}) {
  const direction = unit(wind.x || wind.directionX || 1, wind.z || wind.directionZ || 0), castIndex = Math.floor(Math.max(0, Number(tick) - Number(lastDetectionTick || 0)) / 2), side = (castIndex + Math.floor(hash01(observer.id || "observer") * 2)) % 2 ? -1 : 1;
  return Object.freeze({ x: observer.x - direction.x * distance * .28 - direction.z * distance * side, z: observer.z - direction.z * distance * .28 + direction.x * distance * side, side, mode: "crosswind-cast", informationBoundary: "observer-wind-and-scent-history-only" });
}

/** Advances the persistent ground-contact scent field. */
export function updateScentField({ activeScent, animals, elapsed = 1, wind = 0, cellAt, cellKey, scentGuild }) {
  const windLoss = Math.pow(.5, elapsed / 18) * Math.pow(1 - wind * .08, elapsed);
  for (const key of Object.keys(activeScent)) {
    const [x, z] = key.split(",").map(Number), cell = cellAt(x, z);
    if (!cell?.scent) { delete activeScent[key]; continue; }
    cell.scent.grazer *= windLoss; cell.scent.hunter *= windLoss;
    if (Math.max(cell.scent.grazer, cell.scent.hunter) < .04) { cell.scent = null; delete activeScent[key]; }
  }
  for (const animal of animals) {
    if (!animal.alive) continue; const cell = cellAt(animal.x, animal.z); if (!cell) continue;
    if (!cell.scent) cell.scent = { grazer: 0, hunter: 0 }; const guild = scentGuild(animal);
    cell.scent[guild] = clamp((cell.scent[guild] || 0) + .7 * elapsed, 0, 5); activeScent[cellKey(cell)] = 1;
  }
  return activeScent;
}
