const clamp = (value, minimum = 0, maximum = 1) => Math.max(minimum, Math.min(maximum, Number(value) || 0));
const profile = (label, comfortableSlope, maximumSlope, strengthDemand, rockPassable = false, verticalClimber = false) => Object.freeze({ label, comfortableSlope, maximumSlope, strengthDemand, rockPassable, verticalClimber });

// Slope is the simulation's normalised local grade: 0 is level and 1 is the
// steepest resolved face. These limits describe usable ground, not speed.
export const TERRAIN_MOBILITY = Object.freeze({
  grazer: profile("sure-footed deer travel", .22, .58, .85),
  hunter: profile("wolf-like rough-ground travel", .30, .72, .9, true),
  "meadow-nibbler": profile("short hopping ascent", .25, .55, .8),
  "great-plains-grazer": profile("heavy plains travel", .16, .42, 1.15),
  "woodland-browser": profile("long-legged woodland ascent", .20, .52, 1),
  "brush-fox": profile("light-footed slope travel", .30, .68, .78, true),
  "shadow-stalker": profile("feline rock scrambling", .40, .84, .72, true),
  "great-omnivore": profile("powerful bear ascent", .28, .65, 1.05, true),
  "dryland-runner": profile("open-ground ascent", .18, .48, .95),
  "highland-grazer": profile("near-vertical ibex climbing", .62, 1, .58, true, true),
  "armoured-browser": profile("heavy low-slope travel", .13, .32, 1.35),
  "pack-breaker": profile("endurance slope travel", .25, .58, .9),
  "carrion-runner": profile("grounded bird scrambling", .28, .62, .7, true),
  "waterline-grazer": profile("low-bodied bank ascent", .18, .42, .9),
  "brush-nibbler": profile("bounding ascent", .27, .58, .72),
  "waterline-ambusher": profile("low crocodilian bank crawl", .10, .28, 1.2),
  "northern-shaggy-grazer": profile("compact arctic ascent", .20, .52, 1.05, true),
  "highland-prowler": profile("near-vertical mountain-cat climbing", .58, .98, .6, true, true),
  "little-opportunist": profile("dexterous scrambling", .36, .78, .7, true),
  "cold-country-scavenger": profile("grounded alpine scrambling", .38, .82, .68, true),
  "sunscale-ambusher": profile("flexible rock crawling", .34, .72, .62, true),
  "shieldback-colony": profile("slow low-grade shell travel", .10, .30, 1.25),
  "wild-boar": profile("forceful rough-ground ascent", .25, .60, 1.05),
  "african-elephant": profile("mass-limited gentle ascent", .12, .28, 1.5),
  dromedary: profile("sand-adapted gentle ascent", .18, .44, 1.05),
  "common-ostrich": profile("long-legged open-slope travel", .14, .40, 1.05)
});

const generic = profile("ordinary slope travel", .2, .5, 1);
const AERIAL_SPECIES = new Set(["carrion-runner", "cold-country-scavenger"]);
const WATER_DEPTH_LIMIT = Object.freeze({ "waterline-grazer": 1.4, "waterline-ambusher": Infinity });

export function terrainMobilityFor(subject) {
  const id = typeof subject === "string" ? subject : subject?.speciesId;
  return TERRAIN_MOBILITY[id] || generic;
}

export function mobilityStrengthIndex(subject = {}) {
  if (typeof subject === "string") return .78;
  const leanMass = Math.max(.5, Number(subject.leanMass) || Number(subject.bodyMass) * .8 || 1);
  const muscleRatio = clamp((Number(subject.muscleMass) || leanMass * .55) / leanMass, .2, .8);
  const muscle = clamp((muscleRatio - .34) / .34);
  const health = clamp((subject.health ?? 100) / 100, .15, 1);
  const fatigue = clamp(1 - (subject.fatigue || 0) / 135, .25, 1);
  const stage = subject.lifeStage === "dependent" ? .35 : subject.lifeStage === "juvenile" ? .62 : subject.lifeStage === "subadult" ? .82 : subject.lifeStage === "old" ? .72 : 1;
  const injury = (subject.injuries || []).reduce((factor, item) => factor * (1 - clamp(item.severity) * .28), 1);
  const pregnancy = subject.pregnant ? .86 : 1;
  return clamp((.32 + muscle * .68) * Math.sqrt(health) * fatigue * stage * injury * pregnancy, .08, 1);
}

export function terrainMobilityAssessment(subject, cell = {}) {
  const id = typeof subject === "string" ? subject : subject?.speciesId, mobility = terrainMobilityFor(subject), strength = mobilityStrengthIndex(subject), slope = clamp(cell.slope), waterDepth = Math.max(0, Number(cell.waterDepth) || 0), aerial = AERIAL_SPECIES.has(id), waterLimit = WATER_DEPTH_LIMIT[id] ?? .32, swimming = !aerial && waterDepth > .32 && waterDepth <= waterLimit;
  const effectiveMaximum = mobility.comfortableSlope + (mobility.maximumSlope - mobility.comfortableSlope) * strength;
  const beyondComfort = Math.max(0, slope - mobility.comfortableSlope);
  const range = Math.max(.01, mobility.maximumSlope - mobility.comfortableSlope);
  const demand = clamp(beyondComfort / range);
  const rockBlocked = !aerial && Boolean(cell.rocky) && !mobility.rockPassable, waterBlocked = !aerial && waterDepth > waterLimit;
  const allowed = aerial || (!rockBlocked && !waterBlocked && slope <= effectiveMaximum + 1e-9);
  const energyMultiplier = aerial ? 1.18 : swimming ? 1.38 : 1 + Math.pow(demand, 1.35) * mobility.strengthDemand * 1.8;
  const speedMultiplier = aerial ? 1.08 : swimming ? (id === "waterline-ambusher" ? .78 : .72) : clamp(1 / (1 + Math.pow(demand, 1.2) * (1.05 + mobility.strengthDemand * .45)), .24, 1);
  const reason = aerial ? "low flight" : waterBlocked ? "water exceeds this species' swimming depth" : swimming ? "swimming" : rockBlocked ? "species cannot use exposed rock" : slope > effectiveMaximum ? "slope exceeds current strength" : demand > .65 ? "demanding climb" : demand > 0 ? "moderate climb" : "comfortable grade";
  return Object.freeze({ ...mobility, slope, strength, effectiveMaximum, demand, allowed, energyMultiplier, speedMultiplier, reason, medium: aerial ? "flight" : swimming ? "swim" : "ground", waterDepth, waterLimit });
}

export function terrainMobilitySummary(subject) {
  const mobility = terrainMobilityFor(subject);
  return `${mobility.label}; comfortable to ${Math.round(mobility.comfortableSlope * 100)}% grade; structural maximum ${Math.round(mobility.maximumSlope * 100)}%${mobility.verticalClimber ? " (near-vertical specialist)" : ""}; ${mobility.rockPassable ? "can use exposed rock" : "avoids exposed rock"}`;
}
