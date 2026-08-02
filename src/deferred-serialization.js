let nextSerializationRequestId = 1;

export function canonicalJsonStringify(value, { replacer = null, space = 0 } = {}) {
  return JSON.stringify(value, replacer, space);
}

const defaultDefer = (work) => {
  if (globalThis.scheduler?.postTask) return globalThis.scheduler.postTask(work, { priority: "background" });
  return new Promise((resolve, reject) => setTimeout(() => { try { resolve(work()); } catch (error) { reject(error); } }, 0));
};
const abortReason = (signal) => signal?.reason || (typeof DOMException === "function" ? new DOMException("Serialization aborted", "AbortError") : Object.assign(new Error("Serialization aborted"), { name: "AbortError" }));

/**
 * Moves canonical JSON conversion behind an event-loop yield. The conversion
 * itself is exactly JSON.stringify, so save ordering, toJSON behavior and
 * omission rules remain byte-for-byte compatible with the synchronous path.
 */
export function deferredJsonStringify(value, { replacer = null, space = 0, defer = defaultDefer, signal = null } = {}) {
  if (signal?.aborted) return Promise.reject(abortReason(signal));
  return Promise.resolve().then(() => defer(() => {
    if (signal?.aborted) throw abortReason(signal);
    return canonicalJsonStringify(value, { replacer, space });
  }));
}

export const JSON_SERIALIZATION_REQUEST = "SERIALIZE_JSON";
export const JSON_SERIALIZATION_RESULT = "SERIALIZED_JSON";

/** Pure request handler suitable for a browser Worker or Node worker adapter. */
export function handleJsonSerializationRequest(message) {
  if (message?.type !== JSON_SERIALIZATION_REQUEST) return null;
  const requestId = String(message.requestId || "");
  try {
    return { type: JSON_SERIALIZATION_RESULT, requestId, ok: true, json: canonicalJsonStringify(message.value, { space: message.space ?? 0 }) };
  } catch (error) {
    return { type: JSON_SERIALIZATION_RESULT, requestId, ok: false, error: { name: error?.name || "Error", message: error?.message || String(error) } };
  }
}

/** Installs the pure handler on a Worker-like scope and returns an uninstaller. */
export function attachJsonSerializationWorker(scope = globalThis) {
  if (!scope || typeof scope.addEventListener !== "function" || typeof scope.postMessage !== "function") throw new TypeError("A Worker-like message scope is required");
  const listener = (event) => { const result = handleJsonSerializationRequest(event.data); if (result) scope.postMessage(result); };
  scope.addEventListener("message", listener);
  return () => scope.removeEventListener?.("message", listener);
}

/**
 * Small client for a supplied Worker instance. No Worker is created implicitly,
 * keeping CSP, URL ownership and lifecycle under the application's control.
 */
export class WorkerJsonSerializer {
  constructor(worker) {
    if (!worker || typeof worker.postMessage !== "function" || typeof worker.addEventListener !== "function") throw new TypeError("WorkerJsonSerializer requires a Worker-like object");
    this.worker = worker; this.pending = new Map();
    this.onMessage = (event) => {
      const message = event.data;
      if (message?.type !== JSON_SERIALIZATION_RESULT) return;
      const pending = this.pending.get(String(message.requestId));
      if (!pending) return;
      this.pending.delete(String(message.requestId));
      if (message.ok) pending.resolve(message.json); else pending.reject(Object.assign(new Error(message.error?.message || "Worker serialization failed"), { name: message.error?.name || "Error" }));
    };
    worker.addEventListener("message", this.onMessage);
  }
  stringify(value, { space = 0 } = {}) {
    const requestId = `json-${nextSerializationRequestId++}`;
    const promise = new Promise((resolve, reject) => this.pending.set(requestId, { resolve, reject }));
    this.worker.postMessage({ type: JSON_SERIALIZATION_REQUEST, requestId, value, space });
    return promise;
  }
  dispose(reason = new Error("Worker JSON serializer disposed")) {
    this.worker.removeEventListener?.("message", this.onMessage);
    for (const pending of this.pending.values()) pending.reject(reason);
    this.pending.clear();
  }
}
