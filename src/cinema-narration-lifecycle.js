export class CinemaNarrationLifecycle {
  constructor({ setTimeoutFn = globalThis.setTimeout, clearTimeoutFn = globalThis.clearTimeout } = {}) {
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.generation = 0;
    this.requests = new Map();
    this.timeouts = new Set();
  }

  begin() {
    this.invalidate();
    return this.generation;
  }

  invalidate() {
    this.generation += 1;
    this.requests.clear();
    for (const timeout of this.timeouts) this.clearTimeoutFn(timeout);
    this.timeouts.clear();
    return this.generation;
  }

  current(generation) {
    return generation === this.generation;
  }

  registerRequest(requestId) {
    if (!requestId) return false;
    this.requests.set(requestId, this.generation);
    return true;
  }

  consumeRequest(requestId) {
    const generation = this.requests.get(requestId);
    this.requests.delete(requestId);
    return generation;
  }

  schedule(callback, delayMs, generation = this.generation) {
    const timeout = this.setTimeoutFn(() => {
      this.timeouts.delete(timeout);
      if (this.current(generation)) callback();
    }, Math.max(0, Number(delayMs) || 0));
    this.timeouts.add(timeout);
    return timeout;
  }

  snapshot() {
    return { generation: this.generation, pendingRequests: this.requests.size, pendingTimeouts: this.timeouts.size };
  }
}
