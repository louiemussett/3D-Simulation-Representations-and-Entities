export const DEFAULT_LANDSCAPE_CHUNK_SIZE = 24;

export function chunkKeyAt(x, z, half, chunkSize = DEFAULT_LANDSCAPE_CHUNK_SIZE) {
  return `${Math.floor((x + half) / chunkSize)},${Math.floor((z + half) / chunkSize)}`;
}

export class LandscapeDirtyState {
  constructor() { this.keys = new Set(); this.terrain = new Set(); this.water = new Set(); this.vegetation = new Set(); this.versions = { terrain: 0, water: 0, vegetation: 0 }; }
  register(key) { this.keys.add(key); return key; }
  mark(kind, key) { this.register(key); this[kind].add(key); this.versions[kind] += 1; }
  markAll(kind) { for (const key of this.keys) this[kind].add(key); this.versions[kind] += 1; }
  take(kind) { const keys = [...this[kind]]; this[kind].clear(); return keys; }
  clear() { this.keys.clear(); for (const kind of ["terrain", "water", "vegetation"]) this[kind].clear(); }
}

export class ReusablePositionBuffer {
  constructor(maxVertices) { this.array = new Float32Array(Math.max(0, maxVertices) * 3); this.vertices = 0; }
  reset() { this.vertices = 0; }
  push(x, y, z) { if ((this.vertices + 1) * 3 > this.array.length) return false; const offset = this.vertices++ * 3; this.array[offset] = x; this.array[offset + 1] = y; this.array[offset + 2] = z; return true; }
}
