import test from "node:test";
import assert from "node:assert/strict";
import { audioBusLevels, DEFAULT_AUDIO_PLAYBACK_ENABLED, DEFAULT_AUDIO_SETTINGS, loadAudioSettings, normalizeAudioSettings, SOUND_LANGUAGE_IDS } from "../src/audio-settings.js";
import { proceduralCallPlan, synthesiseProceduralCall, synthesiseSoundEvent } from "../src/procedural-audio.js";
import { acousticScoreForEvent, SPECIES_SIGNATURE_IDS, validateAcousticScore } from "../src/acoustic-score.js";
import { SPECIES_ACOUSTIC_PROFILES } from "../src/acoustic-profiles.js";
import { createAnimalSoundEvent, createEnvironmentalSoundEvent, createIndividualAcousticTraits } from "../src/acoustic-ecology.js";

const animal = (id, speciesId) => ({ id, speciesId, x: 0, z: 0, sex: "M", lifeStage: "adult", bodyMass: 90, acousticIdentity: createIndividualAcousticTraits({ id, speciesId, sex: "M" }, 42) });

test("audio settings are granular, bounded, and expose every soundscape bus", () => {
  assert.equal(DEFAULT_AUDIO_PLAYBACK_ENABLED, false);
  const settings = normalizeAudioSettings({ masterVolume: 4, animalVolume: -.2, dynamicRange: "night", spatialization: "mono", maximumVoices: 200 });
  assert.equal(settings.masterVolume, 1);
  assert.equal(settings.animalVolume, 0);
  assert.equal(settings.dynamicRange, "night");
  assert.equal(settings.spatialization, "mono");
  assert.equal(settings.maximumVoices, 64);
  assert.equal(settings.soundLanguage, null);
  assert.deepEqual(Object.keys(audioBusLevels(DEFAULT_AUDIO_SETTINGS)), ["animals", "movement", "wind", "vegetation", "rain", "thunder", "river", "shoreline", "interface", "cinema"]);
});

test("legacy settings migrate deterministically to an unselected language", () => {
  const storage = { getItem: key => key.endsWith("v2") ? JSON.stringify({ windVegetationVolume: .41, rainThunderVolume: .52, waterVolume: .63, dynamicRange: "night" }) : null };
  const settings = loadAudioSettings(storage);
  assert.equal(settings.soundLanguage, null);
  assert.equal(settings.windVolume, .41); assert.equal(settings.vegetationVolume, .41);
  assert.equal(settings.rainVolume, .52); assert.equal(settings.thunderVolume, .52);
  assert.equal(settings.riverVolume, .63); assert.equal(settings.shorelineVolume, .63);
  assert.equal(settings.dynamicRange, "night");
});

test("all 28 species have validated identity scores and no recording fallback", () => {
  assert.deepEqual(SPECIES_SIGNATURE_IDS, Object.keys(SPECIES_ACOUSTIC_PROFILES));
  const scoreIds = new Set();
  for (const speciesId of SPECIES_SIGNATURE_IDS) {
    const source = animal(`${speciesId}-1`, speciesId), callProfile = SPECIES_ACOUSTIC_PROFILES[speciesId].repertoire[0];
    const event = createAnimalSoundEvent(source, { tick: 4, call: { signalKind: callProfile.signalKind } }), score = acousticScoreForEvent(event, source);
    assert.deepEqual(validateAcousticScore(score), []);
    assert.equal(score.recordingsDistributed, false);
    assert.equal(score.distinctiveness.unrelatedSignatureAdded, false);
    scoreIds.add(score.scoreId);
  }
  assert.equal(scoreIds.size, 28);
});

test("five languages render one score into five deterministic but distinct waveforms", () => {
  const source = animal("deer-five-style", "grazer"), event = createAnimalSoundEvent(source, { tick: 7, call: { signalKind: "courtship" } });
  const fingerprints = new Set();
  for (const language of SOUND_LANGUAGE_IDS) {
    const first = synthesiseSoundEvent(event, 8000, language), second = synthesiseSoundEvent(event, 8000, language);
    assert.deepEqual(first, second);
    assert.equal(first.length, Math.ceil(event.acousticScore.durationSeconds * 8000));
    fingerprints.add(Array.from(first.slice(310, 390)).map(value => value.toFixed(4)).join(","));
  }
  assert.equal(fingerprints.size, SOUND_LANGUAGE_IDS.length);
});

