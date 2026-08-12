import { BIOLOGICAL_PHENOTYPES, biologicalPhenotype } from "./biological-phenotypes.js";
import { LIFE_HISTORY, legacySpeciesTiming, lifeHistoryFor } from "./life-history-registry.js";

const freeze = (value) => Object.freeze(value);

const base = {
  speed: 1, vision: 8, smell: 6, hearing: 7, energyCapacity: 130, enduranceMultiplier: 1, reproductionEnergy: 70,
  femaleCriticalFat: 11, hungerRate: .16, thirstRate: .65, maternalCare: .82, herdTendency: .35, care: "maternal"
};

const visualDesign = (bodyShape, bodyScale, headShape, headScale, headOffset, features = []) => freeze({
  bodyShape, bodyScale: freeze(bodyScale), headShape, headScale: freeze(headScale), headOffset: freeze(headOffset),
  features: freeze(features.map((feature) => freeze(feature)))
});

const BASE_SPECIES_VISUAL_DESIGNS = freeze({
  grazer: null,
  hunter: null,
  "meadow-nibbler": visualDesign("ellipsoid", [.62, .42, .72], "round", [.31, .33, .3], [0, .34, .48], [{ kind: "long-ears", attach: "head" }, { kind: "short-tail", attach: "body" }]),
  "great-plains-grazer": visualDesign("barrel", [.94, .62, 1.02], "block", [.48, .43, .48], [0, .5, .65], [{ kind: "shoulder-hump", attach: "body" }, { kind: "paired-horns", attach: "head" }]),
  "woodland-browser": visualDesign("long", [.76, .58, 1.12], "long", [.34, .32, .5], [0, .55, .72], [{ kind: "broad-antlers", attach: "head" }, { kind: "large-ears", attach: "head" }]),
  "brush-fox": visualDesign("slender", [.62, .34, .9], "tapered", [.34, .38, .4], [0, .35, .58], [{ kind: "pointed-ears", attach: "head" }, { kind: "bushy-tail", attach: "body" }]),
  "shadow-stalker": visualDesign("compact", [.72, .44, .82], "round", [.39, .38, .38], [0, .42, .55], [{ kind: "tufted-ears", attach: "head" }, { kind: "short-tail", attach: "body" }]),
  "great-omnivore": visualDesign("barrel", [.98, .7, .94], "block", [.48, .45, .46], [0, .55, .62], [{ kind: "round-ears", attach: "head" }, { kind: "shoulder-hump", attach: "body" }]),
  "dryland-runner": visualDesign("slender", [.62, .42, .98], "long", [.31, .32, .43], [0, .48, .64], [{ kind: "pronged-horns", attach: "head" }, { kind: "large-ears", attach: "head" }]),
  "highland-grazer": visualDesign("barrel", [.76, .5, .88], "block", [.38, .36, .4], [0, .48, .58], [{ kind: "swept-horns", attach: "head" }, { kind: "short-tail", attach: "body" }]),
  "armoured-browser": visualDesign("barrel", [1, .62, 1.08], "low", [.48, .36, .56], [0, .42, .72], [{ kind: "nasal-horns", attach: "head" }, { kind: "back-ridge", attach: "body" }]),
  "pack-breaker": visualDesign("sloped", [.72, .5, .92], "block", [.42, .4, .46], [0, .46, .62], [{ kind: "round-ears", attach: "head" }, { kind: "shoulder-hump", attach: "body" }, { kind: "short-tail", attach: "body" }]),
  "carrion-runner": visualDesign("teardrop", [.68, .44, .74], "small", [.27, .3, .3], [0, .46, .48], [{ kind: "hooked-beak", attach: "head" }, { kind: "head-crest", attach: "head" }]),
  "waterline-grazer": visualDesign("barrel", [.78, .5, .84], "block", [.42, .38, .42], [0, .42, .56], [{ kind: "small-ears", attach: "head" }]),
  "brush-nibbler": visualDesign("slender", [.58, .38, .76], "round", [.29, .31, .29], [0, .35, .49], [{ kind: "long-ears", attach: "head" }, { kind: "short-tail", attach: "body" }]),
  "waterline-ambusher": visualDesign("low-long", [.82, .3, 1.28], "low", [.42, .25, .62], [0, .28, .86], [{ kind: "armoured-ridge", attach: "body" }, { kind: "long-tail", attach: "body" }]),
  "northern-shaggy-grazer": visualDesign("barrel", [.92, .66, 1], "block", [.46, .43, .46], [0, .52, .64], [{ kind: "wide-horns", attach: "head" }, { kind: "shaggy-mantle", attach: "body" }]),
  "highland-prowler": visualDesign("long", [.68, .42, .96], "round", [.38, .36, .39], [0, .42, .63], [{ kind: "round-ears", attach: "head" }, { kind: "long-tail", attach: "body" }]),
  "little-opportunist": visualDesign("compact", [.66, .42, .76], "tapered", [.34, .35, .39], [0, .39, .52], [{ kind: "round-ears", attach: "head" }, { kind: "ringed-tail", attach: "body" }]),
  "cold-country-scavenger": visualDesign("teardrop", [.72, .46, .8], "small", [.29, .31, .32], [0, .48, .52], [{ kind: "hooked-beak", attach: "head" }, { kind: "long-tail", attach: "body" }]),
  "sunscale-ambusher": visualDesign("coil", [.82, .24, .82], "wedge", [.3, .22, .42], [0, .24, .58], [{ kind: "heat-pits", attach: "head" }]),
  "shieldback-colony": visualDesign("shell", [.9, .48, 1], "block", [.34, .28, .4], [0, .31, .66], [{ kind: "domed-shell", attach: "body" }]),
  "wild-boar": visualDesign("barrel", [.76, .48, .9], "wedge", [.38, .34, .48], [0, .4, .62], [{ kind: "large-ears", attach: "head" }, { kind: "tusks", attach: "head" }, { kind: "bristle-ridge", attach: "body" }, { kind: "short-tail", attach: "body" }]),
  "african-elephant": visualDesign("barrel", [1.08, .72, 1.08], "block", [.58, .52, .54], [0, .6, .74], [{ kind: "large-ears", attach: "head" }, { kind: "trunk", attach: "head" }, { kind: "tusks", attach: "head" }]),
  dromedary: visualDesign("long", [.76, .62, 1.08], "long", [.34, .35, .52], [0, .72, .75], [{ kind: "single-hump", attach: "body" }, { kind: "small-ears", attach: "head" }, { kind: "short-tail", attach: "body" }]),
  "common-ostrich": visualDesign("teardrop", [.64, .72, .72], "small", [.24, .25, .3], [0, 1.18, .54], [{ kind: "neck-column", attach: "body" }, { kind: "hooked-beak", attach: "head" }])
});

