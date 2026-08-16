import { ReadonlyMapView, clonePlain, deepFreeze, stableHash } from "../runtime/immutable.js";
import { observableBodyCues } from "../../observable-body-cues.js";

const ENTITY_IGNORE = /^(mesh|model|sprite|material|geometry|texture|parent|children|scene|userData|matrix|matrixWorld|quaternion)$/i;
const CELL_IGNORE = /^(mesh|model|sprite|material|geometry|texture|parent|children|scene|userData|matrix|matrixWorld|quaternion|neighbours|neighbors)$/i;
const ENTITY_PROJECTIONS = new WeakMap();
const CORPSE_PROJECTIONS = new WeakMap();
const CELL_PROJECTIONS = new WeakMap();
const PROJECTION_FINGERPRINTS = new WeakMap();

const scalar = (value, fallback = null) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const identifier = value => value == null || value === "" ? null : String(value);
const sortedIds = values => [...new Set((values || []).map(identifier).filter(Boolean))].sort();

const explicitRevision = value => {
  for (const key of ["documentaryRevision", "observationRevision", "stateRevision", "archiveRevision", "revision"]) {
    const revision = value?.[key];
    if (revision !== undefined && revision !== null) return `${key}:${String(revision)}`;
  }
  return null;
};

const activeAt = (until, tick) => Number.isFinite(Number(until)) ? Number(until) > Number(tick || 0) : null;
const entityProjectionToken = (entity, tick) => {
  const revision = explicitRevision(entity);
  if (revision == null) return null;
  return `${revision}|signal:${activeAt(entity?.socialSignal?.until ?? entity?.activeSignal?.until ?? entity?.callout?.until, tick)}|vocal:${activeAt(entity?.vocalUntil, tick)}|expression:${activeAt(entity?.expressionUntil, tick)}`;
};
const cachedProjection = (cache, source, token, project) => {
  if (!source || typeof source !== "object" || token == null) return project();
  const cached = cache.get(source);
  if (cached?.token === token) return cached.value;
  const value = project();
  cache.set(source, { token, value });
  return value;
};
const projectionFingerprint = value => {
  if (!value || typeof value !== "object") return stableHash(value);
  let fingerprint = PROJECTION_FINGERPRINTS.get(value);
  if (!fingerprint) { fingerprint = stableHash(value); PROJECTION_FINGERPRINTS.set(value, fingerprint); }
  return fingerprint;
};

function publicSignalRecord(signal = null, observableKind = null, vocalActive = false) {
  if (!signal || !observableKind) return null;
  return {
    kind: String(observableKind),
    urgency: scalar(signal.urgency),
    sourceId: identifier(signal.sourceId),
    targetId: identifier(signal.targetId),
    inferredTargetId: identifier(signal.inferredTargetId || signal.predatorId),
    since: scalar(signal.since),
    until: scalar(signal.until),
    channel: signal.channel || null,
    vocal: Boolean(vocalActive || signal.vocal || signal.isVocal)
  };
}

