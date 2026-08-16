import test from "node:test";
import assert from "node:assert/strict";
import { StableMinHeap } from "../src/stable-min-heap.js";
import { HexWorld } from "../src/hex-world.js";
import { analyticHexPortal, buildNavMesh, buildNavMeshAsync } from "../src/navmesh.js";
import { findNavPath } from "../src/navmesh-pathfinding.js";
import { indexedFanSurfaceHeight } from "../src/terrain-surface.js";

const settings = {
  size: 48, hexDetail: 500, startSeason: "Spring", windDirection: "west", windStrength: 1,
  stormIntensity: 1, rainShadow: 1, sedimentTransport: 1, relief: .15, mountains: 1,
  hills: 1, valleys: 1, ridges: .55, plateaus: .35, roughness: .3, rivers: 1.25,
  riverWidthVariation: 1, riverPatternDiversity: 1, lakes: 1.25, woodland: 1,
  trees: 1, bushes: 1, longGrass: 1, rainfall: 1.2, northTemperature: 8,
  southTemperature: 24, coldestTemperature: -12, hottestTemperature: 36,
  temperatureVariation: 1, climate: 1
};

const worldProjection = world => world.cells.map(cell => [
  cell.id, cell.elevation, cell.humidity, cell.temperature, cell.water, cell.waterDepth,
  cell.waterSurface, cell.plantType, cell.biomass, cell.flowTo?.id ?? cell.flowTo?.id ?? null
]);

test("stable heap resolves priority ties by caller ID and then insertion order", () => {
  const heap = new StableMinHeap((left, right) => left.priority - right.priority || left.id - right.id);
  heap.push({ priority: 2, id: 8, label: "late" });
  heap.push({ priority: 1, id: 9, label: "first equal" });
  heap.push({ priority: 1, id: 9, label: "second equal" });
  heap.push({ priority: 1, id: 3, label: "small ID" });
  assert.deepEqual([heap.pop().label, heap.pop().label, heap.pop().label, heap.pop().label], ["small ID", "first equal", "second equal", "late"]);
});

test("sync and cooperatively yielded worlds are authoritative equals", async () => {
  const sync = new HexWorld(1337, settings);
  const asyncFast = await HexWorld.createAsync(1337, settings, { yieldBudgetMs: 1 });
  const asyncWide = await HexWorld.createAsync(1337, settings, { yieldBudgetMs: 50 });
  assert.deepEqual(worldProjection(asyncFast), worldProjection(sync));
  assert.deepEqual(worldProjection(asyncWide), worldProjection(sync));
  assert.deepEqual(asyncFast.riverRoutes.map(route => route.cells.map(cell => cell.id)), sync.riverRoutes.map(route => route.cells.map(cell => cell.id)));
  assert.deepEqual(asyncFast.basins.map(basin => basin.cells.map(cell => cell.id)), sync.basins.map(basin => basin.cells.map(cell => cell.id)));
});

test("async world generation reports progress and honours cancellation", async () => {
  const controller = new AbortController(), phases = [];
  await assert.rejects(HexWorld.createAsync(9, settings, {
    signal: controller.signal,
    yieldBudgetMs: 1,
    onProgress: progress => { phases.push(progress.phase); if (progress.phase === "hydrology warm-up" && progress.completed >= 2) controller.abort(); }
  }), error => error?.name === "AbortError");
  assert.ok(phases.includes("cells"));
  assert.ok(phases.includes("hydrology warm-up"));
});

test("daily presentation deltas are exact, ordered, and deterministic", () => {
  const left = new HexWorld(77, settings), right = new HexWorld(77, settings);
  const weather = { stormFactor: .35 };
  const a = left.update(1, "Summer", weather), b = right.update(1, "Summer", weather);
  assert.deepEqual(a, b);
  for (const ids of [a.cellIds, a.lakeBasinIds, a.riverRouteIds]) assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(a.cellIds, [...a.cellIds].sort((x, y) => x - y));
  assert.deepEqual(left.waterCellIds, [...left.waterCellIds].sort((x, y) => x - y));
});

test("batched navmesh construction preserves polygons, edges, and routes", async () => {
  const world = new HexWorld(1337, settings), sync = buildNavMesh(world, { maxSlope: 1, allowRocky: true });
  const yielded = await buildNavMeshAsync(world, { maxSlope: 1, allowRocky: true }, { yieldBudgetMs: 1 });
  const project = mesh => [...mesh.polygons.values()].map(polygon => [polygon.id, polygon.center, polygon.neighbours]);
  assert.deepEqual(project(yielded), project(sync));
  assert.equal(yielded.cellToPolygon.size, sync.cellToPolygon.size);
});

test("A* skips stale entries, reports unreachable goals, and reconstructs analytic portals", () => {
  const polygon = (id, x, z, neighbours) => [id, { id, center: { x, z }, neighbours }];
  const mesh = {
    worldRadius: 1,
    polygons: new Map([
      polygon(0, 0, 0, [{ id: 1, cost: 10 }, { id: 2, cost: 1 }]),
      polygon(1, 2, 0, [{ id: 3, cost: 1 }]),
      polygon(2, 1, 0, [{ id: 1, cost: 1 }, { id: 3, cost: 50 }]),
      polygon(3, 3, 0, []), polygon(4, 20, 0, [])
    ]),
    polygonAt: x => x >= 19 ? 4 : x >= 3 ? 3 : 0
  };
  const path = findNavPath(mesh, { x: 0, z: 0 }, { x: 3, z: 0 });
  assert.deepEqual(path.polygonIds, [0, 2, 1, 3]);
  assert.equal(path.cost, 3);
  assert.equal(findNavPath(mesh, { x: 0, z: 0 }, { x: 20, z: 0 }), null);
  const portal = analyticHexPortal(mesh, 0, 2);
  assert.deepEqual(portal, [{ x: .5, z: .5 }, { x: .5, z: -.5 }]);
});

test("typed fan sampling matches a seven-vertex terrain fan", () => {
  const positions = new Float32Array([0, 2, 0, 1, 4, 0, .5, 4, 1, -.5, 2, 1, -1, 2, 0, -.5, 2, -1, .5, 4, -1]);
  assert.equal(indexedFanSurfaceHeight(positions, 0, 0, 0), 2);
  assert.equal(indexedFanSurfaceHeight(positions, 0, .5, 0), 3);
  assert.equal(indexedFanSurfaceHeight(positions, 0, 4, 4), 2);
});
