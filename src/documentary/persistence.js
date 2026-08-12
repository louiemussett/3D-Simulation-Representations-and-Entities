const DB_NAME = "living-laboratory-documentary";
const STORE_NAME = "outbox";

export class IndexedDbOutbox {
  constructor({ databaseName = DB_NAME, maximum = 10000 } = {}) { this.databaseName = databaseName; this.maximum = maximum; this.db = null; this.memory = new Map(); }
  async open() { if (typeof indexedDB === "undefined") return this; this.db = await new Promise((resolve, reject) => { const request = indexedDB.open(this.databaseName, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: "batchId" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); return this; }
  async put(batch) { if (!batch?.batchId) throw new TypeError("batchId required"); if (!this.db) { this.memory.set(batch.batchId, structuredClone(batch)); while (this.memory.size > this.maximum) this.memory.delete(this.memory.keys().next().value); return; } await this.transaction("readwrite", store => store.put(batch)); }
  async remove(batchId) { if (!this.db) return void this.memory.delete(batchId); await this.transaction("readwrite", store => store.delete(batchId)); }
  async list() { if (!this.db) return [...this.memory.values()]; return this.transaction("readonly", store => store.getAll()); }
  transaction(mode, action) { return new Promise((resolve, reject) => { const transaction = this.db.transaction(STORE_NAME, mode), request = action(transaction.objectStore(STORE_NAME)); transaction.oncomplete = () => resolve(request?.result); transaction.onerror = () => reject(transaction.error); }); }
}

export class CompanionClient {
  constructor({ url = "ws://127.0.0.1:8765/documentary", token = "", outbox = new IndexedDbOutbox(), reconnectMs = 2000, maximumBatch = 100, connectTimeoutMs = 8000 } = {}) { this.url = url; this.token = token; this.outbox = outbox; this.reconnectMs = reconnectMs; this.maximumBatch = maximumBatch; this.connectTimeoutMs = connectTimeoutMs; this.socket = null; this.connected = false; this.state = "DISCONNECTED"; this.queue = []; this.pending = new Map(); this.requests = new Map(); this.sequence = 0; this.listeners = new Set(); this.closed = false; this.connectPromise = null; }
  setState(state, detail = {}) { this.state = state; this.emit({ type: "connection-state", state, ...detail }); }
  async connect() {
    if (this.connected && this.socket?.readyState === WebSocket.OPEN) return true;
    if (this.connectPromise) return this.connectPromise;
    if (this.closed || !this.token || typeof WebSocket === "undefined") { this.setState("FAILED", { error: this.token ? "websocket-unavailable" : "token-required" }); return false; }
    this.setState("CONNECTING");
    this.connectPromise = (async () => {
      await this.outbox.open();
      return new Promise(resolve => {
        let settled = false;
        const separator = this.url.includes("?") ? "&" : "?", socket = new WebSocket(`${this.url}${separator}token=${encodeURIComponent(this.token)}`);
        this.socket = socket;
        const finish = value => { if (settled) return; settled = true; clearTimeout(timer); resolve(value); };
        const timer = setTimeout(() => { if (socket.readyState !== WebSocket.OPEN) socket.close(); this.setState("FAILED", { error: "connection-timeout" }); finish(false); }, this.connectTimeoutMs);
        socket.addEventListener("open", async () => { this.connected = true; this.setState("CONNECTED"); this.emit({ type: "connected" }); for (const batch of await this.outbox.list()) this.sendRaw(batch); this.flush(); finish(true); });
        socket.addEventListener("message", event => this.receive(event.data));
        socket.addEventListener("close", () => { const wasConnected = this.connected; this.connected = false; if (this.socket === socket) this.socket = null; this.setState(this.closed ? "CLOSED" : "DISCONNECTED"); this.emit({ type: "disconnected" }); for (const [id, pending] of this.requests) { clearTimeout(pending.timer); pending.reject(new Error("companion-disconnected")); this.requests.delete(id); } if (wasConnected && !this.closed && !this.reconnectTimer) this.reconnectTimer = setTimeout(() => { this.reconnectTimer = 0; if (!this.closed) this.connect(); }, this.reconnectMs); finish(false); });
        socket.addEventListener("error", () => { this.setState("FAILED", { error: "connection-error" }); finish(false); });
      });
    })().finally(() => { this.connectPromise = null; });
    return this.connectPromise;
  }
  on(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(event) { for (const listener of this.listeners) listener(event); }
  enqueue(record) { this.queue.push(record); if (this.queue.length >= this.maximumBatch) this.flush(); }
  async flush() { if (!this.queue.length) return null; const records = this.queue.splice(0, this.maximumBatch), batchId = `batch-${Date.now()}-${++this.sequence}`, message = { schemaVersion: 1, type: "EVENT_BATCH", requestId: batchId, batchId, sessionId: records[0]?.sessionId, records }; await this.outbox.put(message); this.pending.set(batchId, message); this.sendRaw(message); return batchId; }
  request(type, payload = {}) { const requestId = `req-${Date.now()}-${++this.sequence}`, message = { schemaVersion: 1, type, requestId, ...payload }; this.sendRaw(message); return requestId; }
  requestAndWait(type, payload = {}, { responseType, timeoutMs = 15000 } = {}) { const requestId = `req-${Date.now()}-${++this.sequence}`, message = { schemaVersion: 1, type, requestId, ...payload }; if (!this.sendRaw(message)) return Promise.reject(new Error("companion-not-connected")); return new Promise((resolve, reject) => { const timer = setTimeout(() => { this.requests.delete(requestId); reject(new Error(`${type.toLowerCase()}-timeout`)); }, timeoutMs); this.requests.set(requestId, { resolve, reject, timer, responseType }); }); }
  sendRaw(message) { if (!this.connected || this.socket?.readyState !== WebSocket.OPEN) return false; this.socket.send(JSON.stringify(message)); return true; }
  async receive(raw) { let message; try { message = JSON.parse(raw); } catch { return; } if (message.type === "ACK" && message.batchId) { this.pending.delete(message.batchId); await this.outbox.remove(message.batchId); } const pending = this.requests.get(message.requestId); if (pending && (!pending.responseType || pending.responseType === message.type || message.type === "ERROR")) { clearTimeout(pending.timer); this.requests.delete(message.requestId); if (message.type === "ERROR") pending.reject(new Error(message.error || "companion-error")); else pending.resolve(message); } this.emit(message); }
  bestEffort(message) { try { return this.sendRaw(message); } catch { return false; } }
  close() { this.closed = true; this.connected = false; this.setState("CLOSED"); clearTimeout(this.reconnectTimer); this.reconnectTimer = 0; this.socket?.close(); this.socket = null; }
}
