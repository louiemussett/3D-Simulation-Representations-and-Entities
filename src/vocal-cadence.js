const dangerKinds = new Set(["alarm", "threat", "attacked"]);
const silentNeedKinds = new Set(["water", "water-report", "hunger", "food-report", "heat", "cold"]);
const wolfSpecies = new Set(["hunter", "ridge-hunter-updated"]);

const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, value));
function stableUnit(value = "") { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return (hash >>> 0) / 4294967295; }

export function isWolfVocalModel(animal) { return wolfSpecies.has(animal?.speciesId); }

// Opportunities for a settled pack, not compulsory calls. The additional
// winter opportunity represents the documented pre-breeding/breeding increase.
export function wolfPackHowlWindow(ecologicalMinute = 0, season = "Spring") {
  const day = Math.floor(Math.max(0, ecologicalMinute) / 1440), minute = ((ecologicalMinute % 1440) + 1440) % 1440;
  const windows = [
    { id: "dawn", start: 300, end: 480 },
    { id: "dusk", start: 1020, end: 1200 },
    ...(season === "Winter" ? [{ id: "winter-spacing", start: 720, end: 840 }] : [])
  ];
  const window = windows.find(item => minute >= item.start && minute < item.end);
  return window ? { ...window, day, sessionId: `wolf-pack:${day}:${window.id}` } : null;
}

export function vocalTraitProfile(animal = {}) {
  const aggression = clamp(Number(animal.aggression ?? .5)), care = clamp(Number(animal.careAffinity ?? .5)), fear = clamp(Number(animal.fear ?? 0) / 100);
  return { aggression, care, fear, propensity: stableUnit(`${animal.id || animal.speciesId || "animal"}:vocal-propensity`) };
}

export function socialCueCompatibility(sender = {}, listener = {}, kind = "contact") {
  const source = vocalTraitProfile(sender), receiver = vocalTraitProfile(listener), memory = listener.socialMemory?.[sender.id] || {};
  const affinity = clamp((Number(memory.affinity ?? 0) + 1) / 2), aggressionMatch = 1 - Math.abs(source.aggression - receiver.aggression), careMatch = 1 - Math.abs(source.care - receiver.care);
  let response = .2 + affinity * .22;
  if (["attacked", "alarm", "threat"].includes(kind)) response = Math.max(.68, .54 + receiver.fear * .22 + receiver.aggression * .12);
  else if (["care", "wait-up", "lost"].includes(kind)) response += receiver.care * .34 + careMatch * .16;
  else if (kind === "contact") response += receiver.care * .2 + aggressionMatch * .2 + (sender.groupId && sender.groupId === listener.groupId ? .18 : 0);
  else if (kind === "courtship") response += aggressionMatch * .25 + careMatch * .12 + affinity * .16;
  return { score: clamp(response), affinity, aggressionMatch, careMatch, interpretation: response >= .66 ? "engage" : response >= .4 ? "attend" : "disregard" };
}

function traitAdjustedProbability(animal, signal, base) {
  if (base <= 0) return 0;
  const traits = vocalTraitProfile(animal), kind = signal.kind;
  let adjustment = (traits.propensity - .5) * .26;
  if (["threat", "attacked"].includes(kind)) adjustment += (traits.aggression - .5) * .24 + traits.fear * .1;
  else if (kind === "alarm") adjustment += traits.fear * .2 - traits.aggression * .06;
  else if (["care", "wait-up", "lost", "contact"].includes(kind)) adjustment += (traits.care - .5) * .22;
  else if (kind === "courtship") adjustment += (traits.aggression - .5) * .1 + (traits.propensity - .5) * .12;
  return clamp(base + adjustment, .01, .98);
}

function stateFor(animal) {
  animal.vocalCadence ||= { schemaVersion: 1, consideredEpisodeKey: null, lastCallTick: -Infinity, quietSinceTick: null, callsByKind: {} };
  return animal.vocalCadence;
}

