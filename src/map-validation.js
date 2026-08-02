function finite(value) { return Number.isFinite(value); }
function cellId(cell) { return String(cell?.id); }

export function connectedComponents(cells, passable = (cell) => !cell.water || (cell.waterDepth || 0) <= .22) {
  const allowed = new Set(cells.filter(passable).map(cellId)), visited = new Set(), components = [];
  for (const start of cells) {
    if (!allowed.has(cellId(start)) || visited.has(cellId(start))) continue;
    const ids = [], queue = [start]; visited.add(cellId(start));
    for (let at = 0; at < queue.length; at++) {
      const cell = queue[at]; ids.push(cellId(cell));
      for (const neighbour of cell.neighbours || []) if (allowed.has(cellId(neighbour)) && !visited.has(cellId(neighbour))) { visited.add(cellId(neighbour)); queue.push(neighbour); }
    }
    components.push(ids);
  }
  return components.sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

export function nearestResourceDistance(start, accepts, passable = (cell) => !cell.water || (cell.waterDepth || 0) <= .22, maximum = 80) {
  if (!start || !passable(start)) return null;
  const seen = new Set([cellId(start)]), queue = [{ cell: start, distance: 0 }];
  for (let at = 0; at < queue.length; at++) {
    const current = queue[at]; if (accepts(current.cell)) return current.distance;
    if (current.distance >= maximum) continue;
    for (const neighbour of current.cell.neighbours || []) if (passable(neighbour) && !seen.has(cellId(neighbour))) { seen.add(cellId(neighbour)); queue.push({ cell: neighbour, distance: current.distance + 1 }); }
  }
  return null;
}

export function validateMap(world, { resourceBudget = 40 } = {}) {
  const cells = world.cells || [], ids = new Set(), errors = [], warnings = [];
  for (const cell of cells) {
    const id = cellId(cell); if (ids.has(id)) errors.push(`duplicate cell ${id}`); ids.add(id);
    for (const field of ["x", "z", "elevation", "slope", "moisture", "temperature", "biomass"]) if (!finite(cell[field])) errors.push(`${id} has invalid ${field}`);
    for (const neighbour of cell.neighbours || []) if (!(neighbour.neighbours || []).some((item) => cellId(item) === id)) errors.push(`${id} -> ${cellId(neighbour)} is not reciprocal`);
    if (cell.flowTo && !cell.flowTo.cells && cell.flowTo.id != null && finite(cell.flowTo.elevation) && cell.flowTo.elevation > cell.elevation + 1e-6) warnings.push(`${id} drains uphill to ${cellId(cell.flowTo)}`);
  }
  const components = connectedComponents(cells), byId = new Map(cells.map((cell) => [cellId(cell), cell]));
  const spawnChecks = (world.animals || []).filter((animal) => animal.alive).map((animal) => {
    const start = world.hexWorld?.lookup?.(animal.x, animal.z) || cells.reduce((best, cell) => !best || (cell.x-animal.x)**2+(cell.z-animal.z)**2 < (best.x-animal.x)**2+(best.z-animal.z)**2 ? cell : best, null);
    const food = animal.speciesId === "grazer" ? nearestResourceDistance(start, (cell) => !cell.water && cell.biomass > .02, undefined, resourceBudget) : null;
    const water = nearestResourceDistance(start, (cell) => Boolean(cell.drinkable || cell.water), undefined, resourceBudget);
    if (animal.speciesId === "grazer" && food == null) warnings.push(`${animal.id} has no reachable food within ${resourceBudget} cells`);
    if (water == null) warnings.push(`${animal.id} has no reachable water within ${resourceBudget} cells`);
    return { animalId: animal.id, speciesId: animal.speciesId, startCellId: start ? cellId(start) : null, foodDistance: food, waterDistance: water };
  });
  const componentByCell = new Map(); components.forEach((component, index) => component.forEach((id) => componentByCell.set(id, index)));
  const sexesByRegion = {};
  for (const check of spawnChecks) { const region = componentByCell.get(check.startCellId); if (region == null) continue; const key = `${region}:${check.speciesId}`; sexesByRegion[key] ||= new Set(); const animal = (world.animals || []).find((item) => item.id === check.animalId); sexesByRegion[key].add(animal?.sex); }
  for (const [key, sexes] of Object.entries(sexesByRegion)) if (sexes.size === 1) warnings.push(`${key} starts with one sex only`);
  return {
    valid: errors.length === 0, errors, warnings: [...new Set(warnings)],
    metrics: { cells: cells.length, traversableComponents: components.length, largestTraversableComponent: components[0]?.length || 0, isolatedTraversableCells: components.filter((part) => part.length === 1).length, waterCells: cells.filter((cell) => cell.water).length, totalPlantBiomass: cells.reduce((sum, cell) => sum + (finite(cell.biomass) ? Math.max(0, cell.biomass) : 0), 0) },
    spawnChecks
  };
}
