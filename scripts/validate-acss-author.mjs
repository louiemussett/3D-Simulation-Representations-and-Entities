import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ACSSPredictiveAuthor, AuthorLearningProfile } from "../src/documentary-author-v3/index.js";
import { CameraPresentationSession } from "../src/documentary-author/presentation/camera-horizon-planner.js";
import { CameraMetricAccumulator } from "../src/documentary-author/presentation/camera-metric-accumulator.js";
import { createValidationCertificate, validateCertificate } from "../src/documentary-author/learning/validation-certificate.js";
import { stableHash } from "../src/documentary-author/runtime/immutable.js";

const TRAINING_SEEDS = Object.freeze([1103, 2207, 3301, 4409]);
const HELD_OUT_SEEDS = Object.freeze([5501, 6607, 7703]);
const outputDirectory = join(process.cwd(), "test-results");
const reportPath = join(outputDirectory, "acss-validation-report.json");
const certificatePath = join(outputDirectory, "acss-validation-certificate.json");

class MemoryStorage {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

class MemoryProfileStore {
  constructor(profile = new AuthorLearningProfile()) { this.profile = profile; this.profileId = "commissioning"; this.storage = new MemoryStorage(); }
  load() { return this.profile; }
  save(profile) { this.profile = profile; return true; }
  flush() { return Promise.resolve(true); }
}

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
const seeded = seed => { let state = seed >>> 0; return () => { state = state + 0x6d2b79f5 | 0; let value = Math.imul(state ^ state >>> 15, 1 | state); value ^= value + Math.imul(value ^ value >>> 7, 61 | value); return ((value ^ value >>> 14) >>> 0) / 4294967296; }; };

function initialWorld(seed) {
  return {
    seed, tick: 0, ecologicalMinute: 0, day: 1, season: "summer", weather: { type: "clear", rain: 0, wind: .2 }, hydrology: { runoff: .2, infiltration: .6, channelDischarge: .25 }, births: 0, deaths: 0,
    cells: [{ id: "water-1", x: 14, z: 2, drinkable: true, waterDepth: 1.2, plantBiomass: .25 }], corpses: [], events: [],
    animals: [
      entity("grazer-1", "Aster", "grazer", 0, 0),
      entity("grazer-2", "Bracken", "grazer", 3, 1),
      entity("hunter-1", "Cinder", "hunter", 10, 7)
    ]
  };
}

function entity(id, name, speciesId, x, z) {
  return { id, name, speciesId, alive: true, sex: id === "grazer-2" ? "female" : "male", age: 4, lifeStage: "adult", x, z, orientation: 0, energy: 72, hydration: 68, fatigue: 18, fear: 0, endurance: 76, sprintEnergy: 40, emergencyReserve: .45, health: 100, locomotion: { vx: .08, vz: .02, blocked: false }, actionState: { key: "travel", label: "travelling", target: "water-1" }, needDependencyPlan: { needId: "hydration", satisfierId: "surface-water", methodId: "travel-to-water", phase: "travel", targetId: "water-1", blockers: [], prerequisites: [] }, socialMemory: {}, memories: [], longMemory: [], matePreferences: {}, offspringIds: [], caregiverIds: [] };
}

function applyScenario(world, tick, random) {
  const stage = Math.min(10, Math.floor((tick - 1) / 12));
  const primary = world.animals[0], companion = world.animals[1], hunter = world.animals[2];
  world.tick = tick; world.ecologicalMinute = tick; world.day = 1 + tick / 1440; world.events = [];
  primary.x += primary.locomotion.vx; primary.z += primary.locomotion.vz;
  companion.x += .02; companion.z += Math.sin(tick / 9) * .012;
  if (stage === 0) setActivity(primary, "travel", "hydration", "surface-water", "travel-to-water", "travel", "water-1", { energy: 70, hydration: 56, fatigue: 24 });
  else if (stage === 1) setActivity(primary, "drink", "hydration", "surface-water", "drink-at-water", "contact", "water-1", { hydration: 78, fatigue: 28 });
  else if (stage === 2) setActivity(primary, "rest", "recovery", "rest", "brief-recovery", "recover", null, { energy: 44, fatigue: 84, recoveryDepth: "brief" });
  else if (stage === 3) setActivity(primary, "orient", "exploration", "survey", "resume-activity", "resume", null, { energy: 62, fatigue: 52, recoveryDepth: null });
  else if (stage === 4) { setActivity(primary, "flee", "danger", "escape", "flee-from-predator", "response", hunter.id, { fear: 88, fatigue: 60, adrenalineStress: 74 }); hunter.actionState = { key: "chase", target: primary.id }; hunter.needDependencyPlan = { needId: "food", satisfierId: "prey", methodId: "pursue-prey", phase: "chase", targetId: primary.id }; }
  else if (stage === 5) { const contact = random() > .5; setActivity(primary, contact ? "defend" : "orient", "safety", "distance", "resolve-danger", "outcome", hunter.id, { fear: contact ? 72 : 38, fatigue: 68, adrenalineStress: 45 }); hunter.actionState = { key: contact ? "attack" : "search", target: contact ? primary.id : null }; }
  else if (stage === 6) { setActivity(primary, "call", "social", "affiliation", "social-call", "reaction", companion.id, { fear: 10, fatigue: 42 }); primary.socialMemory = { [companion.id]: { familiarity: .8, lastContactTick: tick } }; companion.actionState = { key: "care", target: primary.id }; }
  else if (stage === 7) { setActivity(primary, "travel", "social", "separation", "leave-interaction", "outcome", companion.id, { fatigue: 38 }); companion.actionState = { key: "forage", target: null }; }
  else if (stage === 8) { setActivity(primary, "court", "reproduction", "mate", "courtship-display", "preference", companion.id, { energy: 68, fatigue: 30 }); primary.matePreferences = { condition: .7, familiarity: .55 }; companion.actionState = { key: "court", target: primary.id }; companion.matePreferences = { condition: .8, familiarity: .6 }; }
  else if (stage === 9) { setActivity(primary, "orient", "reproduction", "mate", "courtship-display", "outcome", companion.id, { energy: 65, fatigue: 34 }); companion.actionState = { key: "forage", target: null }; }
  else { setActivity(primary, "forage", "food", "plants", "graze-patch", "acquire", null, { energy: 73, fatigue: 26 }); world.weather = { type: "rain", rain: .65, wind: .35 }; world.hydrology = { runoff: .65, infiltration: .48, channelDischarge: .72 }; }
  if (tick === 50) world.events.push({ eventId: `attack-${world.seed}`, eventType: "ATTACK", subjectIds: [hunter.id, primary.id], importance: 96, occurredAtTick: tick, detail: `${hunter.name} closes on ${primary.name}.` });
  return stage;
}

function setActivity(entityValue, action, needId, satisfierId, methodId, phase, targetId, physiology = {}) {
  entityValue.actionState = { key: action, label: action, target: targetId };
  entityValue.needDependencyPlan = { needId, satisfierId, methodId, phase, targetId, blockers: [], prerequisites: [] };
  Object.assign(entityValue, physiology);
  entityValue.locomotion.vx = ["travel", "flee"].includes(action) ? .15 : ["rest", "drink", "court"].includes(action) ? 0 : .04;
  entityValue.locomotion.vz = action === "flee" ? -.1 : .01;
}

function currentScenes(world, stage) {
  const primary = world.animals[0], companion = world.animals[1], subjects = [primary.id];
  if ([4, 5].includes(stage)) subjects.push("hunter-1");
  if ([6, 7, 8, 9].includes(stage)) subjects.push(companion.id);
  const event = world.events[0];
  const activity = { id: `activity:${primary.id}:${stage}`, kind: "activity", actionKey: primary.actionState.key, ids: subjects, semanticRoleIds: subjects, focus: { x: primary.x, z: primary.z }, importance: stage === 4 || stage === 5 ? 88 : 62, score: stage === 4 || stage === 5 ? 88 : 62, cameraRisk: 0, title: `${primary.name}: ${primary.actionState.label}`, detail: `${primary.name} is ${primary.actionState.label}.` };
  const worldScene = { id: `world:${stage}`, kind: "landscape", worldSubject: true, ids: [], semanticRoleIds: [], focus: { x: 5, z: 3 }, importance: stage === 10 ? 74 : 24, score: stage === 10 ? 74 : 24, title: "Water and weather", detail: "Weather and hydrology continue across the habitat." };
  return event ? [{ ...event, id: event.eventId, kind: "ecosystem-event", sceneKind: "VERIFIED_EVENT", semanticRoleIds: event.subjectIds, ids: event.subjectIds, focus: { x: primary.x, z: primary.z }, score: event.importance }, activity, worldScene] : [activity, worldScene];
}

function cameraGoal(contract, focus) {
  const size = contract.camera.preferredShotSizes[0] || "MEDIUM", distance = size === "CLOSE" ? 6 : size === "WIDE" ? 17 : 10;
  return { position: { x: focus.x + distance * .78, y: 4 + distance * .48, z: focus.z + distance * .62 }, target: { x: focus.x, y: .8, z: focus.z }, fov: size === "WIDE" ? 52 : size === "CLOSE" ? 37 : 44 };
}

function executeCamera(contract, focus, priorPose) {
  const goal = cameraGoal(contract, focus), validatePose = candidate => { const distance = Math.hypot(candidate.position.x - focus.x, candidate.position.z - focus.z), targetError = Math.hypot(candidate.target.x - focus.x, candidate.target.z - focus.z), clearance = candidate.position.y; return { valid: clearance >= 1.2 && distance >= 2, visibility: clamp01(1 - targetError / 10), composition: clamp01(1 - Math.abs(distance - Math.hypot(goal.position.x - focus.x, goal.position.z - focus.z)) / 25), containment: clamp01(1 - Math.max(0, distance - 24) / 20), clearance: clamp01(clearance / 4), subjectScreenArea: clamp01(5 / Math.max(5, distance)) }; }, session = new CameraPresentationSession({ terrainHeight: () => 0, validatePose }), accumulator = new CameraMetricAccumulator(priorPose);
  session.begin({ current: priorPose, goal, contract, nowSeconds: 0 }); let current = priorPose;
  for (let frame = 1; frame <= 72; frame += 1) { const pose = session.step({ current, goal, observedFocus: { x: focus.x, y: .8, z: focus.z }, dtSeconds: 1 / 60, nowSeconds: frame / 60 }), metrics = validatePose(pose); accumulator.sample({ pose, metrics, dtSeconds: 1 / 60, predictedZone: contract.camera.predictedActionZone, observedFocus: focus }); current = { position: { ...pose.position }, target: { ...pose.target }, fov: pose.fov }; }
  return { pose: current, metrics: accumulator.finalize(), diagnostic: session.diagnostic() };
}

async function runSeeds(author, seeds, label) {
  const startTrace = author.trace.length, cameraRows = [], selection = { attempted: 0, selected: 0, contracts: 0, invalid: 0, unsupportedClaims: 0, subjectPolicyViolations: 0 }, storyRows = [];
  for (const seed of seeds) {
    const random = seeded(seed), world = initialWorld(seed); author.beginSession({ sessionId: `${label}-${seed}`, simulationSeed: seed, tick: 0 }); let priorPose = { position: { x: 24, y: 18, z: 24 }, target: { x: 0, y: .8, z: 0 }, fov: 45 }, priorStage = -1;
    for (let tick = 1; tick <= 132; tick += 1) {
      const stage = applyScenario(world, tick, random), scenes = currentScenes(world, stage);
      if (tick % 6 !== 0) { author.observe(world, { scenes, tick }); continue; }
      selection.attempted += 1;
      const selected = author.selectPresentation({ scenes, simulation: world, tick, policy: { presetName: "all-features", subjectMode: "balanced", continuity: "strong", pacing: "balanced", eventPriority: "balanced", narrationEnabled: true, voiceEnabled: true, captionsEnabled: true, contextDepth: 5, lensPreset: "laboratory" } });
      if (!selected) continue;
      selection.selected += 1; selection.contracts += Number(Boolean(selected.contract)); selection.invalid += Number(!selected.contract?.valid); selection.unsupportedClaims += selected.contract.allowedClaimIds.filter(id => !author.currentObservation?.propositions?.get?.(id)).length;
      if (selected.scene.worldSubject && selected.contract.subjectIds.length) selection.subjectPolicyViolations += 1;
      const camera = executeCamera(selected.contract, selected.scene.focus || { x: 0, z: 0 }, priorPose); priorPose = camera.pose; cameraRows.push(camera.metrics);
      const cameraQualityMean = (camera.metrics.visibilityMean + camera.metrics.compositionMean + camera.metrics.containmentMean) / 3;
      author.markDecisionExecuted({ contract: selected.contract, cameraFamily: selected.contract.camera.preferredFamilies[0], shotSize: selected.contract.camera.preferredShotSizes[0], tick });
      author.markPresented({ contract: selected.contract, claimIds: selected.contract.allowedClaimIds, text: "commissioning presentation" }, { tick });
      author.evaluate(selected.contract.decision, { tick, executed: true, cameraFamily: selected.contract.camera.preferredFamilies[0], shotSize: selected.contract.camera.preferredShotSizes[0], narrationFunction: selected.contract.narration.function, newClaimsShown: selected.contract.allowedClaimIds.length, questionResolved: stage !== priorStage && [1, 3, 5, 7, 9, 10].includes(stage), outcomeShown: stage !== priorStage, cameraQualityMean, ...camera.metrics, predictedZoneError: camera.metrics.predictedZoneError, semanticDuplication: 0, criticalEventsMissed: 0, unsupportedClaims: 0 });
      if (stage !== priorStage) author.completeCurrentBeat({ outcomeChanged: true, shown: true, narratedClaimIds: selected.contract.allowedClaimIds, tick });
      priorStage = stage;
    }
    for (let tick = 133; tick <= 166; tick += 1) { const stage = applyScenario(world, tick, random); author.observe(world, { scenes: currentScenes(world, stage), tick }); }
    const obligationSnapshot = author.stories.obligations.snapshot();
    author.endSession({ reason: "commissioning-seed-complete", tick: 166 });
    const closed = author.stories.obligations.snapshot(); storyRows.push({ seed, beforeCloseActive: obligationSnapshot.active.length, afterCloseActive: closed.active.length, terminal: closed.terminal.length });
  }
  const trace = author.trace.slice(startTrace), contractRejections = trace.filter(row => row.type === "author_contract_rejected").map(row => row.payload), silenceReasons = trace.filter(row => row.type === "author_silence_selected").slice(-10).map(row => row.payload), opened = new Map(trace.filter(row => row.type === "author_forecast_opened").map(row => [row.payload.forecastId, row.payload])), resolutionRows = trace.filter(row => row.type === "author_forecast_resolved").map(row => ({ ...row.payload, forecast: opened.get(row.payload.forecastId) })).filter(row => row.forecast), resolved = resolutionRows.filter(row => row.status === "RESOLVED"), due = resolutionRows.filter(row => ["RESOLVED", "EXPIRED_UNOBSERVABLE"].includes(row.status)), brier = resolved.map(row => row.brierScore).filter(Number.isFinite), logLoss = resolved.map(row => row.logLoss).filter(Number.isFinite), modelFamilies = {}, modelResults = {};
  for (const row of resolved) { const family = row.forecast.family || "UNKNOWN", record = modelFamilies[family] ||= { resolved: 0, brier: 0, logLoss: 0 }, model = modelResults[row.forecast.modelId] ||= { family, resolved: 0, brier: 0, logLoss: 0 }; record.resolved += 1; record.brier += Number(row.brierScore || 0); record.logLoss += Number(row.logLoss || 0); model.resolved += 1; model.brier += Number(row.brierScore || 0); model.logLoss += Number(row.logLoss || 0); }
  for (const record of Object.values(modelFamilies)) { record.meanBrier = record.brier / record.resolved; record.meanLogLoss = record.logLoss / record.resolved; delete record.brier; delete record.logLoss; }
  for (const record of Object.values(modelResults)) { record.meanBrier = record.brier / record.resolved; record.meanLogLoss = record.logLoss / record.resolved; delete record.brier; delete record.logLoss; }
  const mean = (rows, key) => rows.length ? rows.reduce((sum, row) => sum + Number(row[key] || 0), 0) / rows.length : 0;
  return { label, seeds, selection: { ...selection, contractRejections: contractRejections.slice(-20), silenceReasons }, forecasts: { opened: opened.size, resolved: resolved.length, due: due.length, resolutionRate: due.length ? resolved.length / due.length : 1, censored: resolutionRows.filter(row => row.status === "CENSORED").length, invalidated: resolutionRows.filter(row => row.status === "INVALIDATED").length, expiredUnobservable: resolutionRows.filter(row => row.status === "EXPIRED_UNOBSERVABLE").length, meanBrier: brier.length ? brier.reduce((a, b) => a + b, 0) / brier.length : 0, meanLogLoss: logLoss.length ? logLoss.reduce((a, b) => a + b, 0) / logLoss.length : 0, modelFamilies, modelResults }, camera: { presentations: cameraRows.length, visibilityMean: mean(cameraRows, "visibilityMean"), compositionMean: mean(cameraRows, "compositionMean"), containmentMean: mean(cameraRows, "containmentMean"), invalidPoseFraction: mean(cameraRows, "invalidPoseFraction"), subjectLossFraction: mean(cameraRows, "subjectLossFraction"), discontinuityCount: cameraRows.reduce((sum, row) => sum + row.discontinuityCount, 0), maximumSpeed: Math.max(0, ...cameraRows.map(row => row.maximumSpeed)), maximumAcceleration: Math.max(0, ...cameraRows.map(row => row.maximumAcceleration)), maximumJerk: Math.max(0, ...cameraRows.map(row => row.maximumJerk)) }, stories: { sessions: storyRows, unterminatedAfterClose: storyRows.reduce((sum, row) => sum + row.afterCloseActive, 0) }, traceRecords: trace.length };
}

function authorWith(profile, mode = "V3_ACTIVE") { return new ACSSPredictiveAuthor({ mode, profileStore: new MemoryProfileStore(profile) }); }
const observeProfile = snapshot => new AuthorLearningProfile({ ...snapshot, lifecycle: "OBSERVING", validated: false, validationCertificate: null, profileChecksum: null });

await mkdir(outputDirectory, { recursive: true });
const trainingAuthor = authorWith(new AuthorLearningProfile({ lifecycle: "BOUNDED_ACTIVE" }));
const training = await runSeeds(trainingAuthor, TRAINING_SEEDS, "training");
const learnedSnapshot = trainingAuthor.learning.snapshot();
const heldOutProfile = observeProfile(learnedSnapshot), heldOutAuthor = authorWith(heldOutProfile), heldOutChecksumBefore = heldOutProfile.snapshot().profileChecksum;
const heldOut = await runSeeds(heldOutAuthor, HELD_OUT_SEEDS, "held-out"), heldOutChecksumAfter = heldOutProfile.snapshot().profileChecksum;
const baselineProfile = new AuthorLearningProfile({ lifecycle: "OBSERVING" }), baseline = await runSeeds(authorWith(baselineProfile), HELD_OUT_SEEDS, "untrained-baseline");
let browserCommissioning = null;
try { browserCommissioning = JSON.parse(await readFile(join(outputDirectory, "acss-browser-commissioning.json"), "utf8")); } catch { browserCommissioning = { passed: false, error: "browser commissioning report missing" }; }

const safetyViolations = [];
if (heldOut.selection.invalid) safetyViolations.push("invalid-presentation-contract");
if (heldOut.selection.unsupportedClaims) safetyViolations.push("unsupported-claim-reference");
if (heldOut.selection.subjectPolicyViolations) safetyViolations.push("subject-policy-violation");
if (heldOut.camera.invalidPoseFraction > .01) safetyViolations.push("camera-invalid-pose-budget");
if (heldOut.camera.discontinuityCount) safetyViolations.push("camera-discontinuity");
if (heldOut.stories.unterminatedAfterClose) safetyViolations.push("unterminated-return-obligation");
if (heldOutChecksumBefore !== heldOutChecksumAfter) safetyViolations.push("observe-only-profile-mutated");
const thresholds = {
  selectionRate: heldOut.selection.selected / Math.max(1, heldOut.selection.attempted) >= .9,
  observableForecastResolution: heldOut.forecasts.resolutionRate >= .95,
  forecastNonInferiority: heldOut.forecasts.meanBrier <= baseline.forecasts.meanBrier + .035,
  cameraVisibility: heldOut.camera.visibilityMean >= .82,
  cameraContainment: heldOut.camera.containmentMean >= .82,
  cameraNoDiscontinuity: heldOut.camera.discontinuityCount === 0,
  storyObligationsTerminate: heldOut.stories.unterminatedAfterClose === 0,
  observeOnlyByteStable: heldOutChecksumBefore === heldOutChecksumAfter,
  browserCommissioned: browserCommissioning.passed === true,
  noSafetyViolations: safetyViolations.length === 0
};
const passed = Object.values(thresholds).every(Boolean);
const certificateInput = { profileRevision: trainingAuthor.learning.revision + 1, registryVersion: trainingAuthor.learning.registryVersion, trainingSeedSetHash: stableHash(TRAINING_SEEDS), heldOutSeedSetHash: stableHash(HELD_OUT_SEEDS), modelFamilyResults: heldOut.forecasts.modelFamilies, documentaryMetrics: { selectionRate: heldOut.selection.selected / Math.max(1, heldOut.selection.attempted), forecastResolutionRate: heldOut.forecasts.resolutionRate, meanBrier: heldOut.forecasts.meanBrier, baselineMeanBrier: baseline.forecasts.meanBrier, returnObligationsTerminated: heldOut.stories.unterminatedAfterClose === 0 }, cameraMetrics: heldOut.camera, safetyViolations, approvedCapabilities: passed ? ["CONTROL_BOUNDED", "CONTROL_VALIDATED"] : ["CONTROL_BOUNDED"] };
const certificate = createValidationCertificate(certificateInput), certificateValidation = validateCertificate(certificate, { profileRevision: certificateInput.profileRevision, registryVersion: certificateInput.registryVersion, requiredCapabilities: passed ? ["CONTROL_VALIDATED"] : ["CONTROL_BOUNDED"] });
let validatedActivation = { attempted: false, succeeded: false };
if (passed && certificateValidation.valid) { trainingAuthor.learning.validated = true; trainingAuthor.learning.validationCertificate = certificate; trainingAuthor.learning.refreshCapabilities(); validatedActivation = { attempted: true, succeeded: trainingAuthor.setLearningLifecycle("VALIDATED_ACTIVE") === "VALIDATED_ACTIVE" && trainingAuthor.canControl(), resultingRevision: trainingAuthor.learning.revision }; }
const parentReliability = Object.entries(learnedSnapshot.calibration.records).filter(([key]) => key.endsWith("::*")).map(([key, value]) => ({ modelId: key.slice(0, -3), samples: value.samples, reliability: value.alpha / Math.max(1, value.alpha + value.beta), meanBrier: value.meanBrier })).sort((left, right) => left.reliability - right.reliability);
const report = { schemaVersion: 2, evaluatedAtUtc: new Date().toISOString(), passed: passed && certificateValidation.valid && (!validatedActivation.attempted || validatedActivation.succeeded), thresholds, safetyViolations, seedPartitions: { training: TRAINING_SEEDS, heldOut: HELD_OUT_SEEDS, trainingHash: certificateInput.trainingSeedSetHash, heldOutHash: certificateInput.heldOutSeedSetHash }, training, heldOut, baseline, observeOnly: { checksumBefore: heldOutChecksumBefore, checksumAfter: heldOutChecksumAfter, byteStable: heldOutChecksumBefore === heldOutChecksumAfter }, browserCommissioning, certificateValidation, validatedActivation, learning: { trainingRevision: learnedSnapshot.revision, calibrationRecords: Object.keys(learnedSnapshot.calibration.records).length, productionPolicyRecords: Object.keys(learnedSnapshot.production.records).length, policyRecords: Object.keys(learnedSnapshot.policy.records).length, parentReliability } };
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(certificatePath, `${JSON.stringify(certificate, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.passed) process.exitCode = 1;
