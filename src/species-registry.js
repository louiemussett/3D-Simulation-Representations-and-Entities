import { BIOLOGICAL_PHENOTYPES, biologicalPhenotype } from "./biological-phenotypes.js";

const freeze = (value) => Object.freeze(value);

const base = {
  maxAge: 360, matureAge: 80, oldAge: 275, gestation: 65, dependency: 45, litter: [1, 2], speed: 1,
  vision: 8, smell: 6, hearing: 7, energyCapacity: 130, enduranceMultiplier: 1, reproductionEnergy: 70,
  femaleCriticalFat: 11, hungerRate: .16, thirstRate: .65, maternalCare: .82, herdTendency: .35, care: "maternal"
};

const entry = (id, values) => freeze({ ...base, id, symbol: values.symbol, ...values, biology: biologicalPhenotype(id), diet: values.guild === "herbivore" ? "plants" : values.guild === "omnivore" ? "mixed" : "meat" });

export const SPECIES = freeze({
  grazer: entry("grazer", { label: "Valley Grazer", symbol: "VG", guild: "herbivore", feeding: "grass", sizeClass: "medium", adultMass: 65, maxAge: 420, matureAge: 80, oldAge: 310, gestation: 60, dependency: 48, litter: [1, 1], speed: 1, vision: 8, smell: 5, hearing: 7, energyCapacity: 120, enduranceMultiplier: 1, reproductionEnergy: 70, femaleCriticalFat: 12, hungerRate: .18, thirstRate: .65, maternalCare: .9, herdTendency: .65, social: "stable-herd", habitat: "grassland", colour: 0xe6bc52, enabledByDefault: true, defaultPopulation: 18 }),
  hunter: entry("hunter", { label: "Ridge Hunter", symbol: "RH", guild: "carnivore", feeding: "prey-carrion", sizeClass: "medium", adultMass: 42, maxAge: 360, matureAge: 95, oldAge: 275, gestation: 90, dependency: 65, litter: [2, 4], speed: 1, vision: 11, smell: 8, hearing: 7, energyCapacity: 360, enduranceMultiplier: 3, reproductionEnergy: 78, femaleCriticalFat: 10, hungerRate: .045, thirstRate: .65, maternalCare: .72, herdTendency: .22, social: "pack", hunting: "pursuit", preySizes: ["small", "medium"], habitat: "open", colour: 0xd96cff, enabledByDefault: true, defaultPopulation: 4 }),
  "meadow-nibbler": entry("meadow-nibbler", { label: "Meadow Nibbler", symbol: "MN", guild: "herbivore", feeding: "grass", sizeClass: "tiny", adultMass: 4, maxAge: 120, matureAge: 20, oldAge: 85, gestation: 18, dependency: 14, litter: [3, 6], speed: 1.12, vision: 8, hearing: 10, energyCapacity: 55, hungerRate: .26, thirstRate: .52, herdTendency: .4, social: "colony", habitat: "cover-edge", colour: 0x66c98d, enabledByDefault: true, defaultPopulation: 12 }),
  "great-plains-grazer": entry("great-plains-grazer", { label: "Great Plains Grazer", symbol: "PG", guild: "herbivore", feeding: "grass", sizeClass: "large", adultMass: 390, maxAge: 620, matureAge: 130, oldAge: 470, gestation: 110, dependency: 75, litter: [1, 1], speed: .78, energyCapacity: 250, hungerRate: .24, thirstRate: .82, maternalCare: .9, herdTendency: .85, social: "large-herd", habitat: "long-grass", defence: "mass", colour: 0x8b6949, enabledByDefault: true, defaultPopulation: 6 }),
  "woodland-browser": entry("woodland-browser", { label: "Woodland Browser", symbol: "WB", guild: "herbivore", feeding: "shrub", sizeClass: "medium", adultMass: 54, maxAge: 440, matureAge: 88, oldAge: 325, gestation: 68, dependency: 62, litter: [1, 2], speed: .94, energyCapacity: 125, hungerRate: .16, thirstRate: .54, maternalCare: .96, herdTendency: .18, social: "family", habitat: "woodland", defence: "conceal", colour: 0x238a82, enabledByDefault: true, defaultPopulation: 7 }),
  "brush-fox": entry("brush-fox", { label: "Brush Fox", symbol: "BF", guild: "carnivore", feeding: "prey-carrion", sizeClass: "small", adultMass: 9, maxAge: 210, matureAge: 42, oldAge: 155, gestation: 38, dependency: 35, litter: [2, 5], speed: 1.18, vision: 10, smell: 10, hearing: 11, energyCapacity: 155, enduranceMultiplier: 1.25, hungerRate: .08, thirstRate: .5, herdTendency: .08, social: "pair", hunting: "small-prey", preySizes: ["tiny", "small"], habitat: "cover-edge", colour: 0xc86d36, enabledByDefault: true, defaultPopulation: 4 }),
  "shadow-stalker": entry("shadow-stalker", { label: "Shadow Stalker", symbol: "SS", guild: "carnivore", feeding: "prey-carrion", sizeClass: "medium", adultMass: 47, maxAge: 410, matureAge: 102, oldAge: 305, gestation: 82, dependency: 78, litter: [1, 3], speed: 1.16, vision: 12, smell: 7, hearing: 10, energyCapacity: 390, enduranceMultiplier: .72, hungerRate: .04, thirstRate: .5, maternalCare: .98, herdTendency: .03, social: "solitary", hunting: "ambush", preySizes: ["tiny", "small", "medium"], habitat: "woodland", colour: 0x5a365f, enabledByDefault: true, defaultPopulation: 3 }),
  "great-omnivore": entry("great-omnivore", { label: "Great Omnivore", symbol: "GO", guild: "omnivore", feeding: "mixed", sizeClass: "large", adultMass: 260, maxAge: 650, matureAge: 140, oldAge: 490, gestation: 105, dependency: 90, litter: [1, 2], speed: .82, smell: 11, energyCapacity: 420, enduranceMultiplier: 1.2, hungerRate: .075, thirstRate: .75, maternalCare: .95, herdTendency: .02, social: "solitary", hunting: "opportunist", preySizes: ["tiny", "small"], habitat: "woodland-edge", defence: "mass", colour: 0x76513b, enabledByDefault: true, defaultPopulation: 2 }),
  "dryland-runner": entry("dryland-runner", { label: "Dryland Runner", symbol: "DR", guild: "herbivore", feeding: "grass", sizeClass: "small", adultMass: 32, speed: 1.28, enduranceMultiplier: 1.7, thirstRate: .4, herdTendency: .65, social: "fluid-herd", habitat: "arid", colour: 0x3568c8, enabledByDefault: true, defaultPopulation: 7 }),
  "highland-grazer": entry("highland-grazer", { label: "Highland Grazer", symbol: "HG", guild: "herbivore", feeding: "grass", sizeClass: "medium", adultMass: 72, speed: .9, thirstRate: .58, herdTendency: .55, social: "seasonal-herd", habitat: "alpine", coldAdapted: true, colour: 0x9ba7b2, enabledByDefault: false, defaultPopulation: 5 }),
  "armoured-browser": entry("armoured-browser", { label: "Armoured Browser", symbol: "AB", guild: "herbivore", feeding: "mixed-plants", sizeClass: "large", adultMass: 520, maxAge: 720, matureAge: 155, oldAge: 540, gestation: 135, dependency: 95, litter: [1, 1], speed: .72, energyCapacity: 290, hungerRate: .22, thirstRate: .95, herdTendency: .05, social: "solitary", habitat: "scrub", defence: "armoured", colour: 0x747c75, enabledByDefault: true, defaultPopulation: 3 }),
  "pack-breaker": entry("pack-breaker", { label: "Pack Breaker", symbol: "PB", guild: "carnivore", feeding: "prey-carrion", sizeClass: "large", adultMass: 92, speed: .98, energyCapacity: 520, enduranceMultiplier: 2.2, hungerRate: .06, thirstRate: .72, herdTendency: .7, social: "pack", hunting: "large-prey", preySizes: ["large", "giant"], habitat: "open", colour: 0x8b3344, enabledByDefault: true, defaultPopulation: 3 }),
  "carrion-runner": entry("carrion-runner", { label: "Carrion Runner", symbol: "CR", guild: "scavenger", feeding: "carrion", sizeClass: "small", adultMass: 18, speed: 1.12, smell: 13, energyCapacity: 210, hungerRate: .065, thirstRate: .5, herdTendency: .35, social: "feeding-groups", habitat: "open", colour: 0xc49a4a, enabledByDefault: true, defaultPopulation: 3 }),
  "waterline-grazer": entry("waterline-grazer", { label: "Waterline Grazer", symbol: "WG", guild: "herbivore", feeding: "grass", sizeClass: "medium", adultMass: 82, speed: .86, thirstRate: 1.05, herdTendency: .5, social: "small-herd", habitat: "riparian", colour: 0x4c9a9d, enabledByDefault: false, defaultPopulation: 5 }),
  "brush-nibbler": entry("brush-nibbler", { label: "Brush Nibbler", symbol: "BN", guild: "herbivore", feeding: "shrub", sizeClass: "tiny", adultMass: 5, maxAge: 135, matureAge: 23, oldAge: 95, gestation: 21, dependency: 16, litter: [2, 5], speed: 1.05, hearing: 10, hungerRate: .24, thirstRate: .42, herdTendency: .08, social: "pair", habitat: "woodland", defence: "conceal", colour: 0x71a85b, enabledByDefault: false, defaultPopulation: 8 }),
  "waterline-ambusher": entry("waterline-ambusher", { label: "Waterline Ambusher", symbol: "WA", guild: "carnivore", feeding: "prey-carrion", sizeClass: "large", adultMass: 78, speed: 1.05, energyCapacity: 430, enduranceMultiplier: .8, hearing: 9, hungerRate: .055, herdTendency: .02, social: "territorial", hunting: "water-ambush", preySizes: ["small", "medium"], habitat: "riparian", colour: 0x345d63, enabledByDefault: false, defaultPopulation: 2 }),
  "northern-shaggy-grazer": entry("northern-shaggy-grazer", { label: "Northern Shaggy Grazer", symbol: "NG", guild: "herbivore", feeding: "mixed-plants", sizeClass: "large", adultMass: 430, speed: .74, energyCapacity: 270, hungerRate: .21, thirstRate: .58, herdTendency: .8, social: "seasonal-herd", habitat: "boreal", coldAdapted: true, colour: 0x685c55, enabledByDefault: false, defaultPopulation: 5 }),
  "highland-prowler": entry("highland-prowler", { label: "Highland Prowler", symbol: "HP", guild: "carnivore", feeding: "prey-carrion", sizeClass: "medium", adultMass: 51, speed: 1.08, energyCapacity: 370, enduranceMultiplier: 1.15, hungerRate: .05, herdTendency: .02, social: "solitary", hunting: "terrain-ambush", preySizes: ["small", "medium"], habitat: "alpine", coldAdapted: true, colour: 0x697b91, enabledByDefault: false, defaultPopulation: 2 }),
  "little-opportunist": entry("little-opportunist", { label: "Little Opportunist", symbol: "LO", guild: "omnivore", feeding: "mixed", sizeClass: "small", adultMass: 11, speed: 1.03, smell: 10, energyCapacity: 160, hungerRate: .09, thirstRate: .48, herdTendency: .12, social: "family", hunting: "opportunist", preySizes: ["tiny"], habitat: "cover-edge", colour: 0x9a6f59, enabledByDefault: false, defaultPopulation: 3 }),
  "cold-country-scavenger": entry("cold-country-scavenger", { label: "Cold-country Scavenger", symbol: "CS", guild: "scavenger", feeding: "carrion", sizeClass: "medium", adultMass: 36, speed: .92, smell: 12, energyCapacity: 290, enduranceMultiplier: 1.4, hungerRate: .045, thirstRate: .42, herdTendency: .02, social: "solitary", habitat: "boreal", coldAdapted: true, colour: 0x8893a0, enabledByDefault: false, defaultPopulation: 2 }),
  "sunscale-ambusher": entry("sunscale-ambusher", { label: "Sunscale Ambusher", symbol: "SA", guild: "carnivore", feeding: "prey", sizeClass: "small", adultMass: 13, maxAge: 330, matureAge: 70, oldAge: 250, gestation: 45, dependency: 10, litter: [3, 7], speed: 1.16, vision: 6, smell: 10, hearing: 5, energyCapacity: 245, enduranceMultiplier: .45, hungerRate: .025, thirstRate: .3, maternalCare: .45, herdTendency: 0, social: "territorial", hunting: "thermal-ambush", preySizes: ["tiny", "small"], habitat: "warm-open", colour: 0xd97732, enabledByDefault: false, defaultPopulation: 2 }),
  "shieldback-colony": entry("shieldback-colony", { label: "Shieldback Colony", symbol: "SC", guild: "herbivore", feeding: "mixed-plants", sizeClass: "small", adultMass: 16, maxAge: 300, matureAge: 55, oldAge: 225, gestation: 40, dependency: 24, litter: [3, 6], speed: .72, vision: 4, smell: 8, hearing: 5, energyCapacity: 105, enduranceMultiplier: .75, hungerRate: .11, thirstRate: .48, maternalCare: .9, herdTendency: .95, social: "stable-colony", habitat: "cover-edge", defence: "shell", colour: 0x3f8f72, enabledByDefault: false, defaultPopulation: 8 })
});

