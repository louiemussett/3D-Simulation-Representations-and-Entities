const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
};

export const LIFE_HISTORY_SPECIES_IDS = Object.freeze([
  "grazer", "hunter", "meadow-nibbler", "great-plains-grazer", "woodland-browser", "brush-fox",
  "shadow-stalker", "great-omnivore", "dryland-runner", "highland-grazer", "armoured-browser",
  "pack-breaker", "carrion-runner", "waterline-grazer", "brush-nibbler", "waterline-ambusher",
  "northern-shaggy-grazer", "highland-prowler", "little-opportunist", "cold-country-scavenger",
  "sunscale-ambusher", "shieldback-colony", "wild-boar", "african-elephant", "dromedary",
  "common-ostrich"
]);

const allSeasons = Object.freeze(["Spring", "Summer", "Autumn", "Winter"]);
const development = (maturityDays, senescenceDays, longevityReferenceDays, lactationDays, independenceDays) => ({
  maturityDays, senescenceDays, longevityReferenceDays, lactationDays, independenceDays
});
const reproduction = (values) => ({
  mode: values.mode,
  strategy: values.strategy,
  ovulation: values.ovulation,
  activeSeasons: values.activeSeasons,
  cycleDays: values.cycleDays,
  receptiveDays: values.receptiveDays,
  broodRange: values.broodRange,
  gestationDays: values.gestationDays,
  implantationDelayDays: values.implantationDelayDays,
  preLayDays: values.preLayDays,
  incubationDays: values.incubationDays,
  postpartumDays: values.postpartumDays,
  minimumRebreedDays: values.minimumRebreedDays,
  maxBroodsPerYear: values.maxBroodsPerYear,
  environmentTrigger: values.environmentTrigger,
  nestCare: values.nestCare
});
const profile = (archetype, developmentProfile, reproductiveProfile) => ({ archetype, development: developmentProfile, reproduction: reproduction(reproductiveProfile) });

