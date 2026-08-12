const factoryCaches = new WeakMap();

const cacheFor = (factory) => {
  let cache = factoryCaches.get(factory);
  if (!cache) {
    cache = { connections: new Map(), opens: 0, hits: 0, failures: 0, closes: 0 };
    factoryCaches.set(factory, cache);
  }
  return cache;
};

const connectionKey = (name, version) => `${name}\u0000${version == null ? "default" : version}`;

/**
 * Opens one IndexedDB connection per factory/name/version and reuses its
 * promise across concurrent callers. Failed, closed and version-changed
 * connections are evicted so a later call can recover cleanly.
 */
export function openCachedIndexedDB(name, {
  version = undefined,
  upgrade = null,
  blocked = null,
  indexedDBFactory = globalThis.indexedDB
} = {}) {
  name = String(name || "").trim();
  if (!name) return Promise.reject(new TypeError("IndexedDB name must be non-empty"));
  if (!indexedDBFactory || typeof indexedDBFactory.open !== "function") return Promise.reject(new TypeError("IndexedDB is unavailable"));
  const normalizedVersion = version == null ? undefined : Math.max(1, Math.floor(Number(version)));
  if (version != null && !Number.isFinite(normalizedVersion)) return Promise.reject(new TypeError("IndexedDB version must be finite"));
  const cache = cacheFor(indexedDBFactory), key = connectionKey(name, normalizedVersion);
  const cached = cache.connections.get(key);
  if (cached) { cache.hits += 1; return cached.promise; }

  cache.opens += 1;
  const entry = { db: null, promise: null };
  entry.promise = new Promise((resolve, reject) => {
    let request;
    try { request = normalizedVersion == null ? indexedDBFactory.open(name) : indexedDBFactory.open(name, normalizedVersion); }
    catch (error) { cache.failures += 1; cache.connections.delete(key); reject(error); return; }
    request.onupgradeneeded = (event) => upgrade?.(request.result, event.oldVersion, event.newVersion, request.transaction, event);
    request.onblocked = (event) => blocked?.(event);
    request.onerror = () => {
      cache.failures += 1; cache.connections.delete(key);
      reject(request.error || new Error(`Failed to open IndexedDB ${name}`));
    };
    request.onsuccess = () => {
      const db = request.result; entry.db = db;
      const priorVersionChange = db.onversionchange;
      db.onversionchange = (event) => {
        cache.connections.delete(key); cache.closes += 1;
        try { priorVersionChange?.call(db, event); } finally { db.close(); }
      };
      resolve(db);
    };
  });
  cache.connections.set(key, entry);
  entry.promise.catch(() => { if (cache.connections.get(key) === entry) cache.connections.delete(key); });
  return entry.promise;
}

export async function closeCachedIndexedDB(name, { version = undefined, indexedDBFactory = globalThis.indexedDB } = {}) {
  const cache = indexedDBFactory && factoryCaches.get(indexedDBFactory);
  if (!cache) return false;
  const key = connectionKey(String(name || "").trim(), version == null ? undefined : Math.max(1, Math.floor(Number(version))));
  const entry = cache.connections.get(key);
  if (!entry) return false;
  cache.connections.delete(key);
  try { const db = entry.db || await entry.promise; db?.close?.(); } catch {}
  cache.closes += 1; return true;
}

export async function closeAllCachedIndexedDB(indexedDBFactory = globalThis.indexedDB) {
  const cache = indexedDBFactory && factoryCaches.get(indexedDBFactory);
  if (!cache) return 0;
  const entries = [...cache.connections.values()]; cache.connections.clear();
  await Promise.all(entries.map(async (entry) => { try { (entry.db || await entry.promise)?.close?.(); } catch {} }));
  cache.closes += entries.length; return entries.length;
}

export function indexedDBConnectionMetrics(indexedDBFactory = globalThis.indexedDB) {
  const cache = indexedDBFactory && factoryCaches.get(indexedDBFactory);
  return Object.freeze({
    openRequests: cache?.opens || 0,
    cacheHits: cache?.hits || 0,
    failures: cache?.failures || 0,
    closes: cache?.closes || 0,
    cachedConnections: cache?.connections.size || 0
  });
}