const silhouette = (bodyProfile, headProfile, featureGroups = [], options = {}) => freeze({
  bodyProfile, headProfile,
  featureGroups: freeze(featureGroups.map(group => freeze(group))),
  markings: freeze((options.markings || []).map(marking => freeze(marking))),
  bodyElevation: options.bodyElevation ?? null,
  footprint: options.footprint ?? 1,
  displayScale: options.displayScale ?? 1
});

const SILHOUETTE_RECIPES = freeze({
  "meadow-nibbler": silhouette("pear", "rounded", [{ kind: "long-ears", attach: "head" }, { kind: "short-tail", attach: "body" }], { displayScale: .92 }),
  "great-plains-grazer": silhouette("front-heavy", "blunt", [{ kind: "paired-horns", attach: "head" }], { footprint: 1.12 }),
  "woodland-browser": silhouette("elevated-deep", "elongated", [{ kind: "broad-antlers", attach: "head" }, { kind: "large-ears", attach: "head" }], { bodyElevation: .64, footprint: 1.12 }),
  "brush-fox": silhouette("long-oval", "pointed", [{ kind: "pointed-ears", attach: "head" }, { kind: "bushy-tail", attach: "body" }]),
  "shadow-stalker": silhouette("compact-loaf", "rounded", [{ kind: "tufted-ears", attach: "head" }, { kind: "short-tail", attach: "body" }]),
  "great-omnivore": silhouette("pear", "blunt", [{ kind: "round-ears", attach: "head" }], { footprint: 1.08 }),
  "dryland-runner": silhouette("slim-loaf", "elongated", [{ kind: "pronged-horns", attach: "head" }, { kind: "large-ears", attach: "head" }]),
  "highland-grazer": silhouette("compact-loaf", "tapered", [{ kind: "swept-horns", attach: "head" }]),
  "armoured-browser": silhouette("front-heavy", "downturned", [{ kind: "nasal-horns", attach: "head" }], { footprint: 1.16 }),
  "pack-breaker": silhouette("sloped-wedge", "blunt", [{ kind: "round-ears", attach: "head" }, { kind: "short-tail", attach: "body" }]),
  "carrion-runner": silhouette("teardrop", "bird", [{ kind: "head-crest", attach: "head" }], { displayScale: .94 }),
  "waterline-grazer": silhouette("low-loaf", "blunt", [{ kind: "small-ears", attach: "head" }]),
  "brush-nibbler": silhouette("lean-pear", "rounded", [{ kind: "long-ears", attach: "head" }, { kind: "short-tail", attach: "body" }]),
  "waterline-ambusher": silhouette("flattened-taper", "flat", [{ kind: "armoured-ridge", attach: "body" }], { footprint: 1.72, displayScale: .9 }),
  "northern-shaggy-grazer": silhouette("front-heavy", "blunt", [{ kind: "wide-horns", attach: "head" }], { markings: [{ kind: "dark-mantle", attach: "body" }] }),
  "highland-prowler": silhouette("long-oval", "rounded", [{ kind: "round-ears", attach: "head" }, { kind: "long-tail", attach: "body" }], { markings: [{ kind: "spots", attach: "body" }] }),
  "little-opportunist": silhouette("low-loaf", "pointed", [{ kind: "round-ears", attach: "head" }, { kind: "ringed-tail", attach: "body" }], { markings: [{ kind: "robber-mask", attach: "head" }, { kind: "tail-bands", attach: "body" }] }),
  "cold-country-scavenger": silhouette("teardrop", "bird", [{ kind: "feather-tail", attach: "body" }], { markings: [{ kind: "neck-ring", attach: "head" }] }),
  "sunscale-ambusher": silhouette("curved-tube", "serpent", [], { footprint: 1.34, markings: [{ kind: "snake-patches", attach: "body" }] }),
  "shieldback-colony": silhouette("dome", "blunt", [], { footprint: 1.06, markings: [{ kind: "shell-panels", attach: "body" }] }),
  "wild-boar": silhouette("front-heavy", "pointed", [{ kind: "large-ears", attach: "head" }, { kind: "tusks", attach: "head" }, { kind: "bristle-ridge", attach: "body" }]),
  "african-elephant": silhouette("deep-barrel", "broad", [{ kind: "ear-plates", attach: "head" }, { kind: "curved-trunk", attach: "head" }, { kind: "tusks", attach: "head" }], { footprint: 1.18 }),
  dromedary: silhouette("humped", "elongated", [{ kind: "small-ears", attach: "head" }, { kind: "short-tail", attach: "body" }], { bodyElevation: .72, footprint: 1.12 }),
  "common-ostrich": silhouette("teardrop", "bird", [], { bodyElevation: .78, footprint: 1.08, displayScale: .92 })
});

