import test from "node:test";
import assert from "node:assert/strict";
import { ACSSPredictiveAuthor, AuthorLearningProfile, AUTHOR_METHOD_BY_ID, BrowserAuthorProfileStore, ForecastLedger, authorOntologyIntegrity, createDefaultPredictionModelRegistry, policyAllowsScene, runModelEnsemble } from "../src/documentary-author-v3/index.js";
import { AudienceLearningSystem, BrowserAudienceProfileStore } from "../src/documentary-author/audience/index.js";

const animal = (id, extra = {}) => ({ id, alive: true, x: 2, z: 3, fatigue: 20, fear: 5, energy: 75, hydration: 70, actionState: { key: "travel", label: "travelling to water" }, needDependencyPlan: { methodId: "drink-confirmed-shoreline", phase: "travel" }, locomotion: { vx: .1, vz: 0 }, ...extra });
const simulation = { tick: 10, animals: [animal("A")], corpses: [] };
const activity = { id: "activity:A", kind: "activity", ids: ["A"], semanticRoleIds: ["A"], focus: { x: 2, z: 3 }, actionKey: "travel water", score: 60, importance: 60, title: "A travels", detail: "A is travelling to water." };
const terrain = { id: "terrain:4", kind: "terrain-transition", ids: ["A"], focus: { x: 3, z: 3 }, actionKey: "soil sediment", score: 90, worldSubject: true, title: "Ground", detail: "The ground changes." };

test("ACSS author ontology and model dependency registry are valid", () => {
  assert.equal(authorOntologyIntegrity().valid, true);
  assert.ok(AUTHOR_METHOD_BY_ID["observe-resource-acquisition"].phases.includes("outcome"));
  const registry = createDefaultPredictionModelRegistry(); assert.equal(registry.integrity().valid, true); assert.ok(registry.list().length >= 15);
});

test("documentary models declare heterogeneous frameworks and bounded authorities", () => {
  const registry = createDefaultPredictionModelRegistry(), frameworks = new Set(registry.list().map(model => model.framework));
  assert.ok(frameworks.has("DYNAMICAL")); assert.ok(frameworks.has("FORWARD_ACTION")); assert.ok(frameworks.has("CONTEXTUAL_PREFERENCE")); assert.ok(frameworks.has("METAPREDICTION"));
  const veto = registry.get("camera.validity-safety.v1"); assert.equal(veto.authority, "VETO"); assert.equal(veto.safetyRegistered, true);
  assert.equal(registry.list().filter(model => model.authority === "VETO" && !model.safetyRegistered).length, 0);
});

test("ensemble forecasts trace activation, admission, coordination, and authority", () => {
  const registry = createDefaultPredictionModelRegistry(), closure = registry.dependencyClosure("camera.validity-safety.v1", { scene: activity, subjects: simulation.animals, modelBudget: 10 });
  const ensemble = runModelEnsemble(closure, { scene: activity, subjects: simulation.animals, cameraPoseValid: true }, { ensembleId: "authority", issuedAtTick: 10 });
  const safety = ensemble.forecasts.find(item => item.modelId === "camera.validity-safety.v1"); assert.equal(safety.activation.activated, true); assert.equal(safety.admission.admitted, true); assert.equal(safety.authority, "VETO"); assert.deepEqual(ensemble.vetoes, []);
});

test("forecast ledger remains bounded when its oldest records are still open", () => {
  const learned = [];
  const ledger = new ForecastLedger({ maximum: 3, learning: { resolveForecast: value => learned.push(value) } });
  for (let index = 0; index < 5; index += 1) ledger.open({ ensembleId: `ensemble-${index}`, forecasts: [{ modelId: `model-${index}`, family: "BEHAVIOUR", outcomes: [{ id: "YES", probability: 1 }], latestTick: 100 }] }, { situationId: "situation", subjects: [{ id: "A" }] }, index);
  assert.equal(ledger.health().total, 3);
  assert.equal(ledger.health().open, 3);
  assert.equal(learned.length, 0, "capacity censorship must not train a model");
});

test("Character Stories rejects terrain roots even when animals happen to be nearby", () => {
  assert.equal(policyAllowsScene(activity, { subjectMode: "characters" }), true);
  assert.equal(policyAllowsScene(terrain, { subjectMode: "characters" }), false);
});

