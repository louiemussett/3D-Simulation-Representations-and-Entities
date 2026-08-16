export function detectRuntimeCapabilities(scope = globalThis) {
  const document = scope.document, canvas = document?.createElement?.("canvas");
  return Object.freeze({
    dom: Boolean(document?.querySelector), webgl2: Boolean(canvas?.getContext?.("webgl2")), webgl: Boolean(canvas?.getContext?.("webgl") || canvas?.getContext?.("experimental-webgl")),
    audioContext: Boolean(scope.AudioContext || scope.webkitAudioContext), indexedDb: Boolean(scope.indexedDB), workers: typeof scope.Worker === "function", resizeObserver: typeof scope.ResizeObserver === "function"
  });
}
