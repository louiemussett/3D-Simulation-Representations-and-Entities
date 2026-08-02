const record = ({ sourceKind = "ENTITY_STATE", predicate, subjectIds = [], object, tick, sourcePath, epistemicClass = "AUTHORITATIVE", confidence = 1, causalEventIds = [] }) => ({ sourceKind, predicate, subjectIds, object, observedAtTick: tick, validFromTick: tick, validUntilTick: null, sourcePath, epistemicClass, confidence, causalEventIds });

export const identityEvidenceAdapter = {
  id: "identity",
  observe(snapshot) {
    const rows = [];
    for (const entity of snapshot.entities.values()) rows.push(record({ predicate: "entity.identity", subjectIds: [entity.identityId], object: { id: entity.id, identityId: entity.identityId, name: entity.name, speciesId: entity.speciesId, alive: entity.alive, sex: entity.sex, age: entity.age, lifeStage: entity.lifeStage, lineage: entity.lineage }, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.identity` }));
    for (const corpse of snapshot.corpses.values()) rows.push(record({ sourceKind: "REMAINS_STATE", predicate: "entity.remains.identity", subjectIds: [corpse.identityId], object: { remainsId: corpse.id, identityId: corpse.identityId, name: corpse.name, speciesId: corpse.speciesId, stage: corpse.stage, position: corpse.position, createdAtTick: corpse.createdAtTick, biomass: corpse.biomass, cause: corpse.cause }, tick: snapshot.simulationTick, sourcePath: `corpses.${corpse.id}` }));
    return rows;
  }
};

export const behaviourEvidenceAdapter = {
  id: "behaviour",
  observe(snapshot) {
    const rows = [];
    for (const entity of snapshot.entities.values()) {
      rows.push(record({ predicate: "entity.action.current", subjectIds: [entity.identityId], object: entity.action, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.actionState` }));
      rows.push(record({ predicate: "entity.plan.current", subjectIds: [entity.identityId], object: entity.plan, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.needDependencyPlan` }));
      rows.push(record({ predicate: "entity.movement.current", subjectIds: [entity.identityId], object: { position: entity.position, velocity: entity.velocity, destination: entity.destination, movement: entity.movement, orientation: entity.orientation }, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.locomotion` }));
    }
    return rows;
  }
};

export const physiologyEvidenceAdapter = {
  id: "physiology",
  observe: snapshot => [...snapshot.entities.values()].map(entity => record({ predicate: "entity.physiology.current", subjectIds: [entity.identityId], object: entity.physiology, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.physiology` }))
};

export const communicationEvidenceAdapter = {
  id: "communication",
  observe(snapshot) {
    const rows = [];
    for (const entity of snapshot.entities.values()) {
      rows.push(record({ predicate: "entity.expression.current", subjectIds: [entity.identityId], object: { expression: entity.expression, posture: entity.posture }, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.expression`, epistemicClass: "OBSERVED" }));
      rows.push(record({ predicate: "entity.communication.current", subjectIds: [entity.identityId], object: entity.calls, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.calls`, epistemicClass: "OBSERVED" }));
    }
    return rows;
  }
};

export const perceptionMemoryEvidenceAdapter = {
  id: "perception-memory",
  observe(snapshot) {
    const rows = [];
    for (const entity of snapshot.entities.values()) {
      rows.push(record({ sourceKind: "PERCEPTION_STATE", predicate: "entity.perception.current", subjectIds: [entity.identityId], object: entity.perception, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.sensoryBuffer`, epistemicClass: "OBSERVED" }));
      rows.push(record({ sourceKind: "MEMORY_RECORD", predicate: "entity.memory.current", subjectIds: [entity.identityId], object: entity.memories, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.memories`, epistemicClass: "REPORTED_MEMORY", confidence: .8 }));
    }
    return rows;
  }
};

export const socialReproductionEvidenceAdapter = {
  id: "social-reproduction",
  observe(snapshot) {
    const rows = [];
    for (const entity of snapshot.entities.values()) {
      rows.push(record({ sourceKind: "RELATIONSHIP_STATE", predicate: "entity.relationships.current", subjectIds: [entity.identityId], object: { relationships: entity.relationships, social: entity.social }, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.socialMemory` }));
      rows.push(record({ predicate: "entity.reproduction.current", subjectIds: [entity.identityId], object: entity.reproduction, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.reproduction` }));
      rows.push(record({ predicate: "entity.lineage.current", subjectIds: [entity.identityId], object: entity.lineage, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}.lineage` }));
    }
    return rows;
  }
};

export const archiveEvidenceAdapter = {
  id: "archive",
  observe(snapshot) {
    const rows = [];
    for (const entity of snapshot.entities.values()) rows.push(record({ sourceKind: "ARCHIVE_RECORD", predicate: "entity.archive.current", subjectIds: [entity.identityId], object: entity.archive, tick: snapshot.simulationTick, sourcePath: `animals.${entity.id}`, epistemicClass: "AUTHORITATIVE" }));
    for (const corpse of snapshot.corpses.values()) rows.push(record({ sourceKind: "ARCHIVE_RECORD", predicate: "entity.remains.archive", subjectIds: [corpse.identityId], object: corpse.archive, tick: snapshot.simulationTick, sourcePath: `corpses.${corpse.id}`, epistemicClass: "AUTHORITATIVE" }));
    return rows;
  }
};

export const environmentEvidenceAdapter = {
  id: "environment",
  observe(snapshot) {
    const rows = [record({ sourceKind: "ENVIRONMENT_STATE", predicate: "world.current", subjectIds: [], object: { ...snapshot.world, weatherSystems: snapshot.weatherSystems }, tick: snapshot.simulationTick, sourcePath: "world" })];
    for (const cell of snapshot.cells.values()) rows.push(record({ sourceKind: "ENVIRONMENT_STATE", predicate: "environment.cell.current", subjectIds: [`cell:${cell.id}`], object: { x: cell.x, z: cell.z, ...cell.archive }, tick: snapshot.simulationTick, sourcePath: `cells.${cell.id}`, epistemicClass: "AUTHORITATIVE" }));
    return rows;
  }
};

export const eventEvidenceAdapter = {
  id: "events",
  observe: snapshot => snapshot.verifiedEvents.map(event => record({ sourceKind: "VERIFIED_EVENT", predicate: `event.${event.eventType.toLowerCase()}`, subjectIds: event.subjectIds, object: event, tick: snapshot.simulationTick, sourcePath: `events.${event.eventId}`, causalEventIds: [event.eventId] }))
};

export function defaultEvidenceAdapters() {
  return [identityEvidenceAdapter, behaviourEvidenceAdapter, physiologyEvidenceAdapter, communicationEvidenceAdapter, perceptionMemoryEvidenceAdapter, socialReproductionEvidenceAdapter, archiveEvidenceAdapter, environmentEvidenceAdapter, eventEvidenceAdapter];
}

export { record as evidenceInput };
