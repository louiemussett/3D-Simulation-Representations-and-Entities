export function animalStructureKey(animal) { return `${animal.speciesId}|${animal.lifeStage}`; }

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

export const BADGED_ACTIONS = Object.freeze(new Set(["blocked", "listen"]));
