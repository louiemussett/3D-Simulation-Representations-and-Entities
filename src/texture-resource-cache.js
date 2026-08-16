const clampByteCount = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
};

const dimensionsBytes = (image, bytesPerPixel) => {
  if (!image || typeof image !== "object") return 0;
  if (Array.isArray(image)) return image.reduce((sum, entry) => sum + dimensionsBytes(entry, bytesPerPixel), 0);
  const directBytes = clampByteCount(image.byteLength ?? image.data?.byteLength, 0);
  if (directBytes) return directBytes;
  const width = clampByteCount(image.width ?? image.videoWidth ?? image.naturalWidth, 0);
  const height = clampByteCount(image.height ?? image.videoHeight ?? image.naturalHeight, 0);
  const depth = Math.max(1, clampByteCount(image.depth, 1));
  return width && height ? width * height * depth * bytesPerPixel : 0;
};

/**
 * Estimates GPU-side texture storage without importing a renderer. Explicit
 * `userData.estimatedBytes`/`byteSize` values win; typed pixel data is exact;
 * DOM images use a conservative RGBA estimate. Generated mipmaps add 1/3.
 */
export function estimateTextureBytes(texture, { bytesPerPixel = 4, includeMipmaps = true } = {}) {
  if (!texture || typeof texture !== "object") return 0;
  const explicit = clampByteCount(texture.userData?.estimatedBytes ?? texture.byteSize, 0);
  if (explicit) return explicit;
  const baseBytes = dimensionsBytes(texture.image ?? texture.source?.data ?? texture, Math.max(1, clampByteCount(bytesPerPixel, 4)));
  if (!baseBytes) return 0;
  const mipmapped = includeMipmaps && texture.generateMipmaps !== false;
  return Math.ceil(baseBytes * (mipmapped ? 4 / 3 : 1));
}

export function canvasPixelMetrics(canvas) {
  const width = clampByteCount(canvas?.width, 0), height = clampByteCount(canvas?.height, 0);
  const cssWidth = clampByteCount(canvas?.clientWidth, width), cssHeight = clampByteCount(canvas?.clientHeight, height);
  const pixels = width * height;
  return Object.freeze({
    width, height, cssWidth, cssHeight, pixels,
    estimatedBytes: pixels * 4,
    pixelRatioX: cssWidth ? width / cssWidth : 0,
    pixelRatioY: cssHeight ? height / cssHeight : 0
  });
}

/** Aggregates module-owned texture caches and backing canvases without retaining them. */
export function presentationResourceMetrics({ textureCaches = [], canvases = [] } = {}) {
  const uniqueCaches = [...new Set(textureCaches.filter(Boolean))], uniqueCanvases = [...new Set(canvases.filter(Boolean))];
  const cacheMetrics = uniqueCaches.map((cache) => typeof cache.metrics === "function" ? cache.metrics() : cache);
  const canvasMetrics = uniqueCanvases.map(canvasPixelMetrics);
  const sum = (values, key) => values.reduce((total, value) => total + clampByteCount(value?.[key], 0), 0);
  return Object.freeze({
    textureCaches: uniqueCaches.length,
    textureEntries: sum(cacheMetrics, "entries"),
    textureBytes: sum(cacheMetrics, "bytes"),
    textureBudgetBytes: sum(cacheMetrics, "budgetBytes"),
    canvases: uniqueCanvases.length,
    canvasPixels: sum(canvasMetrics, "pixels"),
    canvasEstimatedBytes: sum(canvasMetrics, "estimatedBytes"),
    estimatedPresentationBytes: sum(cacheMetrics, "bytes") + sum(canvasMetrics, "estimatedBytes")
  });
}

/** Dispose a texture/material bundle once, including its owned image bitmap. */
export function disposeTextureResource(resource) {
  const visited = new WeakSet();
  let disposed = 0;
  const visit = (value) => {
    if (!value || typeof value !== "object" || visited.has(value)) return;
    visited.add(value);
    if (Array.isArray(value)) { for (const entry of value) visit(entry); return; }
    if (value instanceof Map || value instanceof Set) { for (const entry of value.values()) visit(entry); return; }
    for (const key of ["map", "alphaMap", "normalMap", "roughnessMap", "metalnessMap", "emissiveMap", "texture"]) visit(value[key]);
    if (Array.isArray(value.textures)) visit(value.textures);
    if (typeof value.dispose === "function") { value.dispose(); disposed += 1; }
    const image = value.image ?? value.source?.data;
    if (image && typeof image.close === "function") { image.close(); disposed += 1; }
  };
  visit(resource);
  return disposed;
}

export const DEFAULT_TEXTURE_CACHE_BUDGET_BYTES = 32 * 1024 * 1024;

// Lease state is intentionally kept outside the public handle. A frozen handle
// can safely cross presentation boundaries while release remains idempotent and
// tied to the exact cache entry that was acquired, even if its key is replaced.
const leaseStates = new WeakMap();

/**
 * Least-recently-used resource cache bounded by bytes rather than entry count.
 * Every removal follows the same disposal path, preventing evicted textures
 * from remaining alive in GPU memory.
 */
export class ByteBudgetLRUCache {
  constructor({
    maxBytes = DEFAULT_TEXTURE_CACHE_BUDGET_BYTES,
    sizeOf = estimateTextureBytes,
    dispose = disposeTextureResource
  } = {}) {
    this.maxBytes = Math.max(1, clampByteCount(maxBytes, DEFAULT_TEXTURE_CACHE_BUDGET_BYTES));
    this.sizeOf = typeof sizeOf === "function" ? sizeOf : estimateTextureBytes;
    this.dispose = typeof dispose === "function" ? dispose : disposeTextureResource;
    this.entries = new Map();
    this.totalBytes = 0;
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
    this.disposals = 0;
    this.activeLeases = 0;
    this.pendingDisposals = new Set();
  }