test("foot contacts include anatomy, substrate and load and are not one generic knock", () => {
  const hoof = createAnimalSoundEvent(animal("hoof", "grazer"), { tick: 9, movementNoise: .7, receiverCell: { rocky: true, substrate: "bedrock" }, gait: "walk" });
  const paw = createAnimalSoundEvent(animal("paw", "hunter"), { tick: 9, movementNoise: .7, receiverCell: { woodland: true, substrate: "loam" }, gait: "stalk" });
  assert.equal(hoof.synthesis.kind, "modal-contact");
  assert.equal(hoof.synthesis.contact.anatomy, "hoof");
  assert.equal(hoof.synthesis.contact.substrate, "rock");
  assert.equal(paw.synthesis.contact.anatomy, "paw");
  assert.equal(paw.synthesis.contact.substrate, "leaf-litter");
  assert.notDeepEqual(synthesiseSoundEvent(hoof, 8000, "natural-reconstruction"), synthesiseSoundEvent(paw, 8000, "natural-reconstruction"));
  const languageContacts = new Set(SOUND_LANGUAGE_IDS.map(language => Array.from(synthesiseSoundEvent(hoof, 8000, language).slice(20, 90)).map(value => value.toFixed(4)).join(",")));
  assert.equal(languageContacts.size, SOUND_LANGUAGE_IDS.length);
});

test("weather and water are synthesized in every language without one static fallback", () => {
  for (const kind of ["wind", "rain", "river", "thunder"]) {
    const event = createEnvironmentalSoundEvent({ id: `test-${kind}`, kind, position: { x: 0, z: 0 }, intensity: .7, tick: 1, durationSeconds: .8 });
    const fingerprints = new Set(SOUND_LANGUAGE_IDS.map(language => Array.from(synthesiseSoundEvent(event, 8000, language).slice(100, 180)).map(value => value.toFixed(4)).join(",")));
    assert.equal(fingerprints.size, SOUND_LANGUAGE_IDS.length, `${kind} differs across languages`);
  }
});

test("authoritative calls obey bounded bout scheduling instead of sounding every tick", () => {
  const wolf = animal("scheduled-wolf", "hunter"), first = createAnimalSoundEvent(wolf, { tick: 10, call: { signalKind: "contact", since: 10, enforceSchedule: true } }), repeated = createAnimalSoundEvent(wolf, { tick: 11, call: { signalKind: "contact", since: 10, enforceSchedule: true } });
  assert.ok(first);
  assert.equal(first.context.boutCount, 1);
  assert.equal(repeated, null);
  const deer = animal("scheduled-deer", "grazer"), alarm = createAnimalSoundEvent(deer, { tick: 20, call: { signalKind: "alarm", since: 20, enforceSchedule: true } }), expired = createAnimalSoundEvent(deer, { tick: 30, call: { signalKind: "alarm", since: 20, enforceSchedule: true } });
  assert.ok(alarm);
  assert.equal(expired, null);
});

test("procedural calls are deterministic, bounded, and use time-varying source shapes", () => {
  const source = animal("wolf-1", "hunter"), event = createAnimalSoundEvent(source, { tick: 80, call: { signalKind: "contact", since: 75 } });
  const plan = proceduralCallPlan(event), first = synthesiseProceduralCall(event, 8000), second = synthesiseProceduralCall(event, 8000);
  assert.equal(event.eventId.startsWith("75:"), true);
  assert.equal(plan.kind, "mammal-laryngeal");
  assert.ok(plan.duration >= 4);
  assert.ok(plan.formantsHz.length >= 3);
  assert.equal(first.length, second.length);
  assert.deepEqual(first, second);
  assert.ok(first.some((sample, index) => index > 100 && Math.abs(sample - first[index - 1]) > .0001));
  assert.ok(Math.max(...first) <= .881);
});

test("founder acoustic overrides are evidence-led without changing visual profiles", () => {
  const deerRoar = SPECIES_ACOUSTIC_PROFILES.grazer.repertoire.find(call => call.callId === "courtship"), wolfHowl = SPECIES_ACOUSTIC_PROFILES.hunter.repertoire.find(call => call.callId === "contact");
  assert.equal(deerRoar.evidenceGrade, "measured-exact-species");
  assert.ok(deerRoar.synthesisShape.formantsHz.length >= 4);
  assert.equal(wolfHowl.evidenceGrade, "inferred-exact-species");
  assert.ok(wolfHowl.durationSeconds >= 4);
  assert.ok(wolfHowl.sourceIds.includes("palacios-etal-2007-iberian-wolf-howls"));
  assert.equal(wolfHowl.parameterEvidence.sourceLevelDb, "composite-model");
});

test("mammal, bird, and reptile mechanisms do not share one generic call shape", () => {
  const mammal = createAnimalSoundEvent(animal("fox-1", "brush-fox"), { tick: 1, call: { signalKind: "alarm" } });
  const bird = createAnimalSoundEvent(animal("bird-1", "carrion-runner"), { tick: 1, call: { signalKind: "alarm" } });
  const reptile = createAnimalSoundEvent(animal("croc-1", "waterline-ambusher"), { tick: 1, call: { signalKind: "threat" } });
  assert.equal(mammal.synthesis.kind, "mammal-laryngeal"); assert.ok(mammal.synthesis.shape.formantsHz.length >= 3);
  assert.equal(bird.synthesis.kind, "avian-syrinx"); assert.ok(bird.synthesis.shape.trillRate > 0); assert.ok(bird.synthesis.shape.syllables >= 2);
  assert.equal(reptile.synthesis.kind, "reptile-turbulence"); assert.ok(reptile.synthesis.shape.breathiness >= .8);
});
