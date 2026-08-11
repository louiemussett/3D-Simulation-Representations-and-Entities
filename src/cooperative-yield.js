let browserChannel = null;
let browserCallbacks = null;

// Continue in a fresh browser task without relying on zero-delay timers. Timer
// throttling can turn a cooperative world load into a minute-long pause when a
// tab is backgrounded or driven by a headless benchmark.
export function cooperativeYield() {
  if (typeof window !== "undefined" && globalThis.scheduler?.postTask) {
    return globalThis.scheduler.postTask(() => undefined, { priority: "background" });
  }
  if (typeof window !== "undefined" && typeof MessageChannel === "function") {
    if (!browserChannel) {
      browserCallbacks = [];
      browserChannel = new MessageChannel();
      browserChannel.port1.onmessage = () => browserCallbacks.shift()?.();
    }
    return new Promise(resolve => { browserCallbacks.push(resolve); browserChannel.port2.postMessage(0); });
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}
