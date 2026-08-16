export function createWorldQueries({ getWorld, animalById, corpseById, nearbyAnimals, nearbyCorpses, cellAt, weatherAt, surfaceHeight } = {}) {
  for (const [name, callback] of Object.entries({ getWorld, animalById, corpseById, nearbyAnimals, nearbyCorpses, cellAt, weatherAt, surfaceHeight })) if (typeof callback !== "function") throw new TypeError(`World queries require ${name}()`);
  return Object.freeze({
    world: () => getWorld(), animalById: id => animalById(id), corpseById: id => corpseById(id), nearbyAnimals: (subject, range) => nearbyAnimals(subject, range), nearbyCorpses: (subject, range) => nearbyCorpses(subject, range),
    cellAt: (x, z) => cellAt(x, z), weatherAt: position => weatherAt(position), surfaceHeight: (x, z) => surfaceHeight(x, z)
  });
}