export const SPECIES_VISUAL_DESIGNS = freeze(Object.fromEntries(Object.entries(BASE_SPECIES_VISUAL_DESIGNS).map(([id, baseDesign]) => {
  if (!baseDesign) return [id, null];
  const recipe = SILHOUETTE_RECIPES[id];
  return [id, freeze({
    ...baseDesign,
    bodyShape: recipe.bodyProfile,
    headShape: recipe.headProfile,
    features: recipe.featureGroups,
    featureGroups: recipe.featureGroups,
    markings: recipe.markings,
    bodyElevation: recipe.bodyElevation,
    footprint: recipe.footprint,
    displayScale: recipe.displayScale
  })];
})));

export const ALLOWED_SILHOUETTE_BODY_PROFILES = freeze(["pear", "lean-pear", "front-heavy", "elevated-deep", "long-oval", "compact-loaf", "slim-loaf", "sloped-wedge", "teardrop", "low-loaf", "flattened-taper", "curved-tube", "dome", "deep-barrel", "humped"]);
export const ALLOWED_SILHOUETTE_HEAD_PROFILES = freeze(["rounded", "blunt", "elongated", "pointed", "tapered", "downturned", "bird", "flat", "serpent", "broad"]);
export function validateSpeciesVisualDesigns(designs = SPECIES_VISUAL_DESIGNS) {
  const errors = [];
  for (const [id, design] of Object.entries(designs)) {
    if (["grazer", "hunter"].includes(id)) { if (design !== null) errors.push(`${id} generic design must remain null`); continue; }
    if (!design) { errors.push(`${id} missing silhouette recipe`); continue; }
    if (!ALLOWED_SILHOUETTE_BODY_PROFILES.includes(design.bodyShape)) errors.push(`${id} invalid body profile`);
    if (!ALLOWED_SILHOUETTE_HEAD_PROFILES.includes(design.headShape)) errors.push(`${id} invalid head profile`);
    if ((design.featureGroups || []).length > 3) errors.push(`${id} has more than three logical feature groups`);
    for (const feature of design.featureGroups || []) if (/^(?:leg|foot|arm|wing)(?:$|-)|^folded-wings$/.test(feature.kind)) errors.push(`${id} uses forbidden limb feature ${feature.kind}`);
  }
  return errors;
}

const VISUAL_DESIGN_ERRORS = validateSpeciesVisualDesigns();
if (VISUAL_DESIGN_ERRORS.length) throw new Error(`Invalid species silhouette registry: ${VISUAL_DESIGN_ERRORS.join("; ")}`);

const entry = (id, values) => {
  const lifeHistory = lifeHistoryFor(id);
  return freeze({
    ...base,
    id,
    symbol: values.symbol,
    ...values,
    ...legacySpeciesTiming(id),
    lifeHistory,
    reproduction: lifeHistory.reproduction,
    biology: biologicalPhenotype(id),
    visual: SPECIES_VISUAL_DESIGNS[id],
    diet: values.guild === "herbivore" ? "plants" : values.guild === "omnivore" ? "mixed" : "meat"
  });
};

