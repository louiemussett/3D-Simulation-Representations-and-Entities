const defaultLivingLists = new WeakMap();

export class StableLivingList {
  constructor(animals = null) {
    this.source = animals;
    this.items = [];
    this.sourceRefs = [];
    this.aliveFlags = [];
    this.decisionOrders = [];
    this.ids = [];
    this.dirty = true;
  }

  markDirty() { this.dirty = true; return this; }

  sourceChanged(animals) {
    if (this.source !== animals || this.sourceRefs.length !== animals.length) return true;
    for (let index = 0; index < animals.length; index += 1) {
      const animal = animals[index];
      if (this.sourceRefs[index] !== animal || this.aliveFlags[index] !== Boolean(animal.alive) || this.decisionOrders[index] !== animal.decisionOrder || this.ids[index] !== animal.id) return true;
    }
    return false;
  }

  rebuild(animals) {
    this.source = animals;
    this.items.length = 0;
    this.sourceRefs.length = animals.length; this.aliveFlags.length = animals.length; this.decisionOrders.length = animals.length; this.ids.length = animals.length;
    for (let index = 0; index < animals.length; index += 1) {
      const animal = animals[index];
      this.sourceRefs[index] = animal; this.aliveFlags[index] = Boolean(animal.alive); this.decisionOrders[index] = animal.decisionOrder; this.ids[index] = animal.id;
      if (animal.alive) this.items.push(animal);
    }
    this.items.sort((a, b) => a.decisionOrder - b.decisionOrder || String(a.id).localeCompare(String(b.id)));
    this.dirty = false;
    return this.items;
  }

  ordered(animals = this.source || [], { verify = true } = {}) {
    if (this.source !== animals || this.sourceRefs.length !== animals.length || (verify && this.sourceChanged(animals))) this.dirty = true;
    return this.dirty ? this.rebuild(animals) : this.items;
  }
}

export function markLivingAnimalsDirty(animals) {
  defaultLivingLists.get(animals)?.markDirty();
}

export function assignDecisionOrder(animals, nextOrder = 0) {
  let next = Math.max(0, Math.floor(nextOrder || 0)), changed = false;
  for (const animal of animals) if (Number.isInteger(animal.decisionOrder)) next = Math.max(next, animal.decisionOrder + 1);
  for (const animal of animals) if (!Number.isInteger(animal.decisionOrder)) { animal.decisionOrder = next++; changed = true; }
  if (changed) markLivingAnimalsDirty(animals);
  return next;
}

export function orderedLivingAnimals(animals, stableList = null) {
  let list = stableList;
  if (!list) {
    list = defaultLivingLists.get(animals);
    if (!list) { list = new StableLivingList(animals); defaultLivingLists.set(animals, list); }
  }
  return list.ordered(animals, { verify: !stableList });
}

export function rebuildOccupancy(animals, keyFor) {
  const occupancy = new Map();
  for (const animal of animals) if (animal.alive) occupancy.set(keyFor(animal), animal.id);
  return occupancy;
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
  afterActions,
  livingList = null
}) {
  const ordered = orderedLivingAnimals(animals, livingList);
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
