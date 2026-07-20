export function corpseVisualStage(corpse) {
  if (!corpse || corpse.removed) return "removed";
  if (corpse.eaten || corpse.biomass <= 0) return "skeleton";
  const remaining = corpse.biomass / Math.max(1, corpse.initialBiomass);
  return corpse.age < 24 && remaining > 0.7 ? "fresh" : "decaying";
}

export class CorpseRenderCache {
  constructor(dispose = () => {}) { this.entries = new Map(); this.dispose = dispose; }
  hideAll() { for (const entry of this.entries.values()) entry.visual.visible = false; }
  update(corpse, create, update) {
    const stage = corpseVisualStage(corpse); let entry = this.entries.get(corpse.id);
    if (!entry || entry.stage !== stage) {
      if (entry) this.dispose(entry.visual);
      entry = { stage, visual: create(corpse, stage) }; this.entries.set(corpse.id, entry);
    }
    update(entry.visual, corpse, stage); return entry.visual;
  }
  remove(id) { const entry = this.entries.get(id); if (!entry) return false; this.dispose(entry.visual); this.entries.delete(id); return true; }
  retain(ids) { for (const id of this.entries.keys()) if (!ids.has(id)) this.remove(id); }
  clear() { for (const id of [...this.entries.keys()]) this.remove(id); }
}