export const SPECIES = freeze({
  grazer: entry("grazer", { label: "Valley Grazer", generic: true, realLifeBasis: "average deer", symbol: "VG", guild: "herbivore", feeding: "grass", sizeClass: "medium", adultMass: 65, speed: 1, vision: 8, smell: 5, hearing: 7, energyCapacity: 120, enduranceMultiplier: 1, reproductionEnergy: 70, femaleCriticalFat: 12, hungerRate: .18, thirstRate: .65, maternalCare: .9, herdTendency: .65, social: "stable-herd", habitat: "grassland", colour: 0xe6bc52, enabledByDefault: true, defaultPopulation: 18 }),
  hunter: entry("hunter", { label: "Ridge Hunter", generic: true, realLifeBasis: "average grey wolf", symbol: "RH", guild: "carnivore", feeding: "prey-carrion", sizeClass: "medium", adultMass: 42, speed: 1, vision: 11, smell: 8, hearing: 7, energyCapacity: 360, enduranceMultiplier: 3, reproductionEnergy: 78, femaleCriticalFat: 10, hungerRate: .045, thirstRate: .65, maternalCare: .72, herdTendency: .22, social: "pack", hunting: "pursuit", preySizes: ["small", "medium"], habitat: "open", colour: 0xd96cff, enabledByDefault: true, defaultPopulation: 4 }),
  "meadow-nibbler": entry("meadow-nibbler", { label: "European Rabbit", scientificName: "Oryctolagus cuniculus", symbol: "ER", guild: "herbivore", feeding: "grass", sizeClass: "tiny", adultMass: 4, speed: 1.12, vision: 8, hearing: 10, energyCapacity: 55, hungerRate: .26, thirstRate: .52, herdTendency: .4, social: "colony", habitat: "cover-edge", colour: 0x8d795e, enabledByDefault: true, defaultPopulation: 12 }),
  "great-plains-grazer": entry("great-plains-grazer", { label: "American Bison", scientificName: "Bison bison", symbol: "BI", guild: "herbivore", feeding: "grass", sizeClass: "large", adultMass: 500, speed: .78, energyCapacity: 250, hungerRate: .24, thirstRate: .82, maternalCare: .9, herdTendency: .85, social: "large-herd", habitat: "long-grass", defence: "mass", colour: 0x6f4d32, enabledByDefault: true, defaultPopulation: 6 }),
  "woodland-browser": entry("woodland-browser", { label: "Moose", scientificName: "Alces alces", symbol: "MO", guild: "herbivore", feeding: "shrub", sizeClass: "large", adultMass: 450, speed: .94, energyCapacity: 220, hungerRate: .19, thirstRate: .65, maternalCare: .96, herdTendency: .18, social: "family", habitat: "woodland", defence: "mass", colour: 0x66513d, enabledByDefault: true, defaultPopulation: 7 }),
  "brush-fox": entry("brush-fox", { label: "Red Fox", scientificName: "Vulpes vulpes", symbol: "RF", guild: "carnivore", feeding: "prey-carrion", sizeClass: "small", adultMass: 9, speed: 1.18, vision: 10, smell: 10, hearing: 11, energyCapacity: 155, enduranceMultiplier: 1.25, hungerRate: .08, thirstRate: .5, herdTendency: .08, social: "pair", hunting: "small-prey", preySizes: ["tiny", "small"], habitat: "cover-edge", colour: 0xc86d36, enabledByDefault: true, defaultPopulation: 4 }),
  "shadow-stalker": entry("shadow-stalker", { label: "Eurasian Lynx", scientificName: "Lynx lynx", symbol: "EL", guild: "carnivore", feeding: "prey-carrion", sizeClass: "medium", adultMass: 22, speed: 1.16, vision: 12, smell: 7, hearing: 10, energyCapacity: 300, enduranceMultiplier: .72, hungerRate: .05, thirstRate: .5, maternalCare: .98, herdTendency: .03, social: "solitary", hunting: "ambush", preySizes: ["tiny", "small", "medium"], habitat: "woodland", colour: 0x9b7655, enabledByDefault: true, defaultPopulation: 3 }),
  "great-omnivore": entry("great-omnivore", { label: "Brown Bear", scientificName: "Ursus arctos", symbol: "BB", guild: "omnivore", feeding: "mixed", sizeClass: "large", adultMass: 260, speed: .82, smell: 11, energyCapacity: 420, enduranceMultiplier: 1.2, hungerRate: .075, thirstRate: .75, maternalCare: .95, herdTendency: .02, social: "solitary", hunting: "opportunist", preySizes: ["tiny", "small", "medium"], habitat: "woodland-edge", defence: "mass", colour: 0x76513b, enabledByDefault: true, defaultPopulation: 2 }),
  "dryland-runner": entry("dryland-runner", { label: "Pronghorn", scientificName: "Antilocapra americana", symbol: "PR", guild: "herbivore", feeding: "grass", sizeClass: "medium", adultMass: 50, speed: 1.28, enduranceMultiplier: 1.7, thirstRate: .4, herdTendency: .65, social: "fluid-herd", habitat: "arid", colour: 0xc89b64, enabledByDefault: true, defaultPopulation: 7 }),
  "highland-grazer": entry("highland-grazer", { label: "Alpine Ibex", scientificName: "Capra ibex", symbol: "AI", guild: "herbivore", feeding: "grass", sizeClass: "medium", adultMass: 72, speed: .9, thirstRate: .58, herdTendency: .55, social: "seasonal-herd", habitat: "alpine", coldAdapted: true, colour: 0x8d7e6b, enabledByDefault: false, defaultPopulation: 5 }),
  "armoured-browser": entry("armoured-browser", { label: "Black Rhinoceros", scientificName: "Diceros bicornis", symbol: "BR", guild: "herbivore", feeding: "mixed-plants", sizeClass: "large", adultMass: 900, speed: .72, energyCapacity: 340, hungerRate: .22, thirstRate: .95, herdTendency: .05, social: "solitary", habitat: "scrub", defence: "armoured", colour: 0x747c75, enabledByDefault: true, defaultPopulation: 3 }),
  "pack-breaker": entry("pack-breaker", { label: "Spotted Hyena", scientificName: "Crocuta crocuta", symbol: "SH", guild: "carnivore", feeding: "prey-carrion", sizeClass: "large", adultMass: 65, speed: .98, energyCapacity: 520, enduranceMultiplier: 2.2, hungerRate: .06, thirstRate: .72, herdTendency: .7, social: "pack", hunting: "large-prey", preySizes: ["large", "giant"], habitat: "open", colour: 0x9a7446, enabledByDefault: true, defaultPopulation: 3 }),
  "carrion-runner": entry("carrion-runner", { label: "Southern Ground Hornbill", scientificName: "Bucorvus leadbeateri", symbol: "GH", guild: "scavenger", feeding: "carrion", sizeClass: "small", adultMass: 4, speed: 1.02, smell: 6, energyCapacity: 120, hungerRate: .065, thirstRate: .5, herdTendency: .35, social: "family-groups", habitat: "open", colour: 0x292729, enabledByDefault: true, defaultPopulation: 3 }),
  "waterline-grazer": entry("waterline-grazer", { label: "Capybara", scientificName: "Hydrochoerus hydrochaeris", symbol: "CA", guild: "herbivore", feeding: "grass", sizeClass: "medium", adultMass: 55, speed: .86, thirstRate: 1.05, herdTendency: .5, social: "small-herd", habitat: "riparian", colour: 0x80664c, enabledByDefault: false, defaultPopulation: 5 }),
  "brush-nibbler": entry("brush-nibbler", { label: "Snowshoe Hare", scientificName: "Lepus americanus", symbol: "SN", guild: "herbivore", feeding: "shrub", sizeClass: "tiny", adultMass: 2, speed: 1.05, hearing: 10, hungerRate: .24, thirstRate: .42, herdTendency: .08, social: "solitary", habitat: "woodland", defence: "conceal", colour: 0xb6aa95, enabledByDefault: false, defaultPopulation: 8 }),
  "waterline-ambusher": entry("waterline-ambusher", { label: "Nile Crocodile", scientificName: "Crocodylus niloticus", symbol: "NC", guild: "carnivore", feeding: "prey-carrion", sizeClass: "large", adultMass: 350, speed: 1.05, energyCapacity: 500, enduranceMultiplier: .8, hearing: 9, hungerRate: .055, herdTendency: .02, social: "territorial", hunting: "water-ambush", preySizes: ["small", "medium", "large"], habitat: "riparian", colour: 0x42523a, enabledByDefault: false, defaultPopulation: 2 }),
  "northern-shaggy-grazer": entry("northern-shaggy-grazer", { label: "Musk Ox", scientificName: "Ovibos moschatus", symbol: "MX", guild: "herbivore", feeding: "mixed-plants", sizeClass: "large", adultMass: 285, speed: .74, energyCapacity: 270, hungerRate: .21, thirstRate: .58, herdTendency: .8, social: "seasonal-herd", habitat: "boreal", coldAdapted: true, colour: 0x4f4037, enabledByDefault: false, defaultPopulation: 5 }),
  "highland-prowler": entry("highland-prowler", { label: "Snow Leopard", scientificName: "Panthera uncia", symbol: "SL", guild: "carnivore", feeding: "prey-carrion", sizeClass: "medium", adultMass: 40, speed: 1.08, energyCapacity: 370, enduranceMultiplier: 1.15, hungerRate: .05, herdTendency: .02, social: "solitary", hunting: "terrain-ambush", preySizes: ["small", "medium"], habitat: "alpine", coldAdapted: true, colour: 0xb5b7b0, enabledByDefault: false, defaultPopulation: 2 }),
  "little-opportunist": entry("little-opportunist", { label: "Raccoon", scientificName: "Procyon lotor", symbol: "RA", guild: "omnivore", feeding: "mixed", sizeClass: "small", adultMass: 8, speed: 1.03, smell: 10, energyCapacity: 160, hungerRate: .09, thirstRate: .48, herdTendency: .12, social: "family", hunting: "opportunist", preySizes: ["tiny"], habitat: "cover-edge", colour: 0x77736d, enabledByDefault: false, defaultPopulation: 3 }),
  "cold-country-scavenger": entry("cold-country-scavenger", { label: "Common Pheasant", scientificName: "Phasianus colchicus", symbol: "PH", guild: "omnivore", feeding: "mixed", sizeClass: "small", adultMass: 1.3, speed: .98, smell: 5, energyCapacity: 90, enduranceMultiplier: .8, hungerRate: .08, thirstRate: .42, herdTendency: .3, social: "loose-flock", habitat: "cold-grassland", coldAdapted: true, colour: 0x8e5732, enabledByDefault: false, defaultPopulation: 4 }),
  "sunscale-ambusher": entry("sunscale-ambusher", { label: "Ball Python", scientificName: "Python regius", symbol: "BP", guild: "carnivore", feeding: "prey", sizeClass: "small", adultMass: 2, speed: .72, vision: 6, smell: 10, hearing: 5, energyCapacity: 150, enduranceMultiplier: .45, hungerRate: .025, thirstRate: .3, maternalCare: .45, herdTendency: 0, social: "territorial", hunting: "thermal-ambush", preySizes: ["tiny", "small"], habitat: "warm-open", colour: 0x9b6b35, enabledByDefault: false, defaultPopulation: 2 }),
  "shieldback-colony": entry("shieldback-colony", { label: "African Spurred Tortoise", scientificName: "Centrochelys sulcata", symbol: "AT", guild: "herbivore", feeding: "mixed-plants", sizeClass: "medium", adultMass: 70, speed: .45, vision: 4, smell: 8, hearing: 5, energyCapacity: 150, enduranceMultiplier: .75, hungerRate: .11, thirstRate: .48, maternalCare: 0, herdTendency: .08, social: "solitary", habitat: "arid", defence: "shell", colour: 0x9a855a, enabledByDefault: false, defaultPopulation: 4 }),
  "wild-boar": entry("wild-boar", { label: "Wild Boar", scientificName: "Sus scrofa", symbol: "WB", guild: "omnivore", feeding: "mixed", sizeClass: "medium", adultMass: 90, speed: 1.02, vision: 7, smell: 12, hearing: 9, energyCapacity: 240, enduranceMultiplier: 1.05, hungerRate: .085, thirstRate: .72, maternalCare: .9, herdTendency: .55, social: "sounder", hunting: "opportunist", preySizes: ["tiny"], habitat: "woodland-edge", defence: "tusks", colour: 0x765b48, enabledByDefault: false, defaultPopulation: 5 }),
  "african-elephant": entry("african-elephant", { label: "African Bush Elephant", scientificName: "Loxodonta africana", symbol: "AE", guild: "herbivore", feeding: "mixed-plants", sizeClass: "large", adultMass: 4500, speed: .58, vision: 7, smell: 13, hearing: 11, energyCapacity: 760, enduranceMultiplier: 1.2, hungerRate: .2, thirstRate: 1.25, maternalCare: 1, herdTendency: .88, social: "matriarchal-herd", habitat: "open-woodland", defence: "mass", colour: 0x85847d, enabledByDefault: false, defaultPopulation: 3 }),
  dromedary: entry("dromedary", { label: "Dromedary", scientificName: "Camelus dromedarius", symbol: "DC", guild: "herbivore", feeding: "mixed-plants", sizeClass: "large", adultMass: 500, speed: .82, vision: 9, smell: 9, hearing: 8, energyCapacity: 360, enduranceMultiplier: 1.65, hungerRate: .14, thirstRate: .2, maternalCare: .92, herdTendency: .6, social: "fluid-herd", habitat: "arid", defence: "mass", colour: 0xb68b5f, enabledByDefault: false, defaultPopulation: 5 }),
  "common-ostrich": entry("common-ostrich", { label: "Common Ostrich", scientificName: "Struthio camelus", symbol: "OS", guild: "herbivore", feeding: "mixed-plants", sizeClass: "large", adultMass: 110, speed: 1.38, vision: 13, smell: 5, hearing: 8, energyCapacity: 250, enduranceMultiplier: 1.4, hungerRate: .13, thirstRate: .42, maternalCare: .72, herdTendency: .48, social: "loose-flock", habitat: "open-arid", defence: "kick", colour: 0x403a35, enabledByDefault: false, defaultPopulation: 5 })
});

