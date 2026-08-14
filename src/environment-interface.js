/**
 * Read-only world queries consumed by perception systems.
 *
 * Keeping this adapter deliberately small prevents sensing code from gaining
 * direct ownership of terrain, weather, or render state during later phases.
 */
export function createEnvironmentInterface({ cellAt, surfaceHeight, weatherAt, coverOpacity }) {
  for (const [name, query] of Object.entries({ cellAt, surfaceHeight, weatherAt, coverOpacity })) {
    if (typeof query !== "function") throw new TypeError(`Environment interface requires ${name}()`);
  }
  return Object.freeze({
    cellAt: (x, z) => cellAt(x, z),
    surfaceHeight: (x, z) => surfaceHeight(x, z),
    weatherAt: position => weatherAt(position),
    coverOpacity: (x, z) => coverOpacity(x, z)
  });
}