export const SPECIES_IDS = freeze(Object.keys(SPECIES));

// Explicit trophic preferences keep the 22 species ecologically distinct.
// Values are relative choice/assimilation weights: >= 1 preferred, .2-.99
// tolerated, and < .2 avoided except during genuine starvation.
export const FOOD_ECOLOGY = freeze({
  grazer: freeze({ plants: freeze({ grass: 1.15, shrub: .08, tree: 0 }), carrion: freeze({}) }),
  hunter: freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ grazer: 1.15, "dryland-runner": 1, "waterline-grazer": .9, "armoured-browser": .12 }) }),
  "meadow-nibbler": freeze({ plants: freeze({ grass: 1.25, shrub: .12, tree: 0 }), carrion: freeze({}) }),
  "great-plains-grazer": freeze({ plants: freeze({ grass: 1.2, shrub: .06, tree: 0 }), carrion: freeze({}) }),
  "woodland-browser": freeze({ plants: freeze({ grass: .08, shrub: 1.2, tree: .72 }), carrion: freeze({}) }),
  "brush-fox": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ "meadow-nibbler": 1.25, "brush-nibbler": 1.15, "shieldback-colony": .18, "great-plains-grazer": .08 }) }),
  "shadow-stalker": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ "woodland-browser": 1.2, grazer: 1, "meadow-nibbler": .7, "great-plains-grazer": .15 }) }),
  "great-omnivore": freeze({ plants: freeze({ grass: .55, shrub: 1, tree: .55 }), carrion: freeze({ "meadow-nibbler": 1.05, "brush-nibbler": 1, grazer: .7, "pack-breaker": .12 }) }),
  "dryland-runner": freeze({ plants: freeze({ grass: 1.2, shrub: .16, tree: 0 }), carrion: freeze({}) }),
  "highland-grazer": freeze({ plants: freeze({ grass: 1.05, shrub: .42, tree: .08 }), carrion: freeze({}) }),
  "armoured-browser": freeze({ plants: freeze({ grass: .5, shrub: 1.15, tree: .65 }), carrion: freeze({}) }),
  "pack-breaker": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ "great-plains-grazer": 1.3, "armoured-browser": 1.05, "northern-shaggy-grazer": 1.2, "meadow-nibbler": .08 }) }),
  "carrion-runner": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ grazer: 1, hunter: .8, "great-plains-grazer": 1.15, "sunscale-ambusher": .2 }) }),
  "waterline-grazer": freeze({ plants: freeze({ grass: 1.15, shrub: .35, tree: 0 }), carrion: freeze({}) }),
  "brush-nibbler": freeze({ plants: freeze({ grass: .15, shrub: 1.25, tree: .38 }), carrion: freeze({}) }),
  "waterline-ambusher": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ "waterline-grazer": 1.3, "dryland-runner": .8, "highland-grazer": .35, "sunscale-ambusher": .1 }) }),
  "northern-shaggy-grazer": freeze({ plants: freeze({ grass: 1, shrub: .72, tree: .22 }), carrion: freeze({}) }),
  "highland-prowler": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ "highland-grazer": 1.3, "dryland-runner": .75, "waterline-grazer": .25 }) }),
  "little-opportunist": freeze({ plants: freeze({ grass: .72, shrub: 1.05, tree: .25 }), carrion: freeze({ "meadow-nibbler": 1.15, "brush-nibbler": 1, grazer: .2, "great-plains-grazer": .08 }) }),
  "cold-country-scavenger": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ "northern-shaggy-grazer": 1.3, "highland-grazer": 1.05, "highland-prowler": .65, "sunscale-ambusher": .15 }) }),
  "sunscale-ambusher": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ "meadow-nibbler": 1.2, "brush-nibbler": 1.1, "shieldback-colony": .35, "great-plains-grazer": .05 }) }),
  "shieldback-colony": freeze({ plants: freeze({ grass: .8, shrub: 1.05, tree: .18 }), carrion: freeze({}) })
});