export const SPECIES_IDS = freeze(Object.keys(SPECIES));

// Explicit trophic preferences keep every catalogue species ecologically distinct.
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
  "cold-country-scavenger": freeze({ plants: freeze({ grass: .85, shrub: 1.05, tree: .12 }), carrion: freeze({ "meadow-nibbler": .18, "brush-nibbler": .18 }) }),
  "sunscale-ambusher": freeze({ plants: freeze({ grass: 0, shrub: 0, tree: 0 }), carrion: freeze({ "meadow-nibbler": 1.2, "brush-nibbler": 1.1, "shieldback-colony": .35, "great-plains-grazer": .05 }) }),
  "shieldback-colony": freeze({ plants: freeze({ grass: .8, shrub: 1.05, tree: .18 }), carrion: freeze({}) }),
  "wild-boar": freeze({ plants: freeze({ grass: .58, shrub: 1.1, tree: .28 }), carrion: freeze({ "meadow-nibbler": 1.05, "brush-nibbler": 1, "common-ostrich": .2, grazer: .12 }) }),
  "african-elephant": freeze({ plants: freeze({ grass: .88, shrub: 1.25, tree: .82 }), carrion: freeze({}) }),
  dromedary: freeze({ plants: freeze({ grass: .78, shrub: 1.25, tree: .12 }), carrion: freeze({}) }),
  "common-ostrich": freeze({ plants: freeze({ grass: 1.08, shrub: .72, tree: 0 }), carrion: freeze({}) })
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
  "sunscale-ambusher": freeze({ mode: "mating-territory", territoriality: .84, radius: 8, breedingMultiplier: 1.4 }), "shieldback-colony": freeze({ mode: "home-range", territoriality: .12, radius: 9 }),
  "wild-boar": freeze({ mode: "core-range", territoriality: .3, radius: 12 }), "african-elephant": freeze({ mode: "seasonal-home-range", territoriality: .08, radius: 24 }),
  dromedary: freeze({ mode: "seasonal-home-range", territoriality: .08, radius: 20 }), "common-ostrich": freeze({ mode: "home-range", territoriality: .14, radius: 16 })
});

