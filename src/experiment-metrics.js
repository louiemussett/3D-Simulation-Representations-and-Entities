function average(values) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0; }
function distance(a, b) { return Math.hypot((a.x || 0) - (b.x || 0), (a.z || 0) - (b.z || 0)); }

export function summarizeExperiment(world, { boundaryDistance = 8 } = {}) {
  const living = (world.animals || []).filter((animal) => animal.alive), cells = world.cells || [], half = (world.worldSetup?.size || 0) / 2;
  const species = Object.fromEntries(["grazer", "hunter"].map((id) => {
    const animals = living.filter((animal) => animal.speciesId === id);
    return [id, { population: animals.length, meanAge: average(animals.map((a) => a.age || 0)), meanHealth: average(animals.map((a) => a.health || 0)), meanEnergy: average(animals.map((a) => a.energy || 0)), meanHydration: average(animals.map((a) => a.hydration || 0)), boundaryResidents: animals.filter((a) => half && (half - Math.max(Math.abs(a.x), Math.abs(a.z))) <= boundaryDistance).length }];
  }));
  const groups = new Map(); for (const animal of living) if (animal.groupId) { if (!groups.has(animal.groupId)) groups.set(animal.groupId, []); groups.get(animal.groupId).push(animal); }
  const groupRows = [...groups].map(([id, members]) => { const centre = { x: average(members.map((a) => a.x)), z: average(members.map((a) => a.z)) }; return { id, speciesId: members[0]?.speciesId, members: members.length, leaderId: members[0]?.groupLeaderId || null, goal: members[0]?.groupGoal || null, cohesion: average(members.map((member) => distance(member, centre))) }; });
  const causes = {}; for (const animal of world.animals || []) if (!animal.alive) { const cause = animal.timeline?.at(-1)?.split(": ").at(-1) || "unknown"; causes[cause] = (causes[cause] || 0) + 1; }
  return {
    seed: world.seed, tick: world.tick, day: world.day, births: world.births || 0, deaths: world.deaths || 0,
    species, extinction: { grazer: species.grazer.population === 0, hunter: species.hunter.population === 0 }, deathCauses: causes,
    stocks: { plantBiomass: cells.reduce((sum, cell) => sum + Math.max(0, Number(cell.biomass) || 0), 0), corpseBiomass: (world.corpses || []).reduce((sum, corpse) => sum + Math.max(0, Number(corpse.biomass) || 0), 0), corpses: (world.corpses || []).length },
    actions: living.reduce((counts, animal) => { const key = animal.actionState?.key || "unknown"; counts[key] = (counts[key] || 0) + 1; return counts; }, {}),
    groups: { count: groupRows.length, meanSize: average(groupRows.map((group) => group.members)), meanCohesion: average(groupRows.map((group) => group.cohesion)), details: groupRows }
  };
}

export function experimentRecord({ world, mapValidation, accounting, hash, rendered, applicationVersion = "working-tree", ablations = [] }) {
  return { format: "rss-ecology-experiment-v1", applicationVersion, createdAt: new Date().toISOString(), worldSchema: world.worldSchema, seed: world.seed, rngState: world.rngState, tick: world.tick, setup: { ...world.worldSetup }, authoritativeHash: hash, renderingEnabled: Boolean(rendered), ablations: [...ablations], mapValidation, ecology: summarizeExperiment(world), accounting };
}