// The supplied ethology source distinguishes defended territory from a home
// range. Most species therefore receive only a non-exclusive home range;
// explicit territory is reserved for species/resources that can be defended.
export const SPATIAL_ECOLOGY = freeze({
  grazer: freeze({ mode: "home-range", territoriality: .12, radius: 10 }), hunter: freeze({ mode: "seasonal-territory", territoriality: .62, radius: 15, breedingMultiplier: 1.25 }),
  "meadow-nibbler": freeze({ mode: "home-range", territoriality: .08, radius: 6 }), "great-plains-grazer": freeze({ mode: "home-range", territoriality: .08, radius: 15 }),
  "woodland-browser": freeze({ mode: "core-range", territoriality: .28, radius: 10 }), "brush-fox": freeze({ mode: "pair-territory", territoriality: .72, radius: 11 }),
  "shadow-stalker": freeze({ mode: "territory", territoriality: .86, radius: 16 }), "great-omnivore": freeze({ mode: "seasonal-territory", territoriality: .52, radius: 17, resourceMultiplier: 1.2 }),
  "dryland-runner": freeze({ mode: "home-range", territoriality: .06, radius: 13 }), "highland-grazer": freeze({ mode: "seasonal-home-range", territoriality: .14, radius: 13 }),
  "armoured-browser": freeze({ mode: "home-range", territoriality: .18, radius: 12 }), "pack-breaker": freeze({ mode: "pack-territory", territoriality: .78, radius: 18 }),
  "carrion-runner": freeze({ mode: "home-range", territoriality: .18, radius: 16 }), "waterline-grazer": freeze({ mode: "home-range", territoriality: .12, radius: 10 }),
  "brush-nibbler": freeze({ mode: "pair-core-range", territoriality: .32, radius: 7 }), "waterline-ambusher": freeze({ mode: "resource-territory", territoriality: .88, radius: 13 }),
  "northern-shaggy-grazer": freeze({ mode: "seasonal-home-range", territoriality: .1, radius: 16 }), "highland-prowler": freeze({ mode: "territory", territoriality: .8, radius: 15 }),
  "little-opportunist": freeze({ mode: "home-range", territoriality: .22, radius: 8 }), "cold-country-scavenger": freeze({ mode: "home-range", territoriality: .2, radius: 18 }),
  "sunscale-ambusher": freeze({ mode: "mating-territory", territoriality: .84, radius: 8, breedingMultiplier: 1.4 }), "shieldback-colony": freeze({ mode: "colony-core", territoriality: .42, radius: 9 })
});

