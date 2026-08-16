const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const hash = value => { let result = 2166136261; for (const character of String(value)) { result ^= character.charCodeAt(0); result = Math.imul(result, 16777619); } return result >>> 0; };
const unit = (seed, salt) => hash(`${seed}:${salt}`) / 4294967295;

export const ANTLER_SCHEMA = 1;
export const ANTLER_STAGES = Object.freeze(["cast", "velvet-early", "velvet-growing", "velvet-full", "mineralising", "hard", "shedding"]);
export const antlerEligible = animal => animal?.speciesId === "valley-grazer-updated" && animal.sex === "M" && !["dependent", "juvenile"].includes(animal.lifeStage);

function inheritedTraits(animal, worldSeed) {
  const seed = `${worldSeed}:${animal.id}:antler-genes`;
  return Object.freeze({
    beamLength: .88 + unit(seed, "length") * .2,
    beamCurve: .86 + unit(seed, "curve") * .24,
    outwardSpread: .86 + unit(seed, "spread") * .25,
    backwardSweep: .85 + unit(seed, "sweep") * .28,
    baseThickness: .9 + unit(seed, "thickness") * .2,
    tineLength: .86 + unit(seed, "tines") * .25,
    tineCountPotential: 3 + Math.floor(unit(seed, "count") * 3),
    symmetry: .93 + unit(seed, "symmetry") * .065
  });
}

export function antlerAgeFactor(ageDays = 0) {
  const years = Math.max(0, Number(ageDays) || 0) / 365;
  if (years < 1) return .1; if (years < 2) return .35; if (years < 3) return .58;
  if (years < 4) return .78; if (years < 5) return .92; if (years < 7) return 1;
  return Math.max(.7, 1 - (years - 7) * .04);
}

export function antlerStage(calendar = {}) {
  const season = calendar.name || calendar.season || "Spring", day = Math.max(1, Number(calendar.dayOfSeason) || 1), days = Math.max(day, Number(calendar.days) || 91);
  const progress = clamp((day - 1) / Math.max(1, days - 1));
  if (season === "Spring") return progress < .12 ? { stage: "cast", growth: 0, mineralisation: 0 } : progress < .35 ? { stage: "velvet-early", growth: (progress - .12) / .23 * .22, mineralisation: 0 } : { stage: "velvet-growing", growth: .22 + (progress - .35) / .65 * .58, mineralisation: 0 };
  if (season === "Summer") return progress < .45 ? { stage: "velvet-growing", growth: .8 + progress / .45 * .2, mineralisation: 0 } : progress < .7 ? { stage: "velvet-full", growth: 1, mineralisation: (progress - .45) / .25 * .2 } : { stage: "mineralising", growth: 1, mineralisation: .2 + (progress - .7) / .3 * .8 };
  if (season === "Autumn") return { stage: "hard", growth: 1, mineralisation: 1 };
  return progress < .82 ? { stage: "hard", growth: 1, mineralisation: 1 } : progress < .92 ? { stage: "shedding", growth: 1, mineralisation: 1 } : { stage: "cast", growth: 0, mineralisation: 0 };
}

export function migrateAntlerDevelopment(animal = {}, worldSeed = 0) {
  if (!antlerEligible(animal)) { animal.antlers = null; return null; }
  const existing = animal.antlers || {};
  animal.antlers = {
    schemaVersion: ANTLER_SCHEMA,
    genes: existing.genes || inheritedTraits(animal, worldSeed),
    annual: existing.annual || { year: 0, conditionInvestment: 1, growthBudget: 0, leftIntegrity: 1, rightIntegrity: 1, leftNoise: 1, rightNoise: 1 },
    stage: ANTLER_STAGES.includes(existing.stage) ? existing.stage : "cast",
    growth: clamp(existing.growth), mineralisation: clamp(existing.mineralisation), velvet: Boolean(existing.velvet), justShed: false,
    lastUpdatedDay: Math.max(0, Number(existing.lastUpdatedDay) || 0)
  };
  return animal.antlers;
}

export function advanceAntlerDevelopment(animal, { calendar = {}, worldSeed = 0, elapsedHours = 1 } = {}) {
  const state = migrateAntlerDevelopment(animal, worldSeed); if (!state) return null;
  const year = Math.max(1, Number(calendar.year) || 1), previousStage = state.stage;
  if (state.annual.year !== year) {
    const seed = `${worldSeed}:${animal.id}:antlers:${year}`, asymmetry = (1 - state.genes.symmetry) * .65;
    state.annual = { year, conditionInvestment: 1, growthBudget: 0, leftIntegrity: 1, rightIntegrity: 1, leftNoise: 1 + (unit(seed, "left") * 2 - 1) * asymmetry, rightNoise: 1 + (unit(seed, "right") * 2 - 1) * asymmetry };
  }
  const seasonal = antlerStage(calendar), health = clamp((animal.health || 0) / 100), energy = clamp((animal.energy || 0) / Math.max(100, animal.energyCapacity || 100)), hydration = clamp((animal.hydration || 0) / 100), condition = clamp(health * .4 + energy * .35 + hydration * .15 + clamp(animal.bodyCondition || 1, .5, 1.25) / 1.25 * .1, .35, 1.08);
  if (seasonal.stage.startsWith("velvet")) {
    const weight = clamp((Number(elapsedHours) || 0) / (24 * 120), 0, .08);
    state.annual.conditionInvestment += (condition - state.annual.conditionInvestment) * weight;
    state.annual.growthBudget += condition * Math.max(0, Number(elapsedHours) || 0);
  }
  state.stage = seasonal.stage; state.growth = seasonal.growth; state.mineralisation = seasonal.mineralisation; state.velvet = seasonal.stage.startsWith("velvet") || seasonal.stage === "mineralising";
  state.justShed = previousStage !== "cast" && state.stage === "cast";
  state.lastUpdatedDay = Math.max(1, Number(calendar.absoluteDay || calendar.dayOfYear) || state.lastUpdatedDay);
  return state;
}

export function antlerRenderProfile(animal = {}) {
  const state = animal.antlers;
  if (!state || !antlerEligible(animal) || state.growth <= .015 || state.stage === "cast") return Object.freeze({ visible: false, growth: 0 });
  const age = antlerAgeFactor(animal.age), condition = clamp(state.annual.conditionInvestment, .45, 1.08), size = age * condition;
  return Object.freeze({ visible: true, stage: state.stage, velvet: state.velvet, growth: state.growth, mineralisation: state.mineralisation, size, traits: state.genes, leftScale: state.annual.leftNoise * state.annual.leftIntegrity, rightScale: state.annual.rightNoise * state.annual.rightIntegrity, year: state.annual.year });
}
