import test from "node:test";
import assert from "node:assert/strict";
import { SPECIES_IDS } from "../src/species-registry.js";
import { SPECIES_VISUAL_DESIGNS } from "../src/species-registry.js";
import { SPECIES_ACOUSTIC_PROFILES, supportedAcousticCall, validateAcousticProfiles } from "../src/acoustic-profiles.js";
import { acousticObservationContact, createAnimalSoundEvent, createIndividualAcousticTraits, lineSamplePath, observeSound, propagateSound } from "../src/acoustic-ecology.js";
import { CompactTraceField, signalEmissionRecord, supportedSignalModalities } from "../src/multimodal-communication.js";
import { createSensoryPerspective, sensorDefinitionsFor, SENSORY_PERSPECTIVE_MODES } from "../src/sensory-perspective.js";
import { encodeWeatherFieldTexture, localizedWeatherPresentation, weatherFieldRefreshDue } from "../src/localized-weather.js";

const animal = (id, speciesId, x = 0, z = 0) => ({ id, speciesId, x, z, sex: "F", lifeStage: "adult", bodyMass: 60, movementNoise: 0 });

test("all catalogue species have valid, recording-free acoustic profiles", () => {
  assert.deepEqual(Object.keys(SPECIES_ACOUSTIC_PROFILES), SPECIES_IDS);
  assert.deepEqual(validateAcousticProfiles(), []);
  for (const profile of Object.values(SPECIES_ACOUSTIC_PROFILES)) {
    assert.equal(profile.recordingsDistributed, false);
    assert.ok(profile.repertoire.length > 0);
    assert.ok(profile.audiogram.every(point => point.evidenceGrade && Number.isFinite(point.thresholdDb)));
  }
  assert.equal(SPECIES_ACOUSTIC_PROFILES.grazer.scientificName, "Cervus elaphus");
  assert.equal(SPECIES_ACOUSTIC_PROFILES.hunter.scientificName, "Canis lupus");
  assert.equal(SPECIES_VISUAL_DESIGNS.grazer, null);
  assert.equal(SPECIES_VISUAL_DESIGNS.hunter, null);
});

test("individual voice traits and sound observations are deterministic", () => {
  const source = animal("A1", "grazer"), listener = animal("A2", "grazer", 8, 0);
  source.acousticIdentity = createIndividualAcousticTraits(source, 42);
  assert.deepEqual(source.acousticIdentity, createIndividualAcousticTraits(source, 42));
  const call = { signalKind: "alarm", urgency: .8 }, event = createAnimalSoundEvent(source, { tick: 12, call });
  const path = [{ id: 1, elevation: 0 }, { id: 2, elevation: 0, woodland: true }, { id: 3, elevation: 0 }];
  const propagation = propagateSound(event, listener, { path, receiverWeather: { rain: .1, wind: .2, temp: 15 } });
  assert.deepEqual(propagation, propagateSound(event, listener, { path, receiverWeather: { rain: .1, wind: .2, temp: 15 } }));
  const first = observeSound(listener, event, propagation), second = observeSound(listener, event, propagation);
  assert.deepEqual(first, second);
  assert.equal(first.detected, true);
  assert.equal(acousticObservationContact(listener, event, first, 100).signalKind, "alarm");
});

test("masking and terrain loss can turn detection into non-detection", () => {
  const source = animal("W1", "hunter"), listener = animal("W2", "hunter", 65, 0);
  const event = createAnimalSoundEvent(source, { tick: 3, call: { signalKind: "contact" } });
  const open = propagateSound(event, listener, { path: [{ id: 1, elevation: 0 }, { id: 2, elevation: 0 }], receiverWeather: { rain: 0, wind: 0 } });
  const blockedPath = Array.from({ length: 30 }, (_, index) => ({ id: index, elevation: index > 2 && index < 28 ? 18 : 0, woodland: true }));
  const storm = propagateSound(event, listener, { path: blockedPath, receiverWeather: { rain: 1, wind: 1, stormFactor: 1 } });
  assert.ok(Math.max(...open.receivedSpectrumDb) > Math.max(...storm.receivedSpectrumDb));
  assert.ok(observeSound(listener, event, open).detectionMarginDb > observeSound(listener, event, storm).detectionMarginDb);
});

test("unsupported vocalisations are not fabricated", () => {
  const python = animal("P1", "sunscale-ambusher");
  assert.equal(supportedAcousticCall(python, "alarm"), null);
  assert.equal(createAnimalSoundEvent(python, { tick: 1, call: { signalKind: "alarm" } }), null);
  assert.deepEqual(supportedSignalModalities(python, "alarm"), ["visual-posture"]);
  const emission = signalEmissionRecord(python, { kind: "alarm" }, 1);
  assert.equal(emission.emitted, true);
  assert.equal(emission.modalities.includes("acoustic"), false);
});

test("path, trace, perspective, sensors, and weather helpers stay bounded", () => {
  const cells = new Map(Array.from({ length: 11 }, (_, index) => [index, { id: index, x: index, z: 0 }]));
  const path = lineSamplePath({ x: 0, z: 0 }, { x: 10, z: 0 }, x => cells.get(Math.round(x)), 5);
  assert.ok(path.length <= 6);
  const field = new CompactTraceField({ limitPerCell: 2 });
  field.deposit(1, { kind: "footprint", sourceId: "A", intensity: 1 });
  field.deposit(1, { kind: "body-scent", sourceId: "A", intensity: .8 });
  field.deposit(1, { kind: "blood-scent", sourceId: "B", intensity: .4 });
  assert.equal(field.recordsAt(1).length, 2);
  field.advance({ rain: 1, wind: 1, elapsedHours: 2 });
  assert.ok(field.recordsAt(1).every(record => record.intensity < 1));
  const perspective = createSensoryPerspective({ mode: SENSORY_PERSPECTIVE_MODES.ENTITY_EXPERIENCE, entityId: "A" });
  assert.equal(perspective.positionSource, "selected-entity");
  assert.ok(sensorDefinitionsFor(animal("A", "grazer"), { morphology: { eyes: 2, eyePosition: "lateral" }, senses: { visualField: 300, binocularOverlap: 20 } }).length >= 4);
  const weather = localizedWeatherPresentation({ rain: .8, wind: .6, stormFactor: .4, temp: 5 });
  assert.equal(weather.precipitationType, "rain");
  const texture = encodeWeatherFieldTexture({ width: 1, values: [{ rain: 1, wind: 1 }] });
  assert.equal(texture.data.length, 4);
  assert.equal(weatherFieldRefreshDue({ systemPositions: [{ x: 0, z: 0 }] }, [{ x: 5, z: 0 }], 16), true);
});