const habitat = (preferred, tolerated, moisture, temperature, cover) => freeze({
  preferred: freeze(preferred), tolerated: freeze(tolerated), moisture: freeze(moisture), temperature: freeze(temperature), cover: freeze(cover)
});

// Habitat is described by structure and climate rather than by a painted biome
// name. These profiles let the same forest, grassland or dryland grade from
// sparse to dense while still creating meaningful animal preferences.
export const HABITAT_ECOLOGY = freeze({
  grazer: habitat(["short-grassland", "tall-grassland"], ["open-woodland", "dry-grassland", "wet-meadow"], [.28, .7], [-8, 28], [0, .42]),
  hunter: habitat(["open-woodland", "short-grassland", "boreal-forest"], ["tall-grassland", "temperate-forest", "dry-grassland"], [.2, .78], [-18, 28], [.08, .72]),
  "meadow-nibbler": habitat(["short-grassland", "open-woodland"], ["tall-grassland", "shrubland", "dry-grassland"], [.25, .68], [-5, 28], [.12, .62]),
  "great-plains-grazer": habitat(["tall-grassland", "short-grassland"], ["dry-grassland", "open-woodland"], [.2, .68], [-12, 30], [0, .34]),
  "woodland-browser": habitat(["boreal-forest", "riparian-woodland", "shrub-swamp"], ["temperate-forest", "wooded-swamp", "riparian-thicket"], [.45, .92], [-20, 20], [.38, 1]),
  "brush-fox": habitat(["open-woodland", "shrubland", "short-grassland"], ["temperate-forest", "dry-grassland", "riparian-thicket"], [.18, .76], [-15, 28], [.08, .72]),
  "shadow-stalker": habitat(["temperate-forest", "boreal-forest"], ["open-woodland", "riparian-woodland", "shrubland"], [.28, .82], [-20, 24], [.34, 1]),
  "great-omnivore": habitat(["temperate-forest", "boreal-forest", "riparian-woodland"], ["open-woodland", "shrubland", "wet-meadow"], [.28, .86], [-20, 28], [.25, 1]),
  "dryland-runner": habitat(["dry-grassland", "short-grassland"], ["thorn-scrub", "cold-desert", "open-woodland"], [.08, .46], [-12, 34], [0, .3]),
  "highland-grazer": habitat(["cold-grassland", "cold-scrub", "rock"], ["tundra", "boreal-forest", "cold-desert"], [.16, .62], [-24, 18], [0, .48]),
  "armoured-browser": habitat(["thorn-scrub", "shrubland", "savanna"], ["dry-forest", "dry-grassland", "riparian-thicket"], [.14, .58], [10, 36], [.08, .68]),
  "pack-breaker": habitat(["savanna", "dry-grassland", "short-grassland"], ["thorn-scrub", "open-woodland", "tall-grassland"], [.12, .58], [8, 36], [0, .48]),
  "carrion-runner": habitat(["short-grassland", "dry-grassland", "savanna"], ["open-woodland", "thorn-scrub", "rock"], [.08, .62], [-5, 38], [0, .38]),
  "waterline-grazer": habitat(["wet-meadow", "marsh", "riparian-thicket"], ["shrub-swamp", "riparian-woodland", "tall-grassland"], [.62, 1], [10, 36], [.08, .76]),
  "brush-nibbler": habitat(["boreal-forest", "cold-scrub", "riparian-thicket"], ["temperate-forest", "shrubland", "open-woodland"], [.3, .82], [-24, 20], [.32, 1]),
  "waterline-ambusher": habitat(["open-water", "marsh", "wooded-swamp"], ["shrub-swamp", "riparian-woodland", "wet-meadow"], [.72, 1], [18, 40], [.05, .9]),
  "northern-shaggy-grazer": habitat(["tundra", "cold-grassland"], ["cold-scrub", "cold-desert", "boreal-forest"], [.12, .62], [-30, 14], [0, .42]),
  "highland-prowler": habitat(["rock", "cold-desert", "cold-scrub"], ["cold-grassland", "tundra", "boreal-forest"], [.08, .5], [-28, 16], [0, .58]),
  "little-opportunist": habitat(["riparian-woodland", "temperate-forest", "riparian-thicket"], ["open-woodland", "wooded-swamp", "shrubland"], [.35, .9], [-12, 30], [.28, 1]),
  "cold-country-scavenger": habitat(["rock", "cold-desert", "cold-grassland"], ["tundra", "cold-scrub", "boreal-forest"], [.08, .58], [-24, 20], [0, .38]),
  "sunscale-ambusher": habitat(["savanna", "open-woodland", "shrubland"], ["dry-grassland", "riparian-thicket", "thorn-scrub"], [.2, .68], [20, 38], [.16, .72]),
  "shieldback-colony": habitat(["thorn-scrub", "dry-grassland", "hot-desert"], ["savanna", "shrubland", "short-grassland"], [.06, .42], [16, 42], [0, .44]),
  "wild-boar": habitat(["temperate-forest", "riparian-woodland", "shrub-swamp"], ["wooded-swamp", "open-woodland", "riparian-thicket"], [.38, .92], [-8, 30], [.28, 1]),
  "african-elephant": habitat(["savanna", "open-woodland", "riparian-woodland"], ["dry-forest", "tall-grassland", "shrubland"], [.22, .78], [14, 40], [.05, .7]),
  dromedary: habitat(["hot-desert", "thorn-scrub", "dry-grassland"], ["savanna", "bare-ground", "short-grassland"], [.02, .34], [12, 44], [0, .34]),
  "common-ostrich": habitat(["savanna", "dry-grassland", "short-grassland"], ["thorn-scrub", "hot-desert", "open-woodland"], [.08, .5], [10, 42], [0, .32])
});

