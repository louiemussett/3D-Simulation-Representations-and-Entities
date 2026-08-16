export const ARCHITECTURE_LAYERS = Object.freeze({
  architecture: 0, contracts: 0, simulation: 1, world: 1, environment: 1, organisms: 2, perception: 2, cognition: 3, behaviour: 3, movement: 4, persistence: 5, presentation: 6, camera: 6, laboratory: 7, ui: 7, bootstrap: 8, application: 9
});

export const FORBIDDEN_DEPENDENCY_EDGES = Object.freeze([
  Object.freeze(["perception", "presentation"]), Object.freeze(["perception", "ui"]), Object.freeze(["perception", "laboratory"]),
  Object.freeze(["behaviour", "presentation"]), Object.freeze(["behaviour", "ui"]), Object.freeze(["behaviour", "laboratory"]),
  Object.freeze(["movement", "presentation"]), Object.freeze(["movement", "ui"]),
  Object.freeze(["environment", "presentation"]), Object.freeze(["environment", "ui"]),
  Object.freeze(["persistence", "presentation"]), Object.freeze(["persistence", "ui"])
]);

const normalized = value => String(value || "").replaceAll("\\", "/");
export function moduleLayer(path) {
  const value = normalized(path), match = value.match(/(?:^|\/)src\/([^/]+)\//);
  if (match && Object.hasOwn(ARCHITECTURE_LAYERS, match[1])) return match[1];
  if (/\/src\/app\.js$|^src\/app\.js$/.test(value)) return "application";
  return "legacy";
}
export function dependencyAllowed(fromPath, toPath) {
  const from = moduleLayer(fromPath), to = moduleLayer(toPath);
  if (from === "legacy" || to === "legacy") return true;
  return !FORBIDDEN_DEPENDENCY_EDGES.some(([source, target]) => source === from && target === to);
}
export function validateDependencyEdges(edges = []) {
  return Object.freeze(edges.filter(edge => !dependencyAllowed(edge.from, edge.to)).map(edge => Object.freeze({ ...edge, fromLayer: moduleLayer(edge.from), toLayer: moduleLayer(edge.to) })));
}
