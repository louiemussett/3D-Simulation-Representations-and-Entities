export const DEFAULT_LANDSCAPE_CHUNK_SIZE = 24;
export const VEGETATION_BATCH_CHUNKS = 2;

export function chunkKeyAt(x, z, half, chunkSize = DEFAULT_LANDSCAPE_CHUNK_SIZE) {
  return `${Math.floor((x + half) / chunkSize)},${Math.floor((z + half) / chunkSize)}`;
}

export function chunkKeysInRange(point, range, half, chunkSize = DEFAULT_LANDSCAPE_CHUNK_SIZE) {
  const keys = [];
  const minX = Math.floor((point.x - range + half) / chunkSize), maxX = Math.floor((point.x + range + half) / chunkSize);
  const minZ = Math.floor((point.z - range + half) / chunkSize), maxZ = Math.floor((point.z + range + half) / chunkSize);
  for (let z = minZ; z <= maxZ; z += 1) for (let x = minX; x <= maxX; x += 1) keys.push(`${x},${z}`);
  return keys;
}

export function vegetationBatchKey(chunkKey, batchChunks = VEGETATION_BATCH_CHUNKS) { const [x, z] = String(chunkKey).split(",").map(Number), span = Math.max(1, Math.floor(batchChunks)); return `${Math.floor(x / span)},${Math.floor(z / span)}`; }
export function chunkKeysForVegetationBatches(chunkKeys, dirtyChunkKeys, batchChunks = VEGETATION_BATCH_CHUNKS) { const batches = new Set([...dirtyChunkKeys].map((key) => vegetationBatchKey(key, batchChunks))); return [...chunkKeys].filter((key) => batches.has(vegetationBatchKey(key, batchChunks))); }
export function vegetationLod(distance, cameraDistance, quality = 1) { const q = Math.max(.5, Math.min(1.5, Number(quality) || 1)), visibleRadius = Math.max(66, Math.min(210 * q, cameraDistance * .76 + 38)), fineRadius = Math.max(34, Math.min(86 * q, cameraDistance * .62)), mediumRadius = Math.max(fineRadius, Math.min(135 * q, cameraDistance * .92)); return { visible: distance <= visibleRadius, fine: distance <= fineRadius, medium: distance <= mediumRadius, visibleRadius, fineRadius, mediumRadius }; }

export class LandscapeDirtyState {
  constructor() { this.keys = new Set(); this.terrain = new Set(); this.water = new Set(); this.vegetation = new Set(); this.versions = { terrain: 0, water: 0, vegetation: 0 }; this.chunkVersions = { terrain: new Map(), water: new Map(), vegetation: new Map() }; }
  register(key) { this.keys.add(key); for (const kind of ["terrain", "water", "vegetation"]) if (!this.chunkVersions[kind].has(key)) this.chunkVersions[kind].set(key, 0); return key; }
  mark(kind, key) { this.register(key); this[kind].add(key); this.versions[kind] += 1; this.chunkVersions[kind].set(key, this.chunkVersions[kind].get(key) + 1); }
  markAll(kind) { this.versions[kind] += 1; for (const key of this.keys) { this[kind].add(key); this.chunkVersions[kind].set(key, this.chunkVersions[kind].get(key) + 1); } }
  localVersion(kind, keys) { return keys.map((key) => `${key}:${this.chunkVersions[kind].get(key) || 0}`).join(";"); }
  take(kind) { const keys = [...this[kind]]; this[kind].clear(); return keys; }
  clear() { this.keys.clear(); for (const kind of ["terrain", "water", "vegetation"]) { this[kind].clear(); this.chunkVersions[kind].clear(); } }
}

export class ReusablePositionBuffer {
  constructor(maxVertices) { this.array = new Float32Array(Math.max(0, maxVertices) * 3); this.vertices = 0; }
  reset() { this.vertices = 0; }
  push(x, y, z) { if ((this.vertices + 1) * 3 > this.array.length) return false; const offset = this.vertices++ * 3; this.array[offset] = x; this.array[offset + 1] = y; this.array[offset + 2] = z; return true; }
}

export function batchIndicesByMaterial(materialBatches) {
  const indices = [], groups = [];
  for (let materialIndex = 0; materialIndex < materialBatches.length; materialIndex += 1) {
    const batch = materialBatches[materialIndex];
    if (!batch?.length) continue;
    const start = indices.length;
    for (let index = 0; index < batch.length; index += 1) indices.push(batch[index]);
    groups.push({ start, count: batch.length, materialIndex });
  }
  return { indices, groups };
}