export const speciesProfile = (subject) => SPECIES[typeof subject === "string" ? subject : subject?.speciesId];
export const foodEcology = (subject) => FOOD_ECOLOGY[typeof subject === "string" ? subject : subject?.speciesId] || freeze({ plants: freeze({}), carrion: freeze({}) });
export const spatialEcology = (subject) => SPATIAL_ECOLOGY[typeof subject === "string" ? subject : subject?.speciesId] || freeze({ mode: "home-range", territoriality: 0, radius: 8 });
export const guildOf = (subject) => speciesProfile(subject)?.guild || "herbivore";
export const isHerbivore = (subject) => guildOf(subject) === "herbivore";
export const isCarnivore = (subject) => ["carnivore", "scavenger"].includes(guildOf(subject));
export const isOmnivore = (subject) => guildOf(subject) === "omnivore";
export const eatsPlants = (subject) => isHerbivore(subject) || isOmnivore(subject);
export const eatsMeat = (subject) => !isHerbivore(subject);
export const canHunt = (subject) => Boolean(speciesProfile(subject)?.hunting);
export const canScavenge = (subject) => eatsMeat(subject);
export const LOW_PREDATOR_FOUNDER_THRESHOLD = 2;
export const needsPregnantPredatorFounder = (subject, population) => canHunt(subject)
  && Number.isFinite(Number(population))
  && Number(population) > 0
  && Number(population) <= LOW_PREDATOR_FOUNDER_THRESHOLD;