test("selected ensembles include required dependency models", () => {
  const author = new ACSSPredictiveAuthor({ mode: "V3_SHADOW", profileStore: { load: () => new AuthorLearningProfile(), save: () => true, backup: () => true } });
  const selected = author.selectPresentation({ scenes: [activity], simulation, policy: { subjectMode: "characters", presetName: "characters" }, tick: 10 });
  assert.equal(selected.scene.id, activity.id); assert.equal(selected.contract.subjectIds[0], "A");
  const models = new Set(selected.contract.forecasts.map(item => item.modelId));
  for (const id of ["production.hold-value.v1", "story.resolution-window.v1", "camera.frameability.v1", "camera.subject-trajectory.v1"]) assert.ok(models.has(id), id);
});

test("story dependency plan preserves and advances required beats", () => {
  const author = new ACSSPredictiveAuthor({ mode: "V3_ACTIVE", profileStore: { load: () => new AuthorLearningProfile(), save: () => true, backup: () => true } });
  const first = author.selectPresentation({ scenes: [activity], simulation, policy: { subjectMode: "characters" }, tick: 10 }); assert.equal(first.contract.beat, "establish");
  author.completeCurrentBeat({ outcomeChanged: true });
  const second = author.selectPresentation({ scenes: [activity], simulation, policy: { subjectMode: "characters" }, tick: 11 }); assert.equal(second.contract.beat, "cause"); assert.equal(second.contract.threadId, first.contract.threadId);
});

test("bounded learning calibrates responsible models and persists policy only after lifecycle gate", () => {
  const profile = new AuthorLearningProfile({ lifecycle: "CALIBRATING" }), before = profile.calibration.reliability("model", {});
  profile.resolveForecast({ forecast: { forecastId: "f", modelId: "model", outcomes: [{ id: "YES", probability: .8 }, { id: "NO", probability: .2 }] }, resolution: { status: "RESOLVED", observedOutcome: "YES", attributionWeight: 1 }, context: {} });
  assert.ok(profile.calibration.reliability("model", {}) > before); assert.equal(profile.policy.records.size, 0);
  profile.lifecycle = "BOUNDED_ACTIVE"; for (let index = 0; index < 5; index++) profile.resolveProduction({ decision: { decisionId: `d${index}`, action: "HOLD_THREAD" }, context: {}, actual: { cameraQualityMean: .9, newClaimsShown: 1 }, executed: true });
  assert.ok(profile.policy.records.size > 0); assert.ok(Math.abs([...profile.policy.records.values()][0].adjustment) <= .2);
});

test("observing lifecycle records but does not mutate calibration or policy", () => {
  const profile = new AuthorLearningProfile({ lifecycle: "OBSERVING" });
  profile.resolveForecast({ forecast: { forecastId: "f", modelId: "model", outcomes: [{ id: "YES", probability: .8 }, { id: "NO", probability: .2 }] }, resolution: { status: "RESOLVED", observedOutcome: "YES" } });
  profile.resolveProduction({ decision: { decisionId: "d", action: "HOLD_THREAD" }, actual: { cameraQualityMean: 1 }, executed: true });
  assert.equal(profile.calibration.records.size, 0); assert.equal(profile.policy.records.size, 0); assert.equal(profile.revision, 0);
});

test("corrupt ACSS learning profiles are quarantined and recovered", () => {
  const storage = { items: new Map(), getItem(key) { return this.items.get(key) ?? null; }, setItem(key, value) { this.items.set(key, value); }, removeItem(key) { this.items.delete(key); } }, store = new BrowserAuthorProfileStore({ storage }), profile = new AuthorLearningProfile({ lifecycle: "CALIBRATING" });
  store.save(profile); profile.lifecycle = "BOUNDED_ACTIVE"; profile.revision += 1; store.save(profile); const corrupt = JSON.parse(storage.getItem(store.key)); corrupt.policy.records["bad"] = { samples: 100, adjustment: 99 }; storage.setItem(store.key, JSON.stringify(corrupt)); const recovered = store.load();
  assert.equal(recovered.lifecycle, "CALIBRATING"); assert.ok(storage.getItem(`${store.key}:quarantined`));
});

