const unique = (values) => [...new Set(values.filter(Boolean))];

export function migrateKinship(animal = {}) {
  animal.parentIds = unique(animal.parentIds || [animal.motherId, animal.fatherId]);
  animal.ancestorDepths = { ...(animal.ancestorDepths || {}) };
  for (const id of animal.parentIds) if (!animal.ancestorDepths[id] || animal.ancestorDepths[id] > 1) animal.ancestorDepths[id] = 1;
  return animal;
}

export function registerBirthKinship(child, mother, father = null, maximumDepth = 8) {
  child.motherId = mother?.id || child.motherId || null;
  child.fatherId = father?.id || child.fatherId || null;
  child.parentIds = unique([child.motherId, child.fatherId]);
  child.ancestorDepths = {};
  for (const parent of [mother, father].filter(Boolean)) {
    migrateKinship(parent);
    child.ancestorDepths[parent.id] = 1;
    for (const [ancestorId, depth] of Object.entries(parent.ancestorDepths)) {
      const nextDepth = Number(depth) + 1;
      if (nextDepth <= maximumDepth) child.ancestorDepths[ancestorId] = Math.min(child.ancestorDepths[ancestorId] || maximumDepth, nextDepth);
    }
  }
  return migrateKinship(child);
}

export function lineageRecord(animal = {}) {
  migrateKinship(animal);
  return Object.freeze({ id: animal.id, speciesId: animal.speciesId, sex: animal.sex, parentIds: [...animal.parentIds], ancestorDepths: { ...animal.ancestorDepths }, birthTick: animal.birthTick ?? null, deathTick: animal.deathTick ?? null });
}

export function storeLineage(records = {}, animal = {}) {
  if (!animal.id) return records;
  records[animal.id] = lineageRecord(animal);
  return records;
}

export function generationLabel(depth = 0, direction = "ancestor") {
  if (depth <= 0) return "unrelated";
  const parent = direction === "ancestor" ? "parent" : "child";
  if (depth === 1) return parent;
  if (depth === 2) return direction === "ancestor" ? "grandparent" : "grandchild";
  return `${"great-".repeat(depth - 2)}${direction === "ancestor" ? "grandparent" : "grandchild"}`;
}

export function kinshipBetween(a = {}, b = {}) {
  migrateKinship(a); migrateKinship(b);
  const aToB = Number(a.ancestorDepths[b.id]) || 0, bToA = Number(b.ancestorDepths[a.id]) || 0;
  if (aToB) return Object.freeze({ related: true, kind: generationLabel(aToB, "ancestor"), depth: aToB, direct: true, ancestorId: b.id });
  if (bToA) return Object.freeze({ related: true, kind: generationLabel(bToA, "descendant"), depth: bToA, direct: true, ancestorId: a.id });
  let shared = null;
  for (const [id, leftDepth] of Object.entries(a.ancestorDepths)) {
    const rightDepth = Number(b.ancestorDepths[id]) || 0;
    if (!rightDepth) continue;
    const distance = Number(leftDepth) + rightDepth;
    if (!shared || distance < shared.distance) shared = { id, leftDepth: Number(leftDepth), rightDepth, distance };
  }
  if (!shared) return Object.freeze({ related: false, kind: "unrelated", depth: 0, direct: false, ancestorId: null });
  const kind = shared.leftDepth === 1 && shared.rightDepth === 1 ? "sibling" : shared.leftDepth <= 2 && shared.rightDepth <= 2 ? "close cousin" : "extended family";
  return Object.freeze({ related: true, kind, depth: shared.distance, direct: false, ancestorId: shared.id, ...shared });
}

export function closeKinForMating(a, b) {
  const relation = kinshipBetween(a, b);
  return relation.direct || (relation.related && relation.depth <= 4);
}

export function livingAncestorCandidates(animal, animals = [], { mature = (candidate) => ["adult", "old"].includes(candidate.lifeStage) } = {}) {
  migrateKinship(animal);
  return animals.filter((candidate) => candidate?.alive && candidate.id !== animal.id && candidate.speciesId === animal.speciesId && mature(candidate) && animal.ancestorDepths[candidate.id]).sort((left, right) => animal.ancestorDepths[left.id] - animal.ancestorDepths[right.id]);
}

export function descendantDepth(ancestor, descendant) {
  migrateKinship(descendant);
  return Number(descendant.ancestorDepths[ancestor?.id]) || 0;
}