function buildDocumentaryEntity(entity = {}, tick = entity.presentationTick || 0) {
  const plan = entity.needDependencyPlan || entity.activePlan || {};
  const action = entity.actionState || {};
  const stress = entity.stressResponse || entity.stressState || {};
  const recovery = entity.recoveryState || {};
  const metabolism = entity.metabolism || entity.metabolicState || {};
  const composition = entity.bodyComposition || {};
  const identityId = identifier(entity.id);
  const observable = observableBodyCues(entity, tick);
  const legacyCandidate = entity.socialSignal ? null : entity.activeSignal || entity.callout;
  const legacySignal = legacyCandidate && (legacyCandidate.until == null || Number(legacyCandidate.until) > Number(tick || 0)) ? legacyCandidate : null;
  const emittedSignal = observable.emittedSignal
    ? publicSignalRecord(entity.socialSignal, observable.emittedSignal, Number(entity.vocalUntil || 0) > Number(tick || 0))
    : publicSignalRecord(legacySignal, legacySignal?.kind || legacySignal?.label || (typeof legacySignal === "string" ? legacySignal : null));
  return deepFreeze({
    id: identityId,
    identityId,
    name: String(entity.name || entity.label || identityId || "Unnamed entity"),
    speciesId: identifier(entity.speciesId),
    alive: entity.alive !== false,
    sex: entity.sex || null,
    age: scalar(entity.age),
    lifeStage: entity.lifeStage || entity.stage || null,
    position: { x: scalar(entity.x, 0), y: scalar(entity.y, 0), z: scalar(entity.z, 0) },
    orientation: scalar(entity.orientation, 0),
    velocity: {
      x: scalar(entity.locomotion?.vx ?? entity.velocityX, 0),
      z: scalar(entity.locomotion?.vz ?? entity.velocityZ, 0)
    },
    destination: clonePlain(entity.moveTo || entity.movementRequest?.destination || entity.destination, { maximumDepth: 3, maximumRecords: 64, ignoredKeys: ENTITY_IGNORE }),
    movement: clonePlain(entity.movementRequest || entity.locomotion, { maximumDepth: 4, maximumRecords: 192, ignoredKeys: ENTITY_IGNORE }),
    action: {
      key: action.key || entity.actionKey || null,
      label: action.label || entity.actionLabel || null,
      targetId: identifier(action.targetId || action.target || entity.actionTarget || entity.predation?.targetId),
      intendedOutcome: action.intendedOutcome || null,
      reason: action.reason || entity.lastActionReason || null
    },
    plan: {
      needId: plan.needId || plan.need || entity.drive || null,
      satisfierId: plan.satisfierId || plan.satisfier || null,
      methodId: plan.methodId || plan.method || null,
      phase: plan.phase || entity.planPhase || null,
      targetId: identifier(plan.targetId || plan.target?.id || action.targetId || action.target || entity.actionTarget),
      blockers: clonePlain(plan.blockers || plan.failures || [], { maximumDepth: 3, maximumRecords: 96, ignoredKeys: ENTITY_IGNORE }),
      prerequisites: clonePlain(plan.prerequisites || [], { maximumDepth: 3, maximumRecords: 96, ignoredKeys: ENTITY_IGNORE }),
      reconsiderationReason: plan.reconsiderationReason || plan.reason || null
    },
    physiology: {
      health: scalar(entity.health), hydration: scalar(entity.hydration), energy: scalar(entity.energy), fatigue: scalar(entity.fatigue), fear: scalar(entity.fear),
      endurance: scalar(entity.endurance ?? entity.performanceState?.endurance), sprintCapacity: scalar(entity.sprintEnergy ?? entity.performanceState?.burst),
      emergencyReserve: scalar(entity.emergencyReserve), adrenalineStress: scalar(entity.adrenalineStress ?? stress.intensity), stressPhase: stress.phase || null,
      recoveryDepth: recovery.depth || entity.recoveryDepth || null, recoveryDebt: clonePlain(entity.utilisation?.recoveryDebt || recovery.debt, { maximumDepth: 3, maximumRecords: 64, ignoredKeys: ENTITY_IGNORE }),
      gutContents: scalar(entity.stomach ?? metabolism.gutContents), bodyMass: scalar(entity.bodyMass), fatMass: scalar(composition.fatMass ?? entity.fatMass),
      muscleMass: scalar(composition.muscleMass ?? entity.muscleMass), anaerobicDebt: scalar(metabolism.anaerobicDebt), bodyTemperature: scalar(entity.bodyTemperature), thermalStatus: entity.thermalStatus || null,
      pregnant: Boolean(entity.pregnant), pregnancy: clonePlain(entity.pregnant || entity.pregnancy, { maximumDepth: 4, maximumRecords: 96, ignoredKeys: ENTITY_IGNORE }), lactation: scalar(entity.lactation)
    },
    expression: clonePlain({ kind: observable.expression, observable: true }, { maximumDepth: 3, maximumRecords: 48, ignoredKeys: ENTITY_IGNORE }),
    posture: clonePlain(entity.posture || entity.pose || { activity: observable.activity, headMovement: observable.headMovement, gait: observable.gait, movementPace: observable.movementPace }, { maximumDepth: 3, maximumRecords: 48, ignoredKeys: ENTITY_IGNORE }),
    calls: clonePlain({ emitted: emittedSignal, received: entity.receivedSignals, heard: entity.heardEvents }, { maximumDepth: 5, maximumArray: 24, maximumRecords: 256, ignoredKeys: ENTITY_IGNORE }),
    perception: clonePlain(entity.sensoryBuffer || entity.perception || entity.contacts, { maximumDepth: 5, maximumArray: 48, maximumRecords: 384, ignoredKeys: ENTITY_IGNORE }),
    memories: clonePlain([...(entity.memories || []), ...(entity.longMemory || [])], { maximumDepth: 5, maximumArray: 64, maximumRecords: 512, ignoredKeys: ENTITY_IGNORE }),
    relationships: clonePlain(entity.socialMemory || entity.relationships, { maximumDepth: 5, maximumKeys: 128, maximumRecords: 512, ignoredKeys: ENTITY_IGNORE }),
    reproduction: clonePlain({ matePreferences: entity.matePreferences, mateGraph: entity.femaleMateGraph || entity.mateRatings || entity.femaleRatings, reproductionEvent: entity.reproductionEvent }, { maximumDepth: 6, maximumRecords: 512, ignoredKeys: ENTITY_IGNORE }),
    lineage: { motherId: identifier(entity.motherId), fatherId: identifier(entity.fatherId), offspringIds: sortedIds(entity.offspringIds), caregiverIds: sortedIds(entity.caregiverIds) },
    social: { groupId: identifier(entity.groupId), groupLeaderId: identifier(entity.groupLeaderId), groupGoal: clonePlain(entity.groupGoal, { maximumDepth: 3, maximumRecords: 64, ignoredKeys: ENTITY_IGNORE }), commitment: clonePlain(entity.commitmentState, { maximumDepth: 4, maximumRecords: 128, ignoredKeys: ENTITY_IGNORE }) },
    predation: clonePlain(entity.predation, { maximumDepth: 5, maximumRecords: 256, ignoredKeys: ENTITY_IGNORE }),
    archive: clonePlain(entity, { maximumDepth: 7, maximumArray: 64, maximumKeys: 256, maximumRecords: 2048, ignoredKeys: ENTITY_IGNORE })
  });
}

