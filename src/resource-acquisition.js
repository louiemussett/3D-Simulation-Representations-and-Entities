const RESOURCE_TYPES = ["water", "food", "carcass"];
const RESOURCE_TYPE_ALIASES = Object.freeze({ plant: "food", forage: "food", vegetation: "food", meat: "carcass", carrion: "carcass" });

export function resourceAcquisitionType(type) {
  const normalized = String(type || "").trim().toLowerCase();
  return RESOURCE_TYPES.includes(normalized) ? normalized : RESOURCE_TYPE_ALIASES[normalized] || null;
}

function acquisitionState(value) {
  const state = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  for (const [key, fallback] of Object.entries({ failures: 0, resolved: 0, contacts: 0, suppressed: 0, longMemoryBlockedUntil: 0 })) {
    if (!Number.isFinite(Number(state[key]))) state[key] = fallback;
    else state[key] = Math.max(0, Number(state[key]));
  }
  return state;
}

export function migrateResourceAcquisition(animal) {
  if (!animal || typeof animal !== "object") throw new TypeError("A valid animal is required for resource-acquisition migration");
  if (!animal.resourceAcquisition || typeof animal.resourceAcquisition !== "object" || Array.isArray(animal.resourceAcquisition)) animal.resourceAcquisition = {};
  for (const type of RESOURCE_TYPES) animal.resourceAcquisition[type] = acquisitionState(animal.resourceAcquisition[type]);
  return animal;
}

export function resourceMemoryKey(memory) {
  if (memory?.targetId) return `${memory.type}:${memory.targetId}`;
  return `${memory?.type || "resource"}:${Number(memory?.x || 0).toFixed(2)},${Number(memory?.z || 0).toFixed(2)}`;
}

export function resourceMemoryEligible(memory, tick) {
  return Boolean(memory && Number.isFinite(memory.x) && Number.isFinite(memory.z) && (memory.confidence ?? 0) > .08 && (memory.disprovenUntil || 0) <= tick);
}

export function resourceSearchRadius(memory) {
  if (memory?.exact) return .75;
  if (Number.isFinite(memory?.uncertainty)) return Math.max(1.25, memory.uncertainty + 1.25);
  if (memory?.mapRegion) return Math.max(3.5, memory.mapRegion * .75);
  return memory?.startingMemory ? 6.25 : 2.5;
}

export function failResourceMemory(animal, memory, tick, { cooldown = 12, confidenceMultiplier = .35 } = {}) {
  migrateResourceAcquisition(animal);
  if (!memory || typeof memory !== "object") return null;
  memory.failedAttempts = (memory.failedAttempts || 0) + 1;
  memory.lastDisprovenTick = tick;
  memory.disprovenUntil = tick + cooldown * Math.min(4, memory.failedAttempts);
  memory.confidence = Math.max(.02, (memory.confidence ?? .5) * confidenceMultiplier);
  const type = resourceAcquisitionType(memory.type);
  if (!type) { memory.resourceAcquisitionFailureIgnored = true; return memory; }
  const state = animal.resourceAcquisition[type];
  state.failures += 1;
  state.lastFailedKey = resourceMemoryKey(memory);
  state.lastFailureTick = tick;
  state.longMemoryBlockedUntil = Math.max(state.longMemoryBlockedUntil || 0, memory.disprovenUntil);
  return memory;
}

export function confirmResourceMemory(animal, type, tick) {
  migrateResourceAcquisition(animal);
  const normalizedType = resourceAcquisitionType(type); if (!normalizedType) return false;
  const state = animal.resourceAcquisition[normalizedType];
  state.resolved += 1;
  state.lastResolvedTick = tick;
  state.lastFailedKey = null;
  state.longMemoryBlockedUntil = 0;
  return true;
}

export function recordResourceContact(animal, type, tick) {
  migrateResourceAcquisition(animal);
  const normalizedType = resourceAcquisitionType(type); if (!normalizedType) return false;
  const state = animal.resourceAcquisition[normalizedType];
  state.contacts += 1;
  state.lastContactTick = tick;
  return true;
}

export function resourceAcquisitionTotals(animals) {
  const totals = Object.fromEntries(RESOURCE_TYPES.map(type => [type, { failures: 0, resolved: 0, contacts: 0, suppressed: 0 }]));
  for (const animal of animals || []) for (const type of RESOURCE_TYPES) {
    const state = animal.resourceAcquisition?.[type];
    if (!state) continue;
    for (const key of Object.keys(totals[type])) totals[type][key] += state[key] || 0;
  }
  return totals;
}
