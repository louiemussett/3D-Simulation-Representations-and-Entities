export function snapshotAnimalForPersistence(animal) {
  const { visualMove, rss, predictiveCycle, acousticObservations, ...canonical } = animal;
  let decisionTrace = canonical.decisionTrace;
  if (decisionTrace) { decisionTrace = { ...decisionTrace }; delete decisionTrace.predictive; }
  return { ...canonical, decisionTrace };
}

export function createWorldSnapshot(world, { worldSchema, acousticSchema = 2, needPlanSchema, saveSlotName = null, savedAt = new Date().toISOString() } = {}) {
  if (!world || !Array.isArray(world.animals)) throw new TypeError("World snapshot requires an authoritative world with animals");
  const snapshot = { ...world, animals: world.animals.map(snapshotAnimalForPersistence), predictivePersistenceSchema: 1, acousticSchema, needPlanSchema, worldSchema, savedAt, saveSlotName: saveSlotName || null };
  for (const key of ["occupied", "entityIndex", "hexWorld", "cells", "soundEvents", "signalEmissions", "environmentSoundSources"]) delete snapshot[key];
  return snapshot;
}