function documentaryEntity(entity = {}, tick = entity.presentationTick || 0) {
  return cachedProjection(ENTITY_PROJECTIONS, entity, entityProjectionToken(entity, tick), () => buildDocumentaryEntity(entity, tick));
}

function buildDocumentaryCorpse(corpse = {}) {
  const identityId = identifier(corpse.sourceId || corpse.entityId || corpse.deceasedId || corpse.id);
  return deepFreeze({
    id: identifier(corpse.id),
    identityId,
    name: String(corpse.name || corpse.sourceName || corpse.label || identityId || "Unidentified remains"),
    speciesId: identifier(corpse.speciesId),
    stage: corpse.stage || corpse.corpseStage || (corpse.skeleton ? "skeleton" : "corpse"),
    position: { x: scalar(corpse.x, 0), y: scalar(corpse.y, 0), z: scalar(corpse.z, 0) },
    createdAtTick: scalar(corpse.createdAtTick ?? corpse.deathTick),
    biomass: scalar(corpse.biomass),
    cause: clonePlain(corpse.cause || corpse.causeOfDeath, { maximumDepth: 4, maximumRecords: 96, ignoredKeys: ENTITY_IGNORE }),
    archive: clonePlain(corpse, { maximumDepth: 6, maximumArray: 48, maximumRecords: 1024, ignoredKeys: ENTITY_IGNORE })
  });
}