export const LIFE_HISTORY = deepFreeze({
  grazer: profile("generic deer-like herbivore", development(548, 3650, 11315, 70, 365), {
    mode: "live-birth", strategy: "seasonal-polyestrous", ovulation: "spontaneous", activeSeasons: ["Autumn"], cycleDays: 28, receptiveDays: 3,
    broodRange: [1, 2], gestationDays: 198, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 70, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  hunter: profile("generic wolf-like carnivore", development(913, 3650, 6935, 45, 365), {
    mode: "live-birth", strategy: "annual-monoestrous", ovulation: "spontaneous", activeSeasons: ["Winter"], cycleDays: null, receptiveDays: 10,
    broodRange: [4, 7], gestationDays: 63, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 45, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "meadow-nibbler": profile("European rabbit", development(240, 1460, 4745, 28, 35), {
    mode: "live-birth", strategy: "opportunistic-continuous", ovulation: "induced", activeSeasons: allSeasons, cycleDays: null, receptiveDays: null,
    broodRange: [4, 8], gestationDays: 31, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 1, minimumRebreedDays: 0, maxBroodsPerYear: 6, environmentTrigger: "resource", nestCare: "none"
  }),
  "great-plains-grazer": profile("American bison", development(913, 5475, 12228, 240, 365), {
    mode: "live-birth", strategy: "seasonal-polyestrous", ovulation: "spontaneous", activeSeasons: ["Summer", "Autumn"], cycleDays: 21, receptiveDays: 2,
    broodRange: [1, 1], gestationDays: 285, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 240, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "woodland-browser": profile("moose", development(913, 4380, 9855, 150, 365), {
    mode: "live-birth", strategy: "annual-monoestrous", ovulation: "spontaneous", activeSeasons: ["Autumn"], cycleDays: null, receptiveDays: 4,
    broodRange: [1, 2], gestationDays: 230, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 150, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "brush-fox": profile("red fox", development(304, 2555, 7775, 63, 240), {
    mode: "live-birth", strategy: "annual-monoestrous", ovulation: "spontaneous", activeSeasons: ["Winter"], cycleDays: null, receptiveDays: 6,
    broodRange: [3, 6], gestationDays: 52, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 63, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "shadow-stalker": profile("Eurasian lynx", development(730, 3650, 6205, 120, 300), {
    mode: "live-birth", strategy: "seasonal-polyestrous", ovulation: "induced", activeSeasons: ["Winter", "Spring"], cycleDays: 14, receptiveDays: 5,
    broodRange: [1, 5], gestationDays: 69, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 120, minimumRebreedDays: 730, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "great-omnivore": profile("brown bear", development(1825, 7300, 14600, 730, 900), {
    mode: "live-birth", strategy: "annual-monoestrous", ovulation: "spontaneous", activeSeasons: ["Summer"], cycleDays: null, receptiveDays: 10,
    broodRange: [1, 3], gestationDays: 210, implantationDelayDays: 150, preLayDays: null, incubationDays: null, postpartumDays: 730, minimumRebreedDays: 730, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "dryland-runner": profile("pronghorn", development(730, 3285, 6205, 120, 300), {
    mode: "live-birth", strategy: "annual-monoestrous", ovulation: "spontaneous", activeSeasons: ["Autumn"], cycleDays: null, receptiveDays: 5,
    broodRange: [1, 2], gestationDays: 235, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 120, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "highland-grazer": profile("Alpine ibex", development(913, 4380, 7665, 120, 365), {
    mode: "live-birth", strategy: "annual-monoestrous", ovulation: "spontaneous", activeSeasons: ["Autumn", "Winter"], cycleDays: null, receptiveDays: 4,
    broodRange: [1, 2], gestationDays: 170, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 120, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "armoured-browser": profile("black rhinoceros", development(2555, 10950, 20805, 548, 1095), {
    mode: "live-birth", strategy: "continuous-polyestrous", ovulation: "spontaneous", activeSeasons: allSeasons, cycleDays: 35, receptiveDays: 4,
    broodRange: [1, 1], gestationDays: 474, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 548, minimumRebreedDays: 900, maxBroodsPerYear: null, environmentTrigger: "none", nestCare: "none"
  }),
  "pack-breaker": profile("spotted hyena", development(1095, 5475, 15002, 450, 548), {
    mode: "live-birth", strategy: "continuous-polyestrous", ovulation: "spontaneous", activeSeasons: allSeasons, cycleDays: 21, receptiveDays: 5,
    broodRange: [1, 3], gestationDays: 110, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 450, minimumRebreedDays: 0, maxBroodsPerYear: null, environmentTrigger: "none", nestCare: "none"
  }),
  "carrion-runner": profile("southern ground hornbill", development(1460, 5475, 18250, 0, 180), {
    mode: "surface-eggs", strategy: "annual-clutch", ovulation: "spontaneous", activeSeasons: ["Spring", "Summer"], cycleDays: null, receptiveDays: null,
    broodRange: [1, 2], gestationDays: null, implantationDelayDays: 0, preLayDays: 30, incubationDays: 40, postpartumDays: 0, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "attended"
  }),
  "waterline-grazer": profile("capybara", development(548, 2190, 5512, 90, 365), {
    mode: "live-birth", strategy: "opportunistic-polyestrous", ovulation: "spontaneous", activeSeasons: allSeasons, cycleDays: 20, receptiveDays: 5,
    broodRange: [2, 8], gestationDays: 150, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 90, minimumRebreedDays: 0, maxBroodsPerYear: 2, environmentTrigger: "rainfall", nestCare: "none"
  }),
  "brush-nibbler": profile("snowshoe hare", development(365, 1095, 1971, 28, 28), {
    mode: "live-birth", strategy: "seasonal-polyestrous", ovulation: "induced", activeSeasons: ["Spring", "Summer"], cycleDays: 17, receptiveDays: 5,
    broodRange: [1, 7], gestationDays: 37, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 7, minimumRebreedDays: 0, maxBroodsPerYear: 4, environmentTrigger: "calendar", nestCare: "none"
  }),
  "waterline-ambusher": profile("Nile crocodile", development(3285, 10950, 20440, 0, 90), {
    mode: "surface-eggs", strategy: "annual-clutch", ovulation: "spontaneous", activeSeasons: allSeasons, cycleDays: null, receptiveDays: null,
    broodRange: [20, 60], gestationDays: null, implantationDelayDays: 0, preLayDays: 60, incubationDays: 85, postpartumDays: 0, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "warm-rainfall", nestCare: "attended"
  }),
  "northern-shaggy-grazer": profile("musk ox", development(913, 5110, 10001, 300, 365), {
    mode: "live-birth", strategy: "annual-monoestrous", ovulation: "spontaneous", activeSeasons: ["Autumn"], cycleDays: null, receptiveDays: 5,
    broodRange: [1, 1], gestationDays: 240, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 300, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "highland-prowler": profile("snow leopard", development(1095, 3650, 7738, 150, 365), {
    mode: "live-birth", strategy: "seasonal-polyestrous", ovulation: "induced", activeSeasons: ["Winter"], cycleDays: 30, receptiveDays: 7,
    broodRange: [1, 3], gestationDays: 98, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 150, minimumRebreedDays: 730, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "little-opportunist": profile("raccoon", development(365, 1825, 7665, 70, 300), {
    mode: "live-birth", strategy: "annual-monoestrous", ovulation: "spontaneous", activeSeasons: ["Winter", "Spring"], cycleDays: null, receptiveDays: 7,
    broodRange: [3, 5], gestationDays: 64, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 70, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "cold-country-scavenger": profile("common pheasant", development(365, 1460, 6570, 0, 80), {
    mode: "surface-eggs", strategy: "annual-clutch", ovulation: "spontaneous", activeSeasons: ["Winter", "Spring"], cycleDays: null, receptiveDays: null,
    broodRange: [7, 15], gestationDays: null, implantationDelayDays: 0, preLayDays: 14, incubationDays: 24, postpartumDays: 0, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "attended"
  }),
  "sunscale-ambusher": profile("ball python", development(1095, 3650, 17338, 0, 0), {
    mode: "surface-eggs", strategy: "annual-clutch", ovulation: "spontaneous", activeSeasons: allSeasons, cycleDays: null, receptiveDays: null,
    broodRange: [3, 11], gestationDays: null, implantationDelayDays: 0, preLayDays: 50, incubationDays: 55, postpartumDays: 0, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "rainfall", nestCare: "brooded"
  }),
  "shieldback-colony": profile("African spurred tortoise", development(3650, 18250, 19820, 0, 0), {
    mode: "surface-eggs", strategy: "seasonal-clutch", ovulation: "spontaneous", activeSeasons: ["Summer", "Autumn"], cycleDays: 90, receptiveDays: 20,
    broodRange: [15, 30], gestationDays: null, implantationDelayDays: 0, preLayDays: 45, incubationDays: 100, postpartumDays: 0, minimumRebreedDays: 90, maxBroodsPerYear: 2, environmentTrigger: "rainfall", nestCare: "unattended"
  }),
  "wild-boar": profile("wild boar", development(365, 2190, 9855, 90, 180), {
    mode: "live-birth", strategy: "seasonal-polyestrous", ovulation: "spontaneous", activeSeasons: ["Autumn", "Winter"], cycleDays: 21, receptiveDays: 3,
    broodRange: [4, 8], gestationDays: 115, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 90, minimumRebreedDays: 120, maxBroodsPerYear: 2, environmentTrigger: "calendar", nestCare: "none"
  }),
  "african-elephant": profile("African bush elephant", development(4380, 18250, 23725, 1095, 2920), {
    mode: "live-birth", strategy: "continuous-polyestrous", ovulation: "spontaneous", activeSeasons: allSeasons, cycleDays: 16, receptiveDays: 4,
    broodRange: [1, 1], gestationDays: 660, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 1095, minimumRebreedDays: 1460, maxBroodsPerYear: null, environmentTrigger: "none", nestCare: "none"
  }),
  dromedary: profile("dromedary", development(1095, 7300, 10366, 365, 730), {
    mode: "live-birth", strategy: "seasonal-polyestrous", ovulation: "induced", activeSeasons: ["Winter", "Spring"], cycleDays: 24, receptiveDays: 5,
    broodRange: [1, 1], gestationDays: 390, implantationDelayDays: 0, preLayDays: null, incubationDays: null, postpartumDays: 365, minimumRebreedDays: 548, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "none"
  }),
  "common-ostrich": profile("common ostrich", development(1095, 10950, 18250, 0, 365), {
    mode: "surface-eggs", strategy: "seasonal-clutch", ovulation: "spontaneous", activeSeasons: ["Spring", "Summer"], cycleDays: 14, receptiveDays: 7,
    broodRange: [7, 10], gestationDays: null, implantationDelayDays: 0, preLayDays: 30, incubationDays: 42, postpartumDays: 0, minimumRebreedDays: 0, maxBroodsPerYear: 1, environmentTrigger: "calendar", nestCare: "attended"
  })
});

const finitePositive = (value) => Number.isFinite(value) && value > 0;

export function validateLifeHistoryRegistry(registry = LIFE_HISTORY, speciesIds = LIFE_HISTORY_SPECIES_IDS) {
  const errors = [];
  const actual = Object.keys(registry);
  for (const id of speciesIds) if (!registry[id]) errors.push(`missing profile: ${id}`);
  for (const id of actual) if (!speciesIds.includes(id)) errors.push(`unknown profile: ${id}`);
  for (const id of speciesIds) {
    const profileValue = registry[id];
    if (!profileValue) continue;
    const { development: dev, reproduction: repro } = profileValue;
    if (!finitePositive(dev?.maturityDays)) errors.push(`${id}: invalid maturityDays`);
    if (!finitePositive(dev?.senescenceDays) || dev.senescenceDays <= dev.maturityDays) errors.push(`${id}: invalid senescenceDays`);
    if (!finitePositive(dev?.longevityReferenceDays) || dev.longevityReferenceDays <= dev.senescenceDays) errors.push(`${id}: invalid longevityReferenceDays`);
    if (!Number.isFinite(dev?.lactationDays) || dev.lactationDays < 0) errors.push(`${id}: invalid lactationDays`);
    if (!Number.isFinite(dev?.independenceDays) || dev.independenceDays < 0) errors.push(`${id}: invalid independenceDays`);
    if (!Array.isArray(repro?.broodRange) || repro.broodRange.length !== 2 || !finitePositive(repro.broodRange[0]) || repro.broodRange[1] < repro.broodRange[0]) errors.push(`${id}: invalid broodRange`);
    if (!Array.isArray(repro?.activeSeasons) || !repro.activeSeasons.length) errors.push(`${id}: no active seasons`);
    if (repro?.mode === "live-birth" && !finitePositive(repro.gestationDays)) errors.push(`${id}: live birth requires gestationDays`);
    if (repro?.mode === "surface-eggs" && (!finitePositive(repro.preLayDays) || !finitePositive(repro.incubationDays))) errors.push(`${id}: egg layer requires preLayDays and incubationDays`);
    if (!Number.isFinite(repro?.postpartumDays) || repro.postpartumDays < 0) errors.push(`${id}: invalid postpartumDays`);
    if (!Number.isFinite(repro?.minimumRebreedDays) || repro.minimumRebreedDays < 0) errors.push(`${id}: invalid minimumRebreedDays`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors) });
}

const validation = validateLifeHistoryRegistry();
if (!validation.valid) throw new Error(`Invalid life-history registry: ${validation.errors.join("; ")}`);

export function lifeHistoryFor(subject) {
  const id = typeof subject === "string" ? subject : subject?.speciesId;
  const value = LIFE_HISTORY[id];
  if (!value) throw new RangeError(`No life-history profile registered for species '${id || "unknown"}'`);
  return value;
}

export function legacySpeciesTiming(subject) {
  const value = lifeHistoryFor(subject), { development: dev, reproduction: repro } = value;
  return Object.freeze({
    longevityReference: dev.longevityReferenceDays,
    matureAge: dev.maturityDays,
    oldAge: dev.senescenceDays,
    gestation: repro.mode === "live-birth" ? repro.gestationDays : repro.preLayDays,
    incubation: repro.incubationDays,
    lactationDays: dev.lactationDays,
    dependency: dev.independenceDays,
    litter: repro.broodRange
  });
}