test("unexecuted shadow decisions do not resolve production forecasts from another camera", () => {
  const author = new ACSSPredictiveAuthor({ mode: "V3_SHADOW", lifecycle: "CALIBRATING", profileStore: { load: () => new AuthorLearningProfile({ lifecycle: "CALIBRATING" }), save: () => true, backup: () => true } });
  const selected = author.selectPresentation({ scenes: [activity], simulation, policy: { subjectMode: "characters" }, tick: 10 });
  const before = author.health().forecasts.open;
  const evaluated = author.evaluate(selected.contract.decision, { tick: 20, executed: false, cameraQualityMean: .1, containmentMean: .1, semanticDuplication: 1 });
  assert.equal(evaluated.forecastResolutions.length, 0);
  assert.equal(author.health().forecasts.open, before);
});

test("operator preference changes style allocation without changing evidence", () => {
  const profile = new AuthorLearningProfile(); profile.preferences.markCharacter("A", 1); assert.equal(profile.preferences.character("A"), 1); assert.equal(profile.calibration.records.size, 0);
});

test("measured successful camera families become bounded production preferences", () => {
  const profile = new AuthorLearningProfile({ lifecycle: "BOUNDED_ACTIVE" }), context = { scene: { kind: "activity" }, methodId: "drink-confirmed-shoreline", phase: "travel", preset: "classic", subjectCount: 1 };
  for (let index = 0; index < 7; index += 1) profile.resolveProduction({ decision: { decisionId: `tracking-${index}`, action: "HOLD_THREAD" }, context, actual: { cameraFamily: "tracking", shotSize: "medium", cameraQualityMean: 1, newClaimsShown: 1 }, executed: true });
  const author = new ACSSPredictiveAuthor({ mode: "V3_SHADOW", profileStore: { load: () => profile, save: () => true } }), selected = author.selectPresentation({ scenes: [activity], simulation, policy: { subjectMode: "characters" }, tick: 10 });
  assert.equal(selected.contract.camera.preferredFamilies[0], "tracking");
  assert.ok(Math.abs(profile.production.adjustment("CAMERA_FAMILY:tracking", context)) <= .12);
});

test("learned camera preference reorders only the safe ACSS camera contract", () => {
  const storage = { items: new Map(), getItem(key) { return this.items.get(key) ?? null; }, setItem(key, value) { this.items.set(key, value); }, removeItem(key) { this.items.delete(key); } }, audience = new AudienceLearningSystem({ store: new BrowserAudienceProfileStore({ storage }) }); audience.compare({ featureA: { "camera:family:still": 1 }, featureB: { "camera:family:tracking": 1 }, preferred: "B" }); const author = new ACSSPredictiveAuthor({ mode: "V3_SHADOW", audience, profileStore: { load: () => new AuthorLearningProfile(), save: () => true } }), selected = author.selectPresentation({ scenes: [activity], simulation, policy: { subjectMode: "characters" }, tick: 10 }); assert.equal(selected.contract.camera.preferredFamilies[0], "tracking"); assert.ok(selected.contract.camera.preferredFamilies.every(family => ["still", "tracking", "push-in", "orbit"].includes(family)));
});

test("repeated corroborated camera-loop faults quarantine only the faulty camera family", () => {
  const profile = new AuthorLearningProfile({ lifecycle: "BOUNDED_ACTIVE" }), report = { reportId: "fault", faultCodes: ["CAMERA_LOOP"], severity: "MAJOR", capture: { family: "orbit" }, corroboration: { status: "CONFIRMED_BY_TELEMETRY" } }; profile.recordProductionFault(report); profile.recordProductionFault({ ...report, reportId: "fault-2" }); assert.equal(profile.faults.quarantined("camera-family", "orbit"), true); assert.equal(profile.preferences.characters.size, 0); const author = new ACSSPredictiveAuthor({ mode: "V3_SHADOW", profileStore: { load: () => profile, save: () => true } }), selected = author.selectPresentation({ scenes: [activity], simulation, policy: { subjectMode: "characters" }, tick: 10 }); assert.equal(selected.contract.camera.preferredFamilies.includes("orbit"), false); assert.equal(selected.contract.camera.preferredFamilies.includes("still"), true);
});
