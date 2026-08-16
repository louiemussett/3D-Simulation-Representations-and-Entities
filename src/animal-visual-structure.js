export function animalStructureKey(animal) {
  const base = `${animal.speciesId}|${animal.lifeStage}`;
  if (animal.speciesId !== "valley-grazer-updated" || !animal.antlers) return base;
  const growthBucket = Math.max(0, Math.min(8, Math.round((Number(animal.antlers.growth) || 0) * 8)));
  return `${base}|antlers:${animal.antlers.stage || "cast"}:${growthBucket}:${animal.antlers.annual?.year || 0}`;
}

export class StructuralRootCache {
  constructor() { this.entries = new Map(); this.created = 0; }
  reconcile(animal, createRoot, updateTransient) {
    const key = animalStructureKey(animal), previous = this.entries.get(animal.id);
    let entry = previous;
    if (!entry || entry.key !== key) { entry = { key, root: createRoot(animal) }; this.entries.set(animal.id, entry); this.created += 1; }
    updateTransient(entry.root, animal); return entry.root;
  }
  remove(id) { const entry = this.entries.get(id); this.entries.delete(id); return entry?.root || null; }
}
