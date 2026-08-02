export class PresentationSnapshotCache {
  constructor() { this.snapshots = new Map(); this.derivations = new Map(); this.derivationTick = null; }
  get(id) { return this.snapshots.get(id) || null; }
  build(animal, tick, accessMode, derive) {
    if (this.derivationTick !== tick) { this.derivationTick = tick; this.derivations.clear(); }
    const previous = this.snapshots.get(animal.id);
    if (previous?.tick === tick && previous.accessMode === accessMode) return previous;
    const snapshot = derive(animal, accessMode);
    snapshot.tick = tick; snapshot.accessMode = accessMode;
    this.snapshots.set(animal.id, snapshot);
    const key = `${tick}:${animal.id}`; this.derivations.set(key, (this.derivations.get(key) || 0) + 1);
    return snapshot;
  }
  count(tick, id) { return this.derivations.get(`${tick}:${id}`) || 0; }
  maximumCount() { let maximum = 0; for (const count of this.derivations.values()) maximum = Math.max(maximum, count); return maximum; }
  delete(id) { this.snapshots.delete(id); }
  clear() { this.snapshots.clear(); this.derivations.clear(); this.derivationTick = null; }
}