const rangeScore = (value, [minimum, maximum]) => value >= minimum && value <= maximum ? 1 : value < minimum ? Math.max(0, 1 - (minimum - value) / Math.max(1, Math.abs(minimum) + 10)) : Math.max(0, 1 - (value - maximum) / Math.max(1, Math.abs(maximum) + 10));
export function habitatSuitability(subject, cell = {}) {
  const profile = HABITAT_ECOLOGY[typeof subject === "string" ? subject : subject?.speciesId];
  if (!profile || !cell || cell.rocky && !profile.preferred.includes("rock") && !profile.tolerated.includes("rock")) return .05;
  const type = cell.habitatType || cell.habitatLabel?.replaceAll(" ", "-") || "short-grassland";
  const structural = profile.preferred.includes(type) ? 1 : profile.tolerated.includes(type) ? .72 : .22;
  const moisture = Number(cell.waterAvailability ?? cell.ecoMoisture ?? cell.moisture) || 0;
  const temperature = Number.isFinite(Number(cell.temperature)) ? Number(cell.temperature) : 15;
  const cover = Math.max(Number(cell.canopyDensity ?? cell.canopyCover) || 0, Number(cell.understoryDensity) || 0);
  return Math.max(.03, Math.min(1, structural * .52 + rangeScore(moisture, profile.moisture) * .2 + rangeScore(temperature, profile.temperature) * .18 + rangeScore(cover, profile.cover) * .1));
}
export function habitatPreferenceSummary(subject) {
  const profile = HABITAT_ECOLOGY[typeof subject === "string" ? subject : subject?.speciesId];
  return profile ? { ...profile, preferred: [...profile.preferred], tolerated: [...profile.tolerated] } : null;
}
export function selectHabitatWeighted(subject, candidates = [], roll = Math.random()) {
  if (!candidates.length) return null;
  const weighted = candidates.map(cell => ({ cell, weight: .08 + habitatSuitability(subject, cell) ** 2 }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.max(0, Math.min(.999999999, Number(roll) || 0)) * total;
  for (const item of weighted) { cursor -= item.weight; if (cursor <= 0) return item.cell; }
  return weighted[weighted.length - 1].cell;
}

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
export { BIOLOGICAL_PHENOTYPES, LIFE_HISTORY };
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
  compact: freeze(["grazer", "hunter", "meadow-nibbler", "brush-fox", "carrion-runner", "shieldback-colony"]),
  "compact-large": freeze(["great-plains-grazer", "armoured-browser", "northern-shaggy-grazer", "dryland-runner", "hunter", "pack-breaker", "waterline-ambusher", "great-omnivore"]),
  "compact-small": freeze(["meadow-nibbler", "brush-nibbler", "dryland-runner", "shieldback-colony", "brush-fox", "sunscale-ambusher", "carrion-runner", "little-opportunist"]),
  "compact-open": freeze(["grazer", "meadow-nibbler", "great-plains-grazer", "dryland-runner", "hunter", "brush-fox", "pack-breaker", "carrion-runner"]),
  "compact-woodland": freeze(["woodland-browser", "brush-nibbler", "meadow-nibbler", "shieldback-colony", "brush-fox", "shadow-stalker", "great-omnivore", "little-opportunist"]),
  balanced: freeze(["grazer", "hunter", "meadow-nibbler", "brush-fox", "carrion-runner", "shieldback-colony", "great-plains-grazer", "woodland-browser", "shadow-stalker", "great-omnivore", "waterline-grazer", "pack-breaker", "wild-boar", "common-ostrich"]),
  expanded: freeze(["grazer", "hunter", "meadow-nibbler", "brush-fox", "carrion-runner", "shieldback-colony", "great-plains-grazer", "woodland-browser", "shadow-stalker", "great-omnivore", "waterline-grazer", "pack-breaker", "wild-boar", "common-ostrich", "dryland-runner", "highland-grazer", "armoured-browser", "waterline-ambusher", "northern-shaggy-grazer", "highland-prowler"]),
  full: SPECIES_IDS
});

