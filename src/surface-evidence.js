const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));

export const SURFACE_STATE_SCHEMA = 1;

const RETENTION = Object.freeze({ rock: .08, sand: .22, snow: .92, mud: .9, peat: .88, clay: .78, loam: .62, soil: .55, vegetation: .67, water: 1 });

export function surfaceSubstrate(cell = {}) {
  if (cell.water || Number(cell.waterDepth || 0) > .08) return "water";
  if (Number(cell.snowPack || 0) > .08) return "snow";
  if (cell.rocky || ["rock", "alpineRock"].includes(cell.landCover)) return "rock";
  if (cell.sandy || cell.substrate === "sand") return "sand";
  const moisture = clamp(cell.surfaceMoisture ?? cell.moisture);
  if (cell.wetland || moisture >= .78) return "mud";
  if ((cell.grassHeight || 0) > .18 || cell.woodland || cell.shrubland) return "vegetation";
  return cell.substrate === "clay" || cell.substrate === "peat" || cell.substrate === "loam" ? cell.substrate : "soil";
}

export function migrateSurfaceState(cell = {}) {
  if (!Number.isFinite(Number(cell.surfaceMoisture))) cell.surfaceMoisture = clamp((cell.moisture || 0) * .72 + (cell.wetland ? .2 : 0) + (cell.water ? .3 : 0));
  cell.surfaceStateSchema = SURFACE_STATE_SCHEMA;
  return cell;
}

export function advanceSurfaceMoisture(cell = {}, weather = {}, elapsedHours = 1) {
  migrateSurfaceState(cell);
  const elapsed = Math.max(0, Number(elapsedHours) || 0), substrate = surfaceSubstrate(cell), retention = RETENTION[substrate] ?? RETENTION.soil;
  const precipitation = clamp(weather.rain) * (.34 + retention * .66), flooding = clamp((cell.surfaceWater || 0) + (cell.runoff || 0) * .18 + (cell.waterDepth || 0) * .4);
  const drainage = (1 - retention) * (.018 + clamp(cell.slope) * .055), evaporation = Math.max(0, Number(weather.temp ?? cell.temperature ?? 15) - 2) / 38 * (.012 + clamp(weather.wind, 0, 1.5) * .018) * (1 - clamp(cell.canopyCover || 0) * .45);
  const next = cell.water ? 1 : clamp(cell.surfaceMoisture + (precipitation * .22 + flooding * .12 - drainage - evaporation) * elapsed);
  cell.surfaceMoisture = next;
  cell.surfaceStateSchema = SURFACE_STATE_SCHEMA;
  cell.vegetationDisturbance = clamp((cell.vegetationDisturbance || 0) * Math.exp(-(.035 + clamp(weather.rain) * .025) * elapsed));
  return next;
}

export function applyVegetationDisturbance(cell = {}, record = {}) {
  if (record.kind !== "disturbance") return Number(cell.vegetationDisturbance || 0);
  const vegetation = clamp((cell.grassHeight || 0) * .55 + (cell.shrubland ? .3 : 0) + (cell.woodland ? .12 : 0));
  cell.vegetationDisturbance = clamp(Math.max(Number(cell.vegetationDisturbance || 0), Number(record.intensity || 0) * (.35 + vegetation * .65)));
  cell.lastDisturbedTick = record.tick ?? cell.lastDisturbedTick ?? null;
  return cell.vegetationDisturbance;
}

export function bleedingRate(animal = {}) {
  const injuryBleeding = (animal.injuries || []).reduce((sum, injury) => sum + clamp(injury.bleeding ?? Math.max(0, (injury.severity || 0) - .45) * .55), 0);
  return clamp(injuryBleeding * clamp((110 - Number(animal.health ?? 100)) / 60, .18, 1));
}

export function substrateContact(animal = {}, cell = {}, { distance = 0, gait = "walk", speed = 0 } = {}) {
  const substrate = surfaceSubstrate(cell), moisture = clamp(cell.surfaceMoisture ?? cell.moisture), mass = Math.max(.1, Number(animal.bodyMass || 20));
  const anatomy = animal.speciesId === "grazer" || /bison|moose|ibex|rhino|pronghorn|musk-ox|deer|camel|boar/.test(animal.speciesId || "") ? "hoof" : /bird|pheasant|ostrich|hornbill/.test(animal.speciesId || "") ? "bird-foot" : /crocodile|python|tortoise/.test(animal.speciesId || "") ? "reptile-contact" : "paw";
  const gaitLoad = gait === "sprint" ? 1.65 : ["run", "fast-run", "sustainable-run"].includes(gait) ? 1.35 : gait === "stalk" ? .62 : 1;
  const imprintability = { water: 0, rock: .015, vegetation: .28, soil: .38, loam: .52, clay: .72, peat: .8, sand: .68, mud: .96, snow: .92 }[substrate] ?? .35;
  const strideLength = clamp(Math.sqrt(mass) * .075 * (gaitLoad > 1 ? 1.35 : 1), .16, 1.7);
  const pressure = clamp(Math.log1p(mass) / 7 * gaitLoad + speed * .08);
  return Object.freeze({ anatomy, substrate, moisture, gait, strideLength, contactCount: distance > 0 ? Math.max(1, Math.floor(distance / strideLength) + 1) : 0, pressure, footprintStrength: clamp(imprintability * (.34 + pressure * .76) * (.55 + moisture * .65)), scentTransfer: clamp((.14 + moisture * .48 + retentionFor(substrate) * .18) * (.65 + pressure * .35)), disturbanceStrength: clamp((substrate === "vegetation" ? .38 : .08) * gaitLoad + speed * .06) });
}

