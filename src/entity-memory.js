const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const MEDIUM_TERM_MEMORY_HOURS = 30 * 24;
export const ENTITY_MEMORY_HOURS = 100 * 24;
const MEDIUM_TERM_LIMIT = 32;
const ENTITY_KNOWLEDGE_LIMIT = 40;
const MEMORY_COMPACTION_INTERVAL_HOURS = 6;

export function migrateEntityMemory(animal = {}) {
  animal.mediumTermMemory = Array.isArray(animal.mediumTermMemory) ? animal.mediumTermMemory : [];
  animal.entityKnowledge = animal.entityKnowledge && typeof animal.entityKnowledge === "object" ? animal.entityKnowledge : {};
  animal.entityMemoryCompactionHours = Math.max(0, Number(animal.entityMemoryCompactionHours) || 0);
  return animal;
}

export function rememberEntityEpisode(animal, episode = {}, tick = 0) {
  if (!animal || !episode.kind) return null;
  migrateEntityMemory(animal);
  const targetId = episode.targetId || null, confidence = clamp(Number(episode.confidence ?? 1), 0, 1), intensity = clamp(Number(episode.intensity ?? confidence), 0, 1);
  const prior = animal.mediumTermMemory.find((item) => item.kind === episode.kind && item.targetId === targetId);
  const distinctEncounter = !prior || tick - (prior.tick || 0) > 5 || ["attacked-by", "injured-by", "attacked", "escaped-from", "successful-hunt"].includes(episode.kind);
  const memory = { kind: episode.kind, targetId, speciesId: episode.speciesId || prior?.speciesId || null, x: Number.isFinite(episode.x) ? episode.x : prior?.x ?? null, z: Number.isFinite(episode.z) ? episode.z : prior?.z ?? null, outcome: episode.outcome || prior?.outcome || null, damage: (prior?.damage || 0) + Math.max(0, Number(episode.damage) || 0), confidence, intensity: Math.max(prior?.intensity || 0, intensity), tick, age: 0, occurrences: (prior?.occurrences || 0) + (distinctEncounter ? 1 : 0) };
  if (prior) Object.assign(prior, memory); else animal.mediumTermMemory.push(memory);
  if (animal.mediumTermMemory.length > MEDIUM_TERM_LIMIT) {
    animal.mediumTermMemory.sort((a, b) => b.intensity - a.intensity || b.tick - a.tick);
    animal.mediumTermMemory.length = MEDIUM_TERM_LIMIT;
  }
  if (!targetId) return memory;
  const known = animal.entityKnowledge[targetId] || { targetId, speciesId: episode.speciesId || null, encounters: 0, attacksReceived: 0, attacksMade: 0, escapes: 0, threat: 0, opportunity: 0, events: [] };
  known.speciesId ||= episode.speciesId || null; known.encounters += distinctEncounter ? 1 : 0; known.lastInteractionTick = tick; known.age = 0; known.confidence = Math.max(known.confidence || 0, confidence);
  if (Number.isFinite(memory.x) && Number.isFinite(memory.z)) known.lastKnown = { x: memory.x, z: memory.z, tick, confidence };
  if (["attacked-by", "injured-by"].includes(episode.kind)) { known.attacksReceived += 1; known.damageReceived = (known.damageReceived || 0) + memory.damage; known.threat = clamp((known.threat || 0) + .35 + intensity * .45, 0, 1); }
  if (["witnessed-group-attack", "heard-group-attack", "killed-bonded-animal", "communicated-killer"].includes(episode.kind)) known.threat = clamp((known.threat || 0) + .2 + intensity * .42, 0, 1);
  if (episode.kind === "escaped-from") { known.escapes += 1; known.threat = clamp((known.threat || 0) + .18 + intensity * .25, 0, 1); }
  if (["attacked", "successful-hunt"].includes(episode.kind)) { known.attacksMade += 1; known.opportunity = clamp((known.opportunity || 0) + .2 + intensity * .25, 0, 1); }
  if (episode.kind === "spotted-predator") known.threat = clamp(Math.max(known.threat || 0, intensity * .65), 0, 1);
  if (episode.kind === "spotted-prey") known.opportunity = clamp(Math.max(known.opportunity || 0, intensity * .55), 0, 1);
  if (distinctEncounter) known.events.push({ kind: episode.kind, tick, outcome: memory.outcome, damage: Number(episode.damage) || 0 }); known.events = known.events.slice(-12);
  animal.entityKnowledge[targetId] = known;
  const knowledge = Object.values(animal.entityKnowledge);
  if (knowledge.length > ENTITY_KNOWLEDGE_LIMIT) {
    knowledge.sort((a, b) => (b.threat + b.opportunity) - (a.threat + a.opportunity) || b.lastInteractionTick - a.lastInteractionTick);
    animal.entityKnowledge = Object.fromEntries(knowledge.slice(0, ENTITY_KNOWLEDGE_LIMIT).map((item) => [item.targetId, item]));
  }
  return memory;
}

export function ageEntityMemory(animal, elapsedHours = 1) {
  migrateEntityMemory(animal); const hours = Math.max(0, Number(elapsedHours) || 0), persistence = clamp(Number(animal.memoryPersistence) || 1, .45, 1.8), adjustedHours = hours / persistence;
  for (const item of animal.mediumTermMemory) { item.age = (item.age || 0) + hours; item.confidence *= Math.pow(.997, adjustedHours); }
  for (const known of Object.values(animal.entityKnowledge)) { known.age = (known.age || 0) + hours; known.confidence *= Math.pow(.9992, adjustedHours); known.threat *= Math.pow(.9995, adjustedHours); known.opportunity *= Math.pow(.9995, adjustedHours); }
  animal.entityMemoryCompactionHours += hours;
  if (animal.entityMemoryCompactionHours < MEMORY_COMPACTION_INTERVAL_HOURS
    && animal.mediumTermMemory.length <= MEDIUM_TERM_LIMIT
    && Object.keys(animal.entityKnowledge).length <= ENTITY_KNOWLEDGE_LIMIT) return;
  animal.entityMemoryCompactionHours %= MEMORY_COMPACTION_INTERVAL_HOURS;
  let write = 0;
  for (let read = 0; read < animal.mediumTermMemory.length; read += 1) {
    const item = animal.mediumTermMemory[read];
    if (item.age < MEDIUM_TERM_MEMORY_HOURS && item.confidence > .12) animal.mediumTermMemory[write++] = item;
  }
  animal.mediumTermMemory.length = write;
  for (const [targetId, known] of Object.entries(animal.entityKnowledge)) if (known.age >= ENTITY_MEMORY_HOURS || known.confidence <= .1) delete animal.entityKnowledge[targetId];
}

export function rememberedThreat(animal, targetId) { return clamp(animal?.entityKnowledge?.[targetId]?.threat || 0, 0, 1); }
export function rememberedOpportunity(animal, targetId) { return clamp(animal?.entityKnowledge?.[targetId]?.opportunity || 0, 0, 1); }
