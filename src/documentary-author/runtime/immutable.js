export function canonicalize(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value instanceof Map) return Object.fromEntries([...value.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))).map(([key, item]) => [key, canonicalize(item)]));
  if (value instanceof Set) return [...value].map(canonicalize).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  if (typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

export function stableHash(value) {
  let result = 2166136261;
  for (const character of canonicalJson(value)) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return `fnv1a-${(result >>> 0).toString(16).padStart(8, "0")}`;
}

export function deepFreeze(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) for (const item of value) deepFreeze(item, seen);
  else for (const item of Object.values(value)) deepFreeze(item, seen);
  return Object.freeze(value);
}

export function clonePlain(value, options = {}, state = null) {
  const configuration = {
    maximumDepth: 8,
    maximumArray: 128,
    maximumKeys: 256,
    ignoredKeys: /^(mesh|model|sprite|material|geometry|texture|parent|children|scene|userData|matrix|matrixWorld|quaternion)$/i,
    ...options
  };
  const traversal = state || { seen: new WeakSet(), records: 0, maximumRecords: configuration.maximumRecords || 4096 };
  if (value == null) return value;
  if (["string", "boolean"].includes(typeof value)) return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "object" || traversal.records >= traversal.maximumRecords) return undefined;
  if (traversal.seen.has(value)) return undefined;
  const depth = Number(options.depth || 0);
  if (depth > configuration.maximumDepth) return undefined;
  const constructorName = value.constructor?.name || "Object";
  if (/^(Mesh|Group|Scene|Object3D|Vector\d?|Euler|Quaternion|Matrix\d?|Color|.*Geometry|.*Material|Texture)$/.test(constructorName)) return undefined;
  traversal.seen.add(value);
  traversal.records += 1;
  if (Array.isArray(value)) {
    return deepFreeze(value.slice(0, configuration.maximumArray).map(item => clonePlain(item, { ...configuration, depth: depth + 1 }, traversal)).filter(item => item !== undefined));
  }
  const result = {};
  for (const key of Object.keys(value).sort().slice(0, configuration.maximumKeys)) {
    if (configuration.ignoredKeys.test(key)) continue;
    const cloned = clonePlain(value[key], { ...configuration, depth: depth + 1 }, traversal);
    if (cloned !== undefined) result[key] = cloned;
  }
  return deepFreeze(result);
}

export class ReadonlyMapView {
  #map;
  constructor(entries = []) { this.#map = new Map(entries); Object.freeze(this); }
  get size() { return this.#map.size; }
  get(key) { return this.#map.get(key); }
  has(key) { return this.#map.has(key); }
  entries() { return this.#map.entries(); }
  keys() { return this.#map.keys(); }
  values() { return this.#map.values(); }
  forEach(callback, thisArg = undefined) { return this.#map.forEach((value, key) => callback.call(thisArg, value, key, this)); }
  [Symbol.iterator]() { return this.#map[Symbol.iterator](); }
  toJSON() { return Object.fromEntries(this.#map); }
}

export const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
