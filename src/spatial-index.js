export class MultiEntitySpatialIndex {
  constructor({ cellSize = 12, offset = 0 } = {}) {
    this.cellSize = cellSize;
    this.offset = offset;
    this.animals = new Map();
    this.corpses = new Map();
    this.byAnimalId = new Map();
    this.byCorpseId = new Map();
    this.corpseOrder = new Map();
    this.nextCorpseOrder = 0;
    this.animalQueryBuffer = [];
    this.corpseQueryBuffer = [];
  }

  bucketKey(item) {
    return `${Math.floor((item.x + this.offset) / this.cellSize)},${Math.floor((item.z + this.offset) / this.cellSize)}`;
  }

  insert(map, item) {
    const key = this.bucketKey(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }

  rebuildAnimals(items) {
    this.animals.clear(); this.byAnimalId.clear();
    for (const item of items) if (item.alive) { this.insert(this.animals, item); this.byAnimalId.set(item.id, item); }
  }

  rebuildCorpses(items) {
    this.corpses.clear(); this.byCorpseId.clear();
    const retained = new Map();
    for (const item of items) {
      const order = this.corpseOrder.get(item.id) ?? this.nextCorpseOrder++;
      retained.set(item.id, order); this.insert(this.corpses, item); this.byCorpseId.set(item.id, item);
    }
    this.corpseOrder = retained;
  }

  insertCorpse(item) {
    if (this.byCorpseId.has(item.id)) return;
    this.corpseOrder.set(item.id, this.nextCorpseOrder++);
    this.insert(this.corpses, item); this.byCorpseId.set(item.id, item);
  }

  removeCorpse(id) {
    const item = this.byCorpseId.get(id);
    if (!item) return false;
    const bucket = this.corpses.get(this.bucketKey(item));
    if (bucket) { const at = bucket.findIndex((entry) => entry.id === id); if (at >= 0) bucket.splice(at, 1); if (!bucket.length) this.corpses.delete(this.bucketKey(item)); }
    this.byCorpseId.delete(id); this.corpseOrder.delete(id); return true;
  }

  query(map, point, range, target = []) {
    target.length = 0;
    const radius = Math.ceil(range / this.cellSize);
    const gx = Math.floor((point.x + this.offset) / this.cellSize), gz = Math.floor((point.z + this.offset) / this.cellSize);
    for (let z = gz - radius; z <= gz + radius; z++) for (let x = gx - radius; x <= gx + radius; x++) {
      const bucket = map.get(`${x},${z}`); if (bucket) target.push(...bucket);
    }
    return target;
  }

  queryAnimals(point, range, target = this.animalQueryBuffer) { return this.query(this.animals, point, range, target); }
  queryCorpses(point, range, target = this.corpseQueryBuffer) {
    const result = this.query(this.corpses, point, range, target);
    result.sort((a, b) => this.corpseOrder.get(a.id) - this.corpseOrder.get(b.id));
    return result;
  }
}
