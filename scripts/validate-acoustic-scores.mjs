import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPECIES_IDS } from "../src/species-registry.js";
import { SPECIES_ACOUSTIC_PROFILES } from "../src/acoustic-profiles.js";
import { acousticScoreForEvent, SPECIES_SIGNATURE_IDS, validateAcousticScore } from "../src/acoustic-score.js";
import { createAnimalSoundEvent, createIndividualAcousticTraits } from "../src/acoustic-ecology.js";
import { SOUND_LANGUAGE_IDS } from "../src/audio-settings.js";
import { synthesiseSoundEvent } from "../src/procedural-audio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
if (SOUND_LANGUAGE_IDS.length !== 5) errors.push(`Expected five sound languages; found ${SOUND_LANGUAGE_IDS.length}`);
if (SPECIES_SIGNATURE_IDS.join("|") !== SPECIES_IDS.join("|")) errors.push("Signature-score catalogue does not match species catalogue order");

for (const speciesId of SPECIES_IDS) {
  const profile = SPECIES_ACOUSTIC_PROFILES[speciesId], call = profile?.repertoire?.[0];
  if (!call) { errors.push(`${speciesId}: no supported signature call`); continue; }
  const animal = { id: `validation-${speciesId}`, speciesId, sex: "F", lifeStage: "adult", x: 0, z: 0, bodyMass: 60 };
  animal.acousticIdentity = createIndividualAcousticTraits(animal, 81426);
  const event = createAnimalSoundEvent(animal, { tick: 1, call: { signalKind: call.signalKind } }), score = acousticScoreForEvent(event, animal);
  errors.push(...validateAcousticScore(score).map(error => `${speciesId}: ${error}`));
  const fingerprints = new Set(SOUND_LANGUAGE_IDS.map(language => {
    const samples = synthesiseSoundEvent(event, 4000, language);
    if (!samples.length || samples.some(sample => !Number.isFinite(sample))) errors.push(`${speciesId}/${language}: invalid waveform`);
    return Array.from(samples.slice(120, 180)).map(sample => sample.toFixed(3)).join(",");
  }));
  if (fingerprints.size < 4) errors.push(`${speciesId}: renderer languages are not sufficiently distinct`);
}

const forbiddenExtensions = new Set([".wav", ".wave", ".mp3", ".ogg", ".flac", ".m4a", ".aac"]);
for (const relativeRoot of ["src", "assets"]) {
  const start = path.join(root, relativeRoot); if (!fs.existsSync(start)) continue;
  const stack = [start];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(absolute);
      else if (forbiddenExtensions.has(path.extname(entry.name).toLowerCase())) errors.push(`Runtime recording prohibited: ${path.relative(root, absolute)}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log(`Validated ${SPECIES_IDS.length} species scores across ${SOUND_LANGUAGE_IDS.length} synthetic languages; runtime bundles contain no recordings.`);