export const WORLD_SCALE_ECOLOGY_PRESETS = freeze({ 1: "compact", 2: "balanced", 3: "expanded", 4: "full" });
export const WORLD_SCALE_ECOLOGY_DESIGNS = freeze({
  1: freeze({ label: "Compact", speciesCount: 6, factors: freeze(["two retained generic baselines", "small prey and predator", "carrion recycling", "live birth and unattended eggs"]) }),
  2: freeze({ label: "Medium", speciesCount: 14, factors: freeze(["herd and solitary life", "ambush and social hunting", "omnivory", "riparian life", "attended and unattended eggs"]) }),
  3: freeze({ label: "Standard", speciesCount: 20, factors: freeze(["arid, alpine, boreal and riparian specialists", "armour and megaherbivory", "endotherms and ectotherms", "seasonal and opportunistic reproduction"]) }),
  4: freeze({ label: "Vast", speciesCount: SPECIES_IDS.length, factors: freeze(["the complete factor-based catalogue", "extreme lifespan and drought physiology", "specialist scavenging and thermal sensing", "all implemented social and reproductive forms"]) })
});
export function ecologyPresetForWorldScale(span = 1) {
  const bounded = Math.max(1, Math.min(4, Math.round(Number(span) || 1)));
  return WORLD_SCALE_ECOLOGY_PRESETS[bounded];
}
export function ecologyRosterForWorldScale(span = 1) {
  return ECOLOGY_PRESETS[ecologyPresetForWorldScale(span)];
}

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
    "sunscale-ambusher": 1, "shieldback-colony": 1, "wild-boar": 5,
    "african-elephant": 3, dromedary: 5, "common-ostrich": 5
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
  if (active("shieldback-colony") && exact["shieldback-colony"] < 2) warnings.push("African Spurred Tortoise has only one founder; a second founder is recommended for reproduction.");
  if (active("sunscale-ambusher") && !SPECIES_IDS.some(prey => active(prey) && preyCompatible("sunscale-ambusher", prey))) warnings.push("Ball Python has no enabled tiny or small herbivore prey.");
  return warnings;
}