function contextKey(animal, signal, tick) {
  if (signal.kind === "contact" && signal.packHowlSession) return `pack-howl:${signal.sessionId}`;
  const target = signal.predatorId || signal.attackerId || signal.targetId || signal.inferredTargetId || "local";
  if (dangerKinds.has(signal.kind)) return `danger:${target}`;
  if (signal.kind === "care") return `care:${signal.caregiverId || "caregiver"}:${Math.floor(tick / 18)}`;
  if (signal.kind === "wait-up" || signal.kind === "lost") return `${signal.kind}:${signal.leaderId || "group"}:${Math.floor(tick / 24)}`;
  if (signal.kind === "courtship") return `courtship:${signal.targetId || animal.rutContest?.rivalId || "local"}:${Math.floor(tick / 20)}`;
  return `${signal.kind}:${target}:${Math.floor(tick / 30)}`;
}

export function releaseVocalEpisode(animal, tick, releaseTicks = 8) {
  const state = stateFor(animal);
  state.quietSinceTick ??= tick;
  if (tick - state.quietSinceTick >= releaseTicks) state.consideredEpisodeKey = null;
  return state;
}

export function evaluateVocalCadence(animal, signal, { tick = 0, roll = 0.5 } = {}) {
  const state = stateFor(animal);
  if (!signal?.kind) return { allow: false, reason: "no outward signal" };
  if (!dangerKinds.has(signal.kind) && String(state.consideredEpisodeKey || "").startsWith("danger:")) state.consideredEpisodeKey = null;
  state.quietSinceTick = null;
  if (silentNeedKinds.has(signal.kind)) return { allow: false, reason: "need is expressed non-vocally unless a species repertoire defines a dedicated report event" };
  const key = contextKey(animal, signal, tick);
  if (state.consideredEpisodeKey === key) return { allow: false, reason: "this vocal episode has already been considered" };
  const dependent = animal.lifeStage === "dependent", deer = ["grazer", "valley-grazer-updated"].includes(animal.speciesId), wolf = isWolfVocalModel(animal);
  let probability = 0, cooldownTicks = 24, vocalTicks = 1;
  if (signal.kind === "care" && dependent) { probability = signal.caregiverVisible ? .22 : .58; cooldownTicks = 18; vocalTicks = 2; }
  else if (signal.kind === "attacked") { probability = dependent ? .72 : .42; cooldownTicks = 30; }
  else if (["threat", "alarm"].includes(signal.kind) && Number(signal.urgency || 0) >= 72) { probability = deer ? .48 : dependent ? .55 : .28; cooldownTicks = 36; }
  else if (["injury", "distress"].includes(signal.kind)) { probability = dependent ? .28 : .06; cooldownTicks = 30; }
  else if (signal.kind === "wait-up") { probability = dependent ? .42 : .16; cooldownTicks = 24; }
  else if (signal.kind === "lost") { probability = dependent ? .4 : .12; cooldownTicks = 30; }
  else if (signal.kind === "contact" && wolf && signal.packHowlSession) {
    probability = signal.howlRole === "initiator" ? 1 : .68;
    cooldownTicks = 48;
    vocalTicks = 2;
  }
  else if (signal.kind === "courtship") {
    const activeCourtship = Boolean(animal.courtship || animal.mating || animal.rutContest && animal.rutContest.phase !== "resolved");
    probability = activeCourtship && !["dependent", "juvenile"].includes(animal.lifeStage) ? (deer ? .32 : .18) : 0;
    cooldownTicks = 20;
  }
  probability = traitAdjustedProbability(animal, signal, probability);
  state.consideredEpisodeKey = key;
  if (tick < Number(animal.vocalCooldownUntil || 0)) return { allow: false, reason: "minimum inter-bout interval remains active", cooldownTicks };
  if (!(roll < probability)) return { allow: false, reason: "eligible context remained silent after individual-trait modulation", cooldownTicks, probability };
  state.lastCallTick = tick; state.callsByKind[signal.kind] = (state.callsByKind[signal.kind] || 0) + 1;
  return { allow: true, reason: "context-specific vocal bout admitted using the individual's bounded vocal disposition", cooldownTicks, vocalTicks, episodeKey: key, probability };
}