export { BIOLOGICAL_PHENOTYPES };
export const plantPreference = (subject, plantType) => Number(foodEcology(subject).plants?.[plantType] ?? 0);
export const carcassPreference = (consumer, corpseOrSpecies) => {
  const sourceId = typeof corpseOrSpecies === "string" ? corpseOrSpecies : corpseOrSpecies?.speciesId;
  const explicit = foodEcology(consumer).carrion?.[sourceId];
  if (Number.isFinite(explicit)) return explicit;
  return eatsMeat(consumer) ? .55 : 0;
};
export function foodPreferenceSummary(subject) {
  const ecology = foodEcology(subject), labels = (weights) => Object.entries(weights || {}).sort((a, b) => b[1] - a[1]);
  const preferredPlants = labels(ecology.plants).filter(([, value]) => value >= 1).map(([key]) => key);
  const avoidedPlants = labels(ecology.plants).filter(([, value]) => value < .2).map(([key]) => key);
  const preferredCarrion = labels(ecology.carrion).filter(([, value]) => value >= 1).map(([key]) => SPECIES[key]?.label || key);
  const avoidedCarrion = labels(ecology.carrion).filter(([, value]) => value < .2).map(([key]) => SPECIES[key]?.label || key);
  return { preferredPlants, avoidedPlants, preferredCarrion, avoidedCarrion };
}
// Trace amounts describe opportunistic tasting, not a food source capable of
// sustaining an animal.  Keeping that distinction explicit prevents a
// specialist from repeatedly feeding on unsuitable plants while starving.
export const isSustainableForage = (subject, plantType) => plantPreference(subject, plantType) >= .2;
export const preyCompatible = (predator, prey) => { const profile = speciesProfile(predator), target = speciesProfile(prey); return Boolean(profile?.hunting && target?.guild === "herbivore" && (profile.preySizes || []).includes(target.sizeClass)); };
export const enabledSpeciesCounts = (counts = {}) => { const explicit = Object.keys(counts).length > 0; return Object.fromEntries(SPECIES_IDS.map(id => [id, Math.max(0, Math.floor(Number(counts[id] ?? (!explicit && SPECIES[id].enabledByDefault ? SPECIES[id].defaultPopulation : 0)) || 0))])); };
export const speciesCategoryTotals = (counts = {}) => { const exact = enabledSpeciesCounts(counts); return { herbivores: SPECIES_IDS.filter(id => isHerbivore(id)).reduce((sum, id) => sum + exact[id], 0), carnivores: SPECIES_IDS.filter(id => !isHerbivore(id)).reduce((sum, id) => sum + exact[id], 0) }; };