  get size() { return this.entries.size; }
  has(key) { return this.entries.has(key); }
  keys() { return this.entries.keys(); }
  values() { return Array.from(this.entries.values(), (entry) => entry.value).values(); }
  *entriesIterator() { for (const [key, entry] of this.entries) yield [key, entry.value]; }
  entriesView() { return this.entriesIterator(); }
  [Symbol.iterator]() { return this.entriesIterator(); }
  peek(key) { return this.entries.get(key)?.value; }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) { this.misses += 1; return undefined; }
    this.hits += 1;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  /**
   * Retains one exact cache entry until the returned lease is released.
   *
   * `get()` remains an ordinary non-retaining lookup for backwards
   * compatibility. Callers that keep a resource beyond the current operation
   * should use `acquire()` and release the handle when their material/sprite no
   * longer references it.
   */
  acquire(key) {
    const entry = this.entries.get(key);
    if (!entry) { this.misses += 1; return null; }
    this.hits += 1;
    this.entries.delete(key);
    this.entries.set(key, entry);
    entry.leases += 1;
    this.activeLeases += 1;
    const state = { cache: this, entry, released: false };
    let lease;
    lease = Object.freeze({
      value: entry.value,
      get released() { return state.released; },
      release: () => this.release(lease)
    });
    leaseStates.set(lease, state);
    return lease;
  }

  /** Releases an acquire() handle. Releasing twice or into another cache is safe. */
  release(lease) {
    const state = lease && typeof lease === "object" ? leaseStates.get(lease) : null;
    if (!state || state.cache !== this || state.released) return false;
    state.released = true;
    const entry = state.entry;
    entry.leases = Math.max(0, entry.leases - 1);
    this.activeLeases = Math.max(0, this.activeLeases - 1);
    if (entry.detached && entry.leases === 0) {
      this.pendingDisposals.delete(entry);
      this.#disposeEntry(entry, entry.removalKey, entry.removalReason);
    }
    // Releasing the last lease may make an over-budget active entry eligible
    // for the eviction pass that previously had to skip it.
    this.#trim();
    return true;
  }

  set(key, value, rawBytes = null) {
    const bytes = rawBytes == null ? clampByteCount(this.sizeOf(value), 0) : clampByteCount(rawBytes, 0);
    const existing = this.entries.get(key);
    if (existing?.value === value) {
      this.entries.delete(key);
      this.totalBytes -= existing.bytes;
      if (bytes > this.maxBytes) {
        this.#detachEntry(existing, key, "oversize");
        return false;
      }
      existing.bytes = bytes;
      this.entries.set(key, existing);
      this.totalBytes += bytes;
      this.#trim();
      return this.entries.has(key);
    }
    if (existing) this.#detachEntry(existing, key, "replace");
    if (bytes > this.maxBytes) {
      this.#disposeEntry(this.#entry(value, bytes), key, "oversize");
      return false;
    }
    this.entries.set(key, this.#entry(value, bytes));
    this.totalBytes += bytes;
    this.#trim();
    return this.entries.has(key);
  }

  delete(key, reason = "delete") {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.#detachEntry(entry, key, reason);
    return true;
  }

  resize(maxBytes) {
    this.maxBytes = Math.max(1, clampByteCount(maxBytes, this.maxBytes));
    this.#trim();
    return this.maxBytes;
  }

  clear() {
    for (const key of [...this.entries.keys()]) this.delete(key, "clear");
  }

  metrics() {
    const requests = this.hits + this.misses;
    return Object.freeze({
      entries: this.entries.size,
      bytes: this.totalBytes,
      budgetBytes: this.maxBytes,
      utilization: this.totalBytes / this.maxBytes,
      hits: this.hits,
      misses: this.misses,
      hitRate: requests ? this.hits / requests : 0,
      evictions: this.evictions,
      disposals: this.disposals
    });
  }

  /** Lease-specific diagnostics without changing the established metrics shape. */
  leaseMetrics() {
    let leasedEntries = this.pendingDisposals.size, pendingBytes = 0;
    for (const entry of this.entries.values()) if (entry.leases > 0) leasedEntries += 1;
    for (const entry of this.pendingDisposals) pendingBytes += entry.bytes;
    return Object.freeze({
      activeLeases: this.activeLeases,
      leasedEntries,
      pendingDisposals: this.pendingDisposals.size,
      pendingBytes
    });
  }

  #entry(value, bytes) {
    return { value, bytes, leases: 0, detached: false, disposed: false, removalKey: null, removalReason: null };
  }

  #detachEntry(entry, key, reason) {
    if (this.entries.get(key) === entry) {
      this.entries.delete(key);
      this.totalBytes -= entry.bytes;
    }
    entry.detached = true;
    entry.removalKey = key;
    entry.removalReason = reason;
    if (entry.leases > 0) this.pendingDisposals.add(entry);
    else this.#disposeEntry(entry, key, reason);
  }

  #trim() {
    while (this.totalBytes > this.maxBytes && this.entries.size) {
      let candidate = null;
      for (const pair of this.entries) {
        if (pair[1].leases === 0) { candidate = pair; break; }
      }
      // A leased resource is allowed to keep the cache temporarily over budget;
      // release() resumes trimming when it becomes safe to dispose.
      if (!candidate) break;
      const [key, entry] = candidate;
      this.evictions += 1;
      this.#detachEntry(entry, key, "evict");
    }
  }

  #disposeEntry(entry, key, reason) {
    if (entry.disposed) return false;
    entry.disposed = true;
    this.pendingDisposals.delete(entry);
    this.disposals += 1;
    this.dispose(entry.value, key, reason);
    return true;
  }
}
