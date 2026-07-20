export function assignDecisionOrder(animals, nextOrder = 0) {
  let next = Math.max(0, Math.floor(nextOrder || 0));
  for (const animal of animals) if (Number.isInteger(animal.decisionOrder)) next = Math.max(next, animal.decisionOrder + 1);
  for (const animal of animals) if (!Number.isInteger(animal.decisionOrder)) animal.decisionOrder = next++;
  return next;
}

export function orderedLivingAnimals(animals) {
  return animals.filter((animal) => animal.alive).sort((a, b) => a.decisionOrder - b.decisionOrder || String(a.id).localeCompare(String(b.id)));
}

export function rebuildOccupancy(animals, keyFor) {
  return new Map(animals.filter((animal) => animal.alive).map((animal) => [keyFor(animal), animal.id]));
}

export function runStableAnimalPhases({
  animals,
  preSense,
  prepareOutwardSignals,
  buildSnapshot,
  sense,
  interpretSignals,
  act,
  postAction,
  afterActions
}) {
  const ordered = orderedLivingAnimals(animals);
  for (const animal of ordered) if (animal.alive) preSense(animal);
  for (const animal of ordered) if (animal.alive) prepareOutwardSignals(animal);
  buildSnapshot(ordered);
  for (const animal of ordered) if (animal.alive) sense(animal);
  interpretSignals(ordered);
  for (const animal of ordered) if (animal.alive) act(animal);
  for (const animal of ordered) if (animal.alive) postAction(animal);
  afterActions(ordered);
  return ordered;
}