export const ECOLOGY_PRESETS = freeze({
  "ridge-hunter-web": freeze(["grazer", "hunter", "dryland-runner"]),
  "brush-fox-web": freeze(["meadow-nibbler", "brush-nibbler", "brush-fox"]),
  "shadow-stalker-web": freeze(["grazer", "woodland-browser", "shadow-stalker"]),
  "pack-breaker-web": freeze(["great-plains-grazer", "armoured-browser", "northern-shaggy-grazer", "pack-breaker"]),
  "waterline-ambusher-web": freeze(["waterline-grazer", "waterline-ambusher"]),
  "highland-prowler-web": freeze(["highland-grazer", "highland-prowler"]),
  "sunscale-ambusher-web": freeze(["meadow-nibbler", "brush-nibbler", "sunscale-ambusher"]),
  original: freeze(["grazer", "hunter"]),
  compact: freeze(["grazer", "hunter", "meadow-nibbler", "brush-fox", "great-plains-grazer", "woodland-browser", "shadow-stalker", "great-omnivore"]),
  "compact-large": freeze(["great-plains-grazer", "armoured-browser", "northern-shaggy-grazer", "dryland-runner", "hunter", "pack-breaker", "waterline-ambusher", "great-omnivore"]),
  "compact-small": freeze(["meadow-nibbler", "brush-nibbler", "dryland-runner", "shieldback-colony", "brush-fox", "sunscale-ambusher", "carrion-runner", "little-opportunist"]),
  "compact-open": freeze(["grazer", "meadow-nibbler", "great-plains-grazer", "dryland-runner", "hunter", "brush-fox", "pack-breaker", "carrion-runner"]),
  "compact-woodland": freeze(["woodland-browser", "brush-nibbler", "meadow-nibbler", "shieldback-colony", "brush-fox", "shadow-stalker", "great-omnivore", "little-opportunist"]),
  balanced: freeze(["grazer", "hunter", "meadow-nibbler", "dryland-runner", "great-plains-grazer", "woodland-browser", "armoured-browser", "brush-fox", "shadow-stalker", "pack-breaker", "carrion-runner", "great-omnivore"]),
  expanded: freeze(["grazer", "hunter", "meadow-nibbler", "dryland-runner", "great-plains-grazer", "woodland-browser", "armoured-browser", "brush-fox", "shadow-stalker", "pack-breaker", "carrion-runner", "great-omnivore", "brush-nibbler", "highland-grazer", "waterline-grazer", "waterline-ambusher"]),
  full: SPECIES_IDS
});

