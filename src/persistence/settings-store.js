export function readJson(storage, key, fallback = null) { try { const value = storage?.getItem?.(key); return value == null ? fallback : JSON.parse(value); } catch { return fallback; } }
export function writeJson(storage, key, value, onError = null) { try { storage?.setItem?.(key, JSON.stringify(value)); return true; } catch (error) { onError?.(error); return false; } }
export function readJsonList(storage, key) { const value = readJson(storage, key, []); return Array.isArray(value) ? value : []; }
export function writeJsonList(storage, key, items, onError = null) { return writeJson(storage, key, Array.isArray(items) ? items : [], onError); }