function documentaryCorpse(corpse = {}) {
  return cachedProjection(CORPSE_PROJECTIONS, corpse, explicitRevision(corpse), () => buildDocumentaryCorpse(corpse));
}

function buildDocumentaryCell(cell = {}) {
  const archive = clonePlain(cell, { maximumDepth: 2, maximumArray: 24, maximumKeys: 256, maximumRecords: 384, ignoredKeys: CELL_IGNORE });
  return deepFreeze({ id: identifier(cell.id), x: scalar(cell.x, 0), z: scalar(cell.z, 0), archive });
}

function documentaryCell(cell = {}) {
  return cachedProjection(CELL_PROJECTIONS, cell, explicitRevision(cell), () => buildDocumentaryCell(cell));
}

function verifiedEvent(event = {}, tick = 0) {
  const eventType = String(event.eventType || event.ecologicalEventType || event.kind || "OBSERVATION").toUpperCase();
  const subjectIds = sortedIds(event.subjectIds || event.semanticRoleIds || event.ids);
  return deepFreeze({
    eventId: identifier(event.eventId || event.id) || `event:${eventType}:${subjectIds.join("+") || "world"}:${event.occurredAtTick ?? tick}`,
    sceneKind: "VERIFIED_EVENT",
    eventType,
    subjectIds,
    subjectRoles: clonePlain(event.subjectRoles || { actors: subjectIds }, { maximumDepth: 4, maximumRecords: 128, ignoredKeys: ENTITY_IGNORE }),
    importance: scalar(event.importance ?? event.eventPriority ?? event.score, 0),
    occurredAtTick: scalar(event.occurredAtTick ?? event.detectedTick, tick),
    detail: String(event.detail || event.title || ""),
    evidenceIds: sortedIds(event.evidenceIds)
  });
}