// Literal central populations derived from the predator/preferred-prey
// calculations supplied for world setup. One entry always means one animal;
// these values are never compressed representatives of a larger population.
export const ECOLOGY_PRESET_POPULATIONS = freeze({
  "ridge-hunter-web": freeze({ hunter: 1, grazer: 54, "dryland-runner": 95 }),
  "brush-fox-web": freeze({ "brush-fox": 1, "meadow-nibbler": 267, "brush-nibbler": 197 }),
  "shadow-stalker-web": freeze({ "shadow-stalker": 1, grazer: 50, "woodland-browser": 72 }),
  "pack-breaker-web": freeze({ "pack-breaker": 1, "great-plains-grazer": 11, "armoured-browser": 7, "northern-shaggy-grazer": 10 }),
  "waterline-ambusher-web": freeze({ "waterline-ambusher": 1, "waterline-grazer": 127 }),
  "highland-prowler-web": freeze({ "highland-prowler": 1, "highland-grazer": 105 }),
  "sunscale-ambusher-web": freeze({ "sunscale-ambusher": 1, "meadow-nibbler": 352, "brush-nibbler": 259 }),
  full: freeze({
    grazer: 104, hunter: 1, "meadow-nibbler": 619, "great-plains-grazer": 11,
    "woodland-browser": 72, "brush-fox": 1, "shadow-stalker": 1, "great-omnivore": 1,
    "dryland-runner": 95, "highland-grazer": 105, "armoured-browser": 7,
    "pack-breaker": 1, "carrion-runner": 1, "waterline-grazer": 127,
    "brush-nibbler": 456, "waterline-ambusher": 1, "northern-shaggy-grazer": 10,
    "highland-prowler": 1, "little-opportunist": 1, "cold-country-scavenger": 1,
    "sunscale-ambusher": 1, "shieldback-colony": 1
  })
});

