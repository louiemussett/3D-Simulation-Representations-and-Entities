const freeze = value => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
};

export const ACOUSTIC_PROFILE_SCHEMA = 1;
export const ACOUSTIC_EVIDENCE_GRADES = freeze([
  "measured-exact-species", "observed-exact-species", "inferred-exact-species",
  "genus-proxy", "family-proxy", "composite-model", "unknown"
]);
export const ACOUSTIC_FREQUENCY_BANDS_HZ = freeze([63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000]);

const SOURCES = freeze({
  iso9613: { id: "iso-9613-1", title: "ISO 9613-1 atmospheric absorption", url: "https://www.iso.org/standard/17426.html", role: "environmental-calibration" },
  aad: { id: "animal-audiogram-database", title: "Animal Audiogram Database", url: "https://www.animalaudiograms.org/", role: "audiogram-index" },
  macaulay: { id: "macaulay-library", title: "Macaulay Library", url: "https://www.macaulaylibrary.org/manage-files-data/", role: "reference-recording-metadata" },
  tierstimmen: { id: "tierstimmenarchiv", title: "Museum für Naturkunde Animal Sound Archive", url: "https://www.museumfuernaturkunde.berlin/forschung/sammlung/tierstimmenarchiv/", role: "reference-recording-archive" },
  xeno: { id: "xeno-canto-land-mammals", title: "Xeno-canto land-mammal metadata through GBIF", url: "https://www.gbif.org/dataset/80f94317-a61f-477f-af06-037632ad6e3b", role: "reference-metadata", licence: "CC BY-NC 4.0; metadata/research reference only" },
  redDeerSourceFilter: { id: "garcia-etal-2013-red-deer-source-filter", title: "Do Red Deer Stags Use Roar Fundamental Frequency to Assess Rivals?", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3875517/", role: "exact-species-call-structure", licence: "CC BY" },
  redDeerAnatomy: { id: "frey-etal-2012-iberian-red-deer", title: "Vocal anatomy, tongue protrusion behaviour and the acoustics of rutting roars in free-ranging Iberian red deer stags", url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC3381621/", role: "exact-species-source-filter-anatomy" },
  redDeerMeasurements: { id: "hurtado-etal-red-deer-vocalisations", title: "Comparison of vocalisations of introduced European red deer stags in north-western Patagonia with native European populations", url: "https://www.deerlab.org/Publ/pdfs/62.pdf", role: "exact-species-call-measurements" },
  wolfHowl: { id: "palacios-etal-2007-iberian-wolf-howls", title: "Iberian wolf howls: acoustic structure, individual variation, and comparison with North American populations", url: "https://www.uv.es/fon/Palacios_etal2007.pdf", role: "exact-species-howl-structure" }
});
export const ACOUSTIC_RESEARCH_SOURCES = SOURCES;

const audiogram = (low, bestLow, bestHigh, high, bestThreshold = 0, grade = "composite-model") => ACOUSTIC_FREQUENCY_BANDS_HZ.map(frequencyHz => {
  const below = frequencyHz < bestLow ? Math.log2(bestLow / frequencyHz) * 9 : 0;
  const above = frequencyHz > bestHigh ? Math.log2(frequencyHz / bestHigh) * 11 : 0;
  const outside = frequencyHz < low || frequencyHz > high ? 34 : 0;
  return freeze({ frequencyHz, thresholdDb: Math.round((bestThreshold + below + above + outside) * 10) / 10, method: "comparative-model", evidenceGrade: grade, sourceIds: ["animal-audiogram-database"] });
});

const sensors = (kind, mobility, directionality, evidenceGrade = "composite-model") => freeze([
  { id: "left-ear", type: kind, side: "left", localPosition: [-.22, .12, .04], yawDegrees: -28, mobilityDegrees: mobility, directionality, evidenceGrade },
  { id: "right-ear", type: kind, side: "right", localPosition: [.22, .12, .04], yawDegrees: 28, mobilityDegrees: mobility, directionality, evidenceGrade }
]);

const CALL_LIBRARY = freeze({
  contact: { signalKind: "contact", mechanism: "voiced", sourceLevelDb: 72, durationSeconds: .62, centreFrequencyHz: 700, bandwidthOctaves: 2, synthesis: "mammal-laryngeal", synthesisShape: { attack: .08, release: .18, pitchStart: .92, pitchEnd: 1.04, syllables: 1 } },
  alarm: { signalKind: "alarm", mechanism: "voiced", sourceLevelDb: 84, durationSeconds: .42, centreFrequencyHz: 1100, bandwidthOctaves: 2.3, synthesis: "mammal-laryngeal", synthesisShape: { attack: .015, release: .12, pitchStart: 1.18, pitchEnd: .88, syllables: 2, syllableGap: .055 } },
  threat: { signalKind: "threat", mechanism: "rough-voiced", sourceLevelDb: 88, durationSeconds: .92, centreFrequencyHz: 420, bandwidthOctaves: 2, synthesis: "mammal-laryngeal", synthesisShape: { attack: .045, release: .25, pitchStart: .82, pitchEnd: .7, syllables: 1, breathiness: .17, harmonicRolloff: .95 } },
  care: { signalKind: "care", mechanism: "voiced", sourceLevelDb: 68, durationSeconds: .48, centreFrequencyHz: 950, bandwidthOctaves: 1.6, synthesis: "mammal-laryngeal", synthesisShape: { attack: .08, release: .2, pitchStart: 1.04, pitchEnd: .95, syllables: 2, syllableGap: .07 } },
  separated: { signalKind: "separated", mechanism: "voiced", sourceLevelDb: 78, durationSeconds: 1.05, centreFrequencyHz: 1250, bandwidthOctaves: 2, synthesis: "mammal-laryngeal", synthesisShape: { attack: .12, release: .28, pitchStart: .84, pitchEnd: 1.12, syllables: 2, syllableGap: .12 } },
  courtship: { signalKind: "courtship", mechanism: "voiced", sourceLevelDb: 80, durationSeconds: 1.35, centreFrequencyHz: 520, bandwidthOctaves: 2.2, synthesis: "mammal-laryngeal", synthesisShape: { attack: .16, release: .28, pitchStart: .9, pitchEnd: .76, syllables: 1, formantsHz: [500, 1050, 2050], formantBandwidthHz: [180, 260, 400] } }
});

const FOUNDER_CALL_OVERRIDES = freeze({
  grazer: {
    courtship: { mechanism: "common-roar", sourceLevelDb: 80, durationSeconds: 1.43, centreFrequencyHz: 132, bandwidthOctaves: 4.6, evidenceGrade: "measured-exact-species", confidence: .84, sourceIds: ["hurtado-etal-red-deer-vocalisations", "garcia-etal-2013-red-deer-source-filter", "frey-etal-2012-iberian-red-deer"], parameterEvidence: { durationSeconds: "measured-exact-species", centreFrequencyHz: "measured-exact-species", formantSpacingHz: "measured-exact-species", sourceLevelDb: "composite-model" }, synthesisShape: { attack: .18, release: .3, pitchStart: 1.06, pitchEnd: .93, syllables: 1, harmonicRolloff: .9, formantsHz: [245, 735, 1225, 1715, 2205], formantBandwidthHz: [85, 115, 150, 190, 230], breathiness: .1, jitter: .02, vibratoRate: 3.1, vibratoDepth: .008 } },
    threat: { mechanism: "harsh-roar", sourceLevelDb: 80, durationSeconds: .65, centreFrequencyHz: 132, bandwidthOctaves: 4.8, evidenceGrade: "measured-exact-species", confidence: .75, sourceIds: ["hurtado-etal-red-deer-vocalisations", "frey-etal-2012-iberian-red-deer"], parameterEvidence: { durationSeconds: "measured-exact-species", centreFrequencyHz: "inferred-exact-species", sourceLevelDb: "composite-model" }, synthesisShape: { attack: .055, release: .2, pitchStart: 1.04, pitchEnd: .82, harmonicRolloff: .78, formantsHz: [245, 735, 1225, 1715], formantBandwidthHz: [110, 150, 190, 240], breathiness: .22, jitter: .055 } },
    alarm: { mechanism: "bark", sourceLevelDb: 82, durationSeconds: .23, centreFrequencyHz: 720, bandwidthOctaves: 4.2, evidenceGrade: "measured-exact-species", confidence: .72, sourceIds: ["hurtado-etal-red-deer-vocalisations"], parameterEvidence: { durationSeconds: "measured-exact-species", centreFrequencyHz: "measured-exact-species-range", sourceLevelDb: "composite-model" }, synthesisShape: { attack: .006, release: .11, pitchStart: 1.12, pitchEnd: .72, syllables: 1, harmonicRolloff: .72, formantsHz: [520, 1220, 2260], formantBandwidthHz: [210, 330, 480], breathiness: .36, jitter: .075 } }
  },
  hunter: {
    contact: { mechanism: "howl", sourceLevelDb: 95, durationSeconds: 5.5, centreFrequencyHz: 430, bandwidthOctaves: 3.4, evidenceGrade: "inferred-exact-species", confidence: .82, sourceIds: ["palacios-etal-2007-iberian-wolf-howls"], parameterEvidence: { durationSeconds: "measured-exact-species-range", centreFrequencyHz: "measured-exact-species-range", harmonicCount: "measured-exact-species", sourceLevelDb: "composite-model" }, synthesisShape: { attack: .48, release: .72, pitchStart: .78, pitchEnd: 1.08, syllables: 1, harmonicRolloff: 1.08, formantsHz: [860, 1290, 2150], formantBandwidthHz: [170, 220, 340], vibratoRate: 4.2, vibratoDepth: .028, jitter: .012, breathiness: .055 } },
    separated: { mechanism: "howl", sourceLevelDb: 95, durationSeconds: 6.4, centreFrequencyHz: 390, bandwidthOctaves: 3.6, evidenceGrade: "inferred-exact-species", confidence: .82, sourceIds: ["palacios-etal-2007-iberian-wolf-howls"], parameterEvidence: { durationSeconds: "measured-exact-species-range", centreFrequencyHz: "measured-exact-species-range", harmonicCount: "measured-exact-species", sourceLevelDb: "composite-model" }, synthesisShape: { attack: .55, release: .9, pitchStart: .72, pitchEnd: 1.22, syllables: 1, harmonicRolloff: 1.02, formantsHz: [780, 1170, 1950], formantBandwidthHz: [170, 230, 360], vibratoRate: 3.4, vibratoDepth: .045, jitter: .017, breathiness: .06 } },
    alarm: { mechanism: "bark", sourceLevelDb: 88, durationSeconds: .34, centreFrequencyHz: 610, bandwidthOctaves: 3.8, evidenceGrade: "observed-exact-species", confidence: .58, sourceIds: ["macaulay-library", "tierstimmenarchiv"], synthesisShape: { attack: .008, release: .13, pitchStart: 1.12, pitchEnd: .74, syllables: 1, harmonicRolloff: .86, formantsHz: [920, 1680, 2780], breathiness: .2, jitter: .048 } },
    threat: { mechanism: "growl", sourceLevelDb: 82, durationSeconds: 1.15, centreFrequencyHz: 118, bandwidthOctaves: 4.5, evidenceGrade: "observed-exact-species", confidence: .55, sourceIds: ["macaulay-library", "tierstimmenarchiv"], synthesisShape: { attack: .08, release: .28, pitchStart: .96, pitchEnd: .76, syllables: 1, harmonicRolloff: .7, formantsHz: [520, 1040, 1810], breathiness: .28, jitter: .09 } },
    care: { mechanism: "whine", sourceLevelDb: 70, durationSeconds: .72, centreFrequencyHz: 920, bandwidthOctaves: 3.2, evidenceGrade: "observed-exact-species", confidence: .5, sourceIds: ["macaulay-library", "tierstimmenarchiv"], synthesisShape: { attack: .09, release: .21, pitchStart: .82, pitchEnd: 1.16, syllables: 2, syllableGap: .08, harmonicRolloff: 1.3, formantsHz: [1380, 2550, 3940], breathiness: .06, jitter: .018 } },
    courtship: { mechanism: "yelp", sourceLevelDb: 78, durationSeconds: .42, centreFrequencyHz: 760, bandwidthOctaves: 3.5, evidenceGrade: "observed-exact-species", confidence: .45, sourceIds: ["macaulay-library", "tierstimmenarchiv"], synthesisShape: { attack: .025, release: .12, pitchStart: .78, pitchEnd: 1.24, syllables: 2, syllableGap: .045, harmonicRolloff: 1.05, formantsHz: [1260, 2380, 3660], breathiness: .08, jitter: .022 } }
  }
});

function mechanismShape(base, synthesis, key) {
  if (synthesis === "avian-syrinx") {
    const syllables = ({ contact: 4, alarm: 3, threat: 2, care: 5, separated: 6, courtship: 8 })[key] || 3;
    return { attack: .012, release: .045, syllables, syllableGap: key === "courtship" ? .035 : .055, pitchStart: key === "alarm" ? 1.24 : .78, pitchEnd: key === "alarm" ? .86 : 1.32, vibratoRate: 11 + syllables, vibratoDepth: .026, trillRate: key === "courtship" ? 22 : 13, harmonicRolloff: 1.6, breathiness: .035 };
  }
  if (synthesis === "reptile-turbulence") return { attack: .06, release: .22, syllables: key === "threat" ? 1 : 2, syllableGap: .12, pitchStart: 1.04, pitchEnd: .78, pulseRate: key === "courtship" ? 7 : 11, breathiness: .9, jitter: .07 };
  return base.synthesisShape;
}

const repertoire = (keys, synthesis = null, frequencyScale = 1, levelOffset = 0, overrides = {}) => freeze(keys.map(key => {
  const base = CALL_LIBRARY[key], override = overrides[key] || {};
  const resolvedSynthesis = synthesis || base.synthesis;
  return freeze({ ...base, ...override, callId: key, sourceLevelDb: override.sourceLevelDb ?? base.sourceLevelDb + levelOffset, centreFrequencyHz: override.centreFrequencyHz ?? Math.round(base.centreFrequencyHz * frequencyScale), synthesis: resolvedSynthesis, synthesisShape: override.synthesisShape || mechanismShape(base, resolvedSynthesis, key), modalities: ["acoustic"], evidenceGrade: override.evidenceGrade || "composite-model", confidence: override.confidence ?? .45, sourceIds: override.sourceIds || ["macaulay-library", "tierstimmenarchiv"] });
}));

const taxa = {
  grazer: ["Valley Grazer", "Cervus elaphus", "red deer declared model basis", "mammal", .85, 80, 100, 12000, 34, "large-pinna", 70, 1.05],
  hunter: ["Ridge Hunter", "Canis lupus", "grey wolf declared model basis", "mammal", 1, 95, 80, 30000, 35, "mobile-pinna", 65, 1.2],
  "valley-grazer-updated": ["Valley Grazer — Updated", "Cervus elaphus", "red deer-informed updated model", "mammal", .85, 82, 80, 18000, 32, "large-pinna", 85, 1.22],
  "ridge-hunter-updated": ["Ridge Hunter — Updated", "Canis lupus", "grey wolf-informed updated model", "mammal", 1, 96, 60, 36000, 31, "mobile-pinna", 85, 1.5],
  "meadow-nibbler": ["European Rabbit", "Oryctolagus cuniculus", null, "mammal", 1.7, 64, 90, 42000, 28, "large-pinna", 100, 1.55],
  "great-plains-grazer": ["American Bison", "Bison bison", null, "mammal", .58, 92, 55, 15000, 38, "pinna", 45, .9],
  "woodland-browser": ["Moose", "Alces alces", null, "mammal", .65, 86, 60, 18000, 36, "large-pinna", 80, 1.1],
  "brush-fox": ["Red Fox", "Vulpes vulpes", null, "mammal", 1.75, 72, 70, 48000, 25, "mobile-pinna", 75, 1.6],
  "shadow-stalker": ["Eurasian Lynx", "Lynx lynx", null, "mammal", 1.25, 78, 65, 40000, 27, "mobile-pinna", 70, 1.45],
  "great-omnivore": ["Brown Bear", "Ursus arctos", null, "mammal", .65, 90, 50, 20000, 38, "round-pinna", 35, .85],
  "dryland-runner": ["Pronghorn", "Antilocapra americana", null, "mammal", .9, 82, 70, 26000, 33, "large-pinna", 75, 1.25],
  "highland-grazer": ["Alpine Ibex", "Capra ibex", null, "mammal", .8, 82, 70, 22000, 34, "pinna", 55, 1.05],
  "armoured-browser": ["Black Rhinoceros", "Diceros bicornis", null, "mammal", .48, 100, 30, 12000, 42, "mobile-pinna", 60, .85],
  "pack-breaker": ["Spotted Hyena", "Crocuta crocuta", null, "mammal", .72, 96, 45, 28000, 32, "round-pinna", 45, 1.15],
  "carrion-runner": ["Southern Ground Hornbill", "Bucorvus leadbeateri", null, "bird", .42, 98, 80, 12000, 32, "aural-opening", 0, .9],
  "waterline-grazer": ["Capybara", "Hydrochoerus hydrochaeris", null, "mammal", 1.15, 76, 70, 30000, 32, "small-pinna", 35, 1.05],
  "brush-nibbler": ["Snowshoe Hare", "Lepus americanus", null, "mammal", 1.65, 66, 80, 42000, 28, "large-pinna", 100, 1.5],
  "waterline-ambusher": ["Nile Crocodile", "Crocodylus niloticus", null, "reptile", .38, 100, 20, 8000, 38, "tympanum", 0, .9],
  "northern-shaggy-grazer": ["Musk Ox", "Ovibos moschatus", null, "mammal", .55, 92, 45, 14000, 39, "pinna", 30, .85],
  "highland-prowler": ["Snow Leopard", "Panthera uncia", null, "mammal", 1.05, 82, 55, 40000, 29, "round-pinna", 55, 1.35],
  "little-opportunist": ["Raccoon", "Procyon lotor", null, "mammal", 1.3, 76, 70, 36000, 30, "round-pinna", 45, 1.25],
  "cold-country-scavenger": ["Common Pheasant", "Phasianus colchicus", null, "bird", 1.35, 76, 100, 12000, 30, "aural-opening", 0, 1.15],
  "sunscale-ambusher": ["Ball Python", "Python regius", null, "reptile", .5, 62, 20, 1000, 48, "jaw-vibration", 0, .45],
  "shieldback-colony": ["African Spurred Tortoise", "Centrochelys sulcata", null, "reptile", .55, 64, 20, 3000, 45, "tympanum", 0, .55],
  "wild-boar": ["Wild Boar", "Sus scrofa", null, "mammal", .82, 88, 45, 30000, 31, "pinna", 45, 1.1],
  "african-elephant": ["African Bush Elephant", "Loxodonta africana", null, "mammal", .18, 112, 10, 12000, 35, "large-pinna", 35, .95],
  dromedary: ["Dromedary", "Camelus dromedarius", null, "mammal", .7, 88, 45, 18000, 37, "small-pinna", 35, .9],
  "common-ostrich": ["Common Ostrich", "Struthio camelus", null, "bird", .55, 92, 50, 10000, 34, "aural-opening", 0, .9]
};

const birdCalls = ["contact", "alarm", "threat", "courtship", "care", "separated"];
const reptileCalls = ["threat", "courtship", "care"];
const mammalCalls = ["contact", "alarm", "threat", "courtship", "care", "separated"];

export const SPECIES_ACOUSTIC_PROFILES = freeze(Object.fromEntries(Object.entries(taxa).map(([speciesId, row]) => {
  const [displayName, scientificName, modelBasis, clade, frequencyScale, maximumSourceLevelDb, lowHz, highHz, bestThresholdDb, sensorKind, earMobility, directionality] = row;
  const synthesis = clade === "bird" ? "avian-syrinx" : clade === "reptile" ? "reptile-turbulence" : "mammal-laryngeal";
  const keys = clade === "bird" ? birdCalls : clade === "reptile" ? reptileCalls : mammalCalls;
  const bestLow = Math.max(lowHz, clade === "reptile" ? 80 : 250 * frequencyScale);
  const bestHigh = Math.min(highHz, clade === "reptile" ? 900 : 5000 * Math.max(.65, frequencyScale));
  return [speciesId, {
    schemaVersion: ACOUSTIC_PROFILE_SCHEMA, speciesId, displayName, scientificName, modelBasis,
    production: { clade, synthesis, maximumSourceLevelDb, sourceLevelUnit: "dB SPL at 1 m", evidenceGrade: "composite-model" },
    audiogram: audiogram(lowHz, bestLow, bestHigh, highHz, bestThresholdDb),
    usefulFrequencyRangeHz: [lowHz, highHz], bestSensitivityRangeHz: [bestLow, bestHigh],
    localisation: { directionality, baseAngularErrorDegrees: Math.round(34 / directionality), maskingSusceptibility: clade === "reptile" ? 1.25 : 1, evidenceGrade: "composite-model" },
    sensors: sensors(sensorKind, earMobility, directionality),
    repertoire: repertoire(keys, synthesis, frequencyScale, maximumSourceLevelDb - 88, FOUNDER_CALL_OVERRIDES[speciesId]),
    mechanicalSounds: [{ soundClass: "footstep", synthesis: "mechanical-impact", centreFrequencyHz: clade === "bird" ? 650 : clade === "reptile" ? 140 : Math.max(55, 520 / Math.sqrt(maximumSourceLevelDb)), evidenceGrade: "composite-model" }],
    recognition: { conspecificCalls: true, individualVoice: clade === "mammal", heterospecificAlarm: ["mammal", "bird"].includes(clade), evidenceGrade: "composite-model" },
    evidence: { grade: modelBasis ? "inferred-exact-species" : "composite-model", confidence: modelBasis ? .62 : .42, sourceIds: ["animal-audiogram-database", "macaulay-library", "tierstimmenarchiv"], knownGaps: ["Exact call source levels and behavioural audiograms require species-by-species primary-literature review."] },
    recordingsDistributed: false
  }];
})));

export function acousticProfile(subject) {
  return SPECIES_ACOUSTIC_PROFILES[typeof subject === "string" ? subject : subject?.speciesId] || null;
}

export function supportedAcousticCall(subject, signalKind) {
  const normalized = ({ lost: "separated", "wait-up": "contact", "water-report": "contact", "food-report": "contact", "shelter-report": "contact", "route-blocked": "alarm", "follow-me": "contact", stop: "contact", rally: "contact", "all-clear": "contact", attacked: "alarm", distress: "alarm", injury: "alarm", water: "contact", hunger: "contact", heat: "contact", cold: "contact" })[signalKind] || signalKind;
  return acousticProfile(subject)?.repertoire.find(call => call.signalKind === normalized || call.callId === normalized) || null;
}

export function validateAcousticProfiles(profiles = SPECIES_ACOUSTIC_PROFILES) {
  const errors = [];
  for (const [speciesId, profile] of Object.entries(profiles)) {
    if (profile.speciesId !== speciesId) errors.push(`${speciesId}: mismatched species id`);
    if (profile.recordingsDistributed !== false) errors.push(`${speciesId}: recordings must not be distributed`);
    if (!profile.scientificName) errors.push(`${speciesId}: missing taxon or model basis`);
    if (!profile.audiogram?.length) errors.push(`${speciesId}: missing audiogram`);
    for (const point of profile.audiogram || []) {
      if (!(point.frequencyHz > 0) || !Number.isFinite(point.thresholdDb)) errors.push(`${speciesId}: invalid audiogram point`);
      if (!ACOUSTIC_EVIDENCE_GRADES.includes(point.evidenceGrade)) errors.push(`${speciesId}: invalid evidence grade`);
    }
    for (const call of profile.repertoire || []) {
      if (!(call.sourceLevelDb > 0) || !(call.centreFrequencyHz > 0) || !(call.durationSeconds > 0)) errors.push(`${speciesId}: invalid ${call.callId} call`);
      if (!ACOUSTIC_EVIDENCE_GRADES.includes(call.evidenceGrade)) errors.push(`${speciesId}: invalid call evidence grade`);
    }
  }
  return errors;
}

const validationErrors = validateAcousticProfiles();
if (validationErrors.length) throw new Error(`Invalid acoustic profiles: ${validationErrors.join("; ")}`);