export function captureDocumentarySnapshot(simulation = {}, { scenes = [], capturedAtMonotonicMs = null } = {}) {
  const tick = scalar(simulation.tick, 0);
  const entities = (simulation.animals || []).filter(Boolean).map(entity => [String(entity.id), documentaryEntity(entity, tick)]);
  const corpses = (simulation.corpses || []).filter(Boolean).map(corpse => [String(corpse.id), documentaryCorpse(corpse)]);
  const rawCells = simulation.hexWorld?.cells || simulation.cells || [];
  const cells = rawCells.filter(Boolean).map(cell => [String(cell.id), documentaryCell(cell)]);
  const sceneEvents = scenes.filter(scene => scene?.sceneKind === "VERIFIED_EVENT" || scene?.kind === "ecosystem-event");
  const simulationEvents = (simulation.events || []).slice(-256);
  const eventsById = new Map([...simulationEvents, ...sceneEvents].map(event => { const normalized = verifiedEvent(event, tick); return [normalized.eventId, normalized]; }));
  const entityFingerprint = stableHash(entities.map(([id, entity]) => [id, projectionFingerprint(entity)]));
  const corpseFingerprint = stableHash(corpses.map(([id, corpse]) => [id, projectionFingerprint(corpse)]));
  const cellFingerprint = stableHash(cells.map(([id, cell]) => [id, projectionFingerprint(cell)]));
  const eventFingerprint = stableHash([...eventsById.values()].map(event => projectionFingerprint(event)));
  const entityByIdentityId = new ReadonlyMapView(entities.map(([, entity]) => [entity.identityId, entity]));
  const corpseByIdentityId = new ReadonlyMapView(corpses.map(([, corpse]) => [corpse.identityId, corpse]));
  const eventById = new ReadonlyMapView(eventsById);
  const world = deepFreeze({
    day: scalar(simulation.day), season: simulation.season || null, weather: clonePlain(simulation.weather, { maximumDepth: 5, maximumRecords: 256, ignoredKeys: ENTITY_IGNORE }),
    hydrology: clonePlain(simulation.hydrology, { maximumDepth: 5, maximumRecords: 256, ignoredKeys: ENTITY_IGNORE }), births: scalar(simulation.births, 0), deaths: scalar(simulation.deaths, 0),
    population: entities.filter(([, entity]) => entity.alive).length, relationships: clonePlain(simulation.relationships, { maximumDepth: 5, maximumArray: 128, maximumRecords: 1024, ignoredKeys: ENTITY_IGNORE }),
    groups: clonePlain(simulation.groups || simulation.groupRegistry, { maximumDepth: 5, maximumRecords: 1024, ignoredKeys: ENTITY_IGNORE }), lineageRecords: clonePlain(simulation.lineageRecords, { maximumDepth: 5, maximumRecords: 1024, ignoredKeys: ENTITY_IGNORE }),
    setup: clonePlain(simulation.worldSetup, { maximumDepth: 5, maximumRecords: 256, ignoredKeys: ENTITY_IGNORE })
  });
  const worldRevision = stableHash({ seed: simulation.seed, world, corpseCount: corpses.length, cellFingerprint });
  const snapshot = {
    schemaVersion: 1,
    simulationSeed: scalar(simulation.seed, 0),
    simulationTick: tick,
    ecologicalMinute: scalar(simulation.ecologicalMinute, tick),
    capturedAtMonotonicMs: capturedAtMonotonicMs ?? globalThis.performance?.now?.() ?? 0,
    snapshotId: `documentary-snapshot-${stableHash({ seed: simulation.seed, tick, ecologicalMinute: simulation.ecologicalMinute, entityFingerprint, corpseFingerprint, cellFingerprint, eventFingerprint, worldRevision }).slice(-16)}`,
    worldRevision,
    inputRevision: documentaryInputRevision(simulation),
    projectionFingerprints: deepFreeze({ entities: entityFingerprint, corpses: corpseFingerprint, cells: cellFingerprint, events: eventFingerprint }),
    entities: new ReadonlyMapView(entities),
    corpses: new ReadonlyMapView(corpses),
    cells: new ReadonlyMapView(cells),
    entityByIdentityId,
    corpseByIdentityId,
    eventById,
    weatherSystems: deepFreeze((simulation.weatherSystems || []).slice(0, 64).map(item => clonePlain(item, { maximumDepth: 4, maximumRecords: 128, ignoredKeys: ENTITY_IGNORE }))),
    verifiedEvents: deepFreeze([...eventsById.values()]),
    world
  };
  return Object.freeze(snapshot);
}

export function entityFromSnapshot(snapshot, id) {
  const key = String(id);
  return snapshot?.entities?.get(key) || snapshot?.entityByIdentityId?.get?.(key) || snapshot?.corpses?.get(key) || snapshot?.corpseByIdentityId?.get?.(key) || [...(snapshot?.corpses?.values?.() || [])].find(item => item.identityId === key) || null;
}

export function documentaryInputRevision(simulation = {}) {
  const revision = explicitRevision(simulation);
  return revision == null ? null : `${identifier(simulation.seed) || "seedless"}|${revision}`;
}

export function documentarySceneEventRevision(scenes = []) {
  return stableHash(scenes.map(scene => ({ id: scene?.id || null, kind: scene?.kind || scene?.sceneKind || null, eventId: scene?.eventId || null, eventType: scene?.eventType || scene?.ecologicalEventType || null, occurredAtTick: scene?.occurredAtTick ?? scene?.detectedTick ?? null, worldSubject: Boolean(scene?.worldSubject), subjectIds: sortedIds(scene?.semanticRoleIds || scene?.ids) })));
}

export { documentaryEntity, documentaryCorpse, documentaryCell, verifiedEvent };
