const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const BIRDS = new Set(["carrion-runner", "cold-country-scavenger", "common-ostrich"]);
const REPTILES = new Set(["waterline-ambusher", "sunscale-ambusher", "shieldback-colony"]);
const stableNumber = value => { let hash = 2166136261; for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); } return hash >>> 0; };
const scheduled = (id, hour, interval, salt) => (Math.floor(hour) + stableNumber(`${id}:${salt}`)) % interval === 0;

export const ENVIRONMENTAL_HISTORY_SCHEMA = 2;
export const HISTORY_TRACE_KINDS = Object.freeze(["urine", "dung", "hair", "feather", "shed-antler", "bone", "bedding-site", "rubbing-site", "carcass-fragment"]);

function baseRecord(animal, cell, hour, kind, intensity, decayPerHour, extras = {}) {
  return Object.freeze({ schemaVersion: ENVIRONMENTAL_HISTORY_SCHEMA, kind, cellId: cell.id, sourceId: animal.id, speciesId: animal.speciesId, x: animal.x, z: animal.z, depositedEcologicalHour: hour, ageHours: 0, intensity: clamp(intensity), decayPerHour, substrate: cell.water ? "water" : cell.substrate || (cell.woodland || cell.shrubland ? "vegetation" : "soil"), evidenceGrade: "composite-model", ...extras });
}

export function biologicalHistoryDeposits(animal = {}, cell = {}, ecologicalHour = 0) {
  if (!animal.alive || cell.id == null) return Object.freeze([]);
  const records = [], mass = Math.max(.2, Number(animal.bodyMass || 20)), scale = clamp(Math.log1p(mass) / 7, .16, 1), bird = BIRDS.has(animal.speciesId), reptile = REPTILES.has(animal.speciesId);
  const urineInterval = reptile ? 18 : bird ? 8 : animal.speciesId === "african-elephant" ? 7 : 6;
  const dungInterval = reptile ? 28 : bird ? 6 : animal.speciesId === "african-elephant" ? 14 : 8;
  const reproductiveState = animal.pregnant ? "pregnant" : animal.reproductiveState?.phase || animal.reproductiveStatus || "unspecified";
  if (scheduled(animal.id, ecologicalHour, urineInterval, "urine")) records.push(baseRecord(animal, cell, ecologicalHour, "urine", .32 + scale * .55, .055, { chemicalEvidence: true, socialChemicalEvidence: true, sexClass: animal.sex || null, reproductiveState, moistureAtDeposit: cell.surfaceMoisture ?? cell.moisture ?? 0 }));
  if (scheduled(animal.id, ecologicalHour, dungInterval, "dung")) records.push(baseRecord(animal, cell, ecologicalHour, "dung", .42 + scale * .55, .0065, { chemicalEvidence: true, dietaryEvidence: true, nutrientValue: clamp(.3 + scale * .45), depositMassClass: scale < .35 ? "small" : scale > .72 ? "large" : "medium" }));
  if (bird) {
    if (scheduled(animal.id, ecologicalHour, 72, "feather")) records.push(baseRecord(animal, cell, ecologicalHour, "feather", .3 + scale * .3, .0018, { structureEvidence: true }));
  } else if (!reptile && scheduled(animal.id, ecologicalHour, 96, "hair")) records.push(baseRecord(animal, cell, ecologicalHour, "hair", .22 + scale * .26, .0028, { structureEvidence: true }));
  const annualHour = 24 * 365;
  if (["woodland-browser", "valley-grazer-updated"].includes(animal.speciesId) && animal.sex === "M" && !["dependent", "juvenile"].includes(animal.lifeStage) && scheduled(animal.id, ecologicalHour, annualHour, "antler-shed")) records.push(baseRecord(animal, cell, ecologicalHour, "shed-antler", .95, .00008, { structureEvidence: true, annualShed: true }));
  if (["rest", "sleep", "deep-rest"].includes(animal.actionState?.key) && scheduled(animal.id, ecologicalHour, 18, "bedding")) records.push(baseRecord(animal, cell, ecologicalHour, "bedding-site", .35 + scale * .42, .008, { structureEvidence: true, chemicalEvidence: true, bodySizeClass: scale < .35 ? "small" : scale > .72 ? "large" : "medium" }));
  if (["rub", "scratch", "groom"].includes(animal.actionState?.key) && scheduled(animal.id, ecologicalHour, 8, "rubbing")) records.push(baseRecord(animal, cell, ecologicalHour, "rubbing-site", .4 + scale * .44, .012, { structureEvidence: true, chemicalEvidence: true, snaggedMaterial: bird ? "feather" : reptile ? "scale-fragment" : "hair" }));
  return Object.freeze(records);
}