export const ECOLOGY_POPULATION_LEVELS = freeze([
  freeze({ id: "minimal", label: "Minimal", percent: 20 }),
  freeze({ id: "lean", label: "Lean", percent: 50 }),
  freeze({ id: "central", label: "Calculated central", percent: 100 }),
  freeze({ id: "abundant", label: "Abundant", percent: 150 }),
  freeze({ id: "maximum", label: "Maximum", percent: 200 })
]);

export function ecologyPresetCounts(name, percent = 100) {
  const ids = ECOLOGY_PRESETS[name];
  if (!ids) return enabledSpeciesCounts({});
  const central = ECOLOGY_PRESET_POPULATIONS[name]
    || Object.fromEntries(ids.map(id => [id, SPECIES[id].defaultPopulation]));
  const scale = Math.max(20, Math.min(200, Number(percent) || 100)) / 100;
  return enabledSpeciesCounts(Object.fromEntries(ids.map(id => [id, Math.max(1, Math.round((central[id] || SPECIES[id].defaultPopulation || 1) * scale))])));
}

export function ecologyWarnings(counts = {}, world = {}) {
  const exact = enabledSpeciesCounts(counts), active = id => exact[id] > 0, warnings = [], totalPopulation = Object.values(exact).reduce((a, b) => a + b, 0);
  if (totalPopulation > 500) warnings.push(`This literal preset starts ${totalPopulation.toLocaleString()} individual animals and may be expensive to simulate in a browser.`);
  for (const id of SPECIES_IDS.filter(id => active(id) && canHunt(id))) if (!SPECIES_IDS.some(prey => active(prey) && preyCompatible(id, prey))) warnings.push(`${SPECIES[id].label} has no enabled compatible prey.`);
  if (SPECIES_IDS.filter(id => active(id) && SPECIES[id].guild === "scavenger").length > 1 && totalPopulation < 30) warnings.push("Several carrion specialists are enabled in a low-population world.");
  if (SPECIES_IDS.some(id => active(id) && SPECIES[id].habitat === "woodland") && Number(world.woodland) <= .1) warnings.push("Woodland specialists are enabled with almost no woodland.");
  if (SPECIES_IDS.some(id => active(id) && SPECIES[id].habitat === "riparian") && Number(world.rivers) + Number(world.lakes) <= .5) warnings.push("Waterline specialists are enabled with little surface water.");
  if (active("shieldback-colony") && exact["shieldback-colony"] < 4) warnings.push("Shieldback Colony needs at least four starting animals for communal defence and care.");
  if (active("sunscale-ambusher") && !SPECIES_IDS.some(prey => active(prey) && preyCompatible("sunscale-ambusher", prey))) warnings.push("Sunscale Ambusher has no enabled tiny or small herbivore prey.");
  return warnings;
}