const retentionFor = substrate => RETENTION[substrate] ?? RETENTION.soil;

export function movementEvidence(animal = {}, from = {}, to = {}, cellAt, context = {}) {
  const distance = Math.hypot(Number(to.x) - Number(from.x), Number(to.z) - Number(from.z));
  if (!cellAt || distance < .001) return Object.freeze([]);
  const midpointCell = cellAt((Number(from.x) + Number(to.x)) / 2, (Number(from.z) + Number(to.z)) / 2) || cellAt(to.x, to.z);
  if (!midpointCell) return Object.freeze([]);
  const contact = substrateContact(animal, midpointCell, { ...context, distance }), fromCell = cellAt(from.x, from.z), toCell = cellAt(to.x, to.z), fromWater = surfaceSubstrate(fromCell) === "water", toWater = surfaceSubstrate(toCell) === "water", bleed = bleedingRate(animal), carriedWater = clamp(context.carriedWater || 0);
  const records = [], count = Math.min(24, contact.contactCount);
  for (let index = 1; index <= count; index += 1) {
    const amount = index / count, x = Number(from.x) + (Number(to.x) - Number(from.x)) * amount, z = Number(from.z) + (Number(to.z) - Number(from.z)) * amount, cell = cellAt(x, z);
    if (!cell) continue;
    const local = substrateContact(animal, cell, { ...context, distance: contact.strideLength });
    if (local.footprintStrength > .035) records.push(Object.freeze({ kind: "footprint", cellId: cell.id, sourceId: animal.id, speciesId: animal.speciesId, x, z, intensity: clamp(local.footprintStrength + carriedWater * .12), ageHours: 0, decayPerHour: .025 + (1 - retentionFor(local.substrate)) * .11, substrate: local.substrate, anatomy: local.anatomy, gait: local.gait, heading: Math.atan2(Number(to.z) - Number(from.z), Number(to.x) - Number(from.x)), contactIndex: index, wetTransfer: local.substrate !== "water" ? carriedWater : 0 }));
    if (local.substrate !== "water") records.push(Object.freeze({ kind: "ground-scent", cellId: cell.id, sourceId: animal.id, speciesId: animal.speciesId, x, z, intensity: local.scentTransfer * (1 - carriedWater * .42), ageHours: 0, decayPerHour: .045 + (1 - retentionFor(local.substrate)) * .08, substrate: local.substrate }));
    if (local.disturbanceStrength > .12) records.push(Object.freeze({ kind: "disturbance", cellId: cell.id, sourceId: animal.id, speciesId: animal.speciesId, x, z, intensity: local.disturbanceStrength, ageHours: 0, decayPerHour: .08, substrate: local.substrate }));
    if (bleed > .015) records.push(Object.freeze({ kind: local.substrate === "water" ? "blood-in-water" : "blood", cellId: cell.id, sourceId: animal.id, speciesId: animal.speciesId, x, z, intensity: clamp(bleed * (.45 + local.pressure * .5)), ageHours: 0, decayPerHour: local.substrate === "water" ? .7 : .09, substrate: local.substrate, injuryEvidence: true }));
  }
  if (!fromWater && toWater) records.push(Object.freeze({ kind: "water-entry", cellId: toCell.id, sourceId: animal.id, speciesId: animal.speciesId, x: to.x, z: to.z, intensity: clamp(.25 + contact.pressure * .65), ageHours: 0, decayPerHour: 1.2, substrate: "water" }));
  if (fromWater && !toWater) records.push(Object.freeze({ kind: "water-exit", cellId: toCell.id, sourceId: animal.id, speciesId: animal.speciesId, x: to.x, z: to.z, intensity: clamp(.2 + contact.pressure * .45), ageHours: 0, decayPerHour: .8, substrate: surfaceSubstrate(toCell) }));
  if (fromWater && toWater) records.push(Object.freeze({ kind: "water-wake", cellId: toCell.id, sourceId: animal.id, speciesId: animal.speciesId, x: to.x, z: to.z, intensity: clamp(context.speed * .3 + contact.pressure * .35), ageHours: 0, decayPerHour: 2.2, substrate: "water" }));
  return Object.freeze(records);
}