export function boneHistoryDeposit(corpse = {}, cell = {}, ecologicalHour = 0) {
  if (cell.id == null || !corpse.eaten || corpse.historyBoneDeposited) return null;
  return Object.freeze({ schemaVersion: ENVIRONMENTAL_HISTORY_SCHEMA, kind: "bone", cellId: cell.id, sourceId: corpse.id, speciesId: corpse.speciesId, x: corpse.x, z: corpse.z, depositedEcologicalHour: ecologicalHour, ageHours: 0, intensity: 1, decayPerHour: .00002, substrate: cell.water ? "water" : cell.substrate || "soil", structureEvidence: true, cause: corpse.cause || null, evidenceGrade: "observed-exact-entity" });
}

export function carcassFragmentHistoryDeposit(corpse = {}, cell = {}, ecologicalHour = 0) {
  if (cell.id == null || !corpse.eaten || corpse.historyFragmentDeposited) return null;
  return Object.freeze({ schemaVersion: ENVIRONMENTAL_HISTORY_SCHEMA, kind: "carcass-fragment", cellId: cell.id, sourceId: corpse.id, speciesId: corpse.speciesId, x: corpse.x, z: corpse.z, depositedEcologicalHour: ecologicalHour, ageHours: 0, intensity: clamp(.35 + Number(corpse.biomass || 0) / 40), decayPerHour: .003, substrate: cell.water ? "water" : cell.substrate || "soil", structureEvidence: true, chemicalEvidence: true, cause: corpse.cause || null, evidenceGrade: "observed-exact-entity" });
}

export function environmentalHistorySummary(traceField = {}, { hotspotLimit = 8 } = {}) {
  const records = Object.entries(traceField || {}).flatMap(([cellId, entries]) => (entries || []).filter(record => HISTORY_TRACE_KINDS.includes(record.kind)).map(record => ({ ...record, cellId: record.cellId ?? cellId })));
  const periods = { "last-day": 0, "last-week": 0, "last-season": 0, "last-year": 0, older: 0 }, kinds = Object.fromEntries(HISTORY_TRACE_KINDS.map(kind => [kind, 0])), cells = new Map();
  for (const record of records) {
    const age = Math.max(0, Number(record.ageHours || 0));
    periods[age <= 24 ? "last-day" : age <= 168 ? "last-week" : age <= 24 * 91 ? "last-season" : age <= 24 * 365 ? "last-year" : "older"] += 1;
    kinds[record.kind] += 1;
    const aggregate = cells.get(record.cellId) || { cellId: record.cellId, count: 0, intensity: 0, oldestHours: 0, kinds: new Set() };
    aggregate.count += 1; aggregate.intensity += Number(record.intensity || 0); aggregate.oldestHours = Math.max(aggregate.oldestHours, age); aggregate.kinds.add(record.kind); cells.set(record.cellId, aggregate);
  }
  const hotspots = [...cells.values()].sort((a, b) => b.intensity - a.intensity || String(a.cellId).localeCompare(String(b.cellId))).slice(0, hotspotLimit).map(item => Object.freeze({ ...item, kinds: Object.freeze([...item.kinds].sort()) }));
  return Object.freeze({ schemaVersion: ENVIRONMENTAL_HISTORY_SCHEMA, recordCount: records.length, periods: Object.freeze(periods), kinds: Object.freeze(kinds), hotspots: Object.freeze(hotspots), informationBoundary: "laboratory-authoritative-history-only" });
}
