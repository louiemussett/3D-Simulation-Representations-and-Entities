export function traversableNeighbourCells(world, entity, occupied, occupancyKey) {
  const origin = world?.lookup(entity.x, entity.z);
  if (!origin) return [];
  return origin.neighbours.filter((cell) =>
    cell.waterDepth <= .45 && cell.plantType !== "tree" && !occupied?.has(occupancyKey(cell))
  );
}

export function continuingMotionTarget(world, entity, actionKey, occupied, occupancyKey) {
  const target = entity.motionTarget;
  if (!target || target.actionKey !== actionKey) return null;
  const cell = world?.lookup(target.x, target.z), claimant = cell ? occupied?.get(occupancyKey(cell)) : null;
  if (!cell || cell.waterDepth > .45 || cell.plantType === "tree" || (claimant && claimant !== entity.id)) return null;
  return { x: target.x, z: target.z, actionKey };
}
