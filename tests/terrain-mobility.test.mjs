import test from "node:test";
import assert from "node:assert/strict";
import { SPECIES_IDS } from "../src/species-registry.js";
import { TERRAIN_MOBILITY, mobilityStrengthIndex, terrainMobilityAssessment, terrainMobilityFor } from "../src/terrain-mobility.js";
import { buildNavMesh } from "../src/navmesh.js";
import { createLocomotionState, createMovementRequest, ensureRoute, LOCOMOTION_PROFILES } from "../src/locomotion-system.js";

const animal = (speciesId, overrides = {}) => ({ speciesId, lifeStage: "adult", health: 100, fatigue: 0, leanMass: 10, muscleMass: 6.8, injuries: [], pregnant: null, ...overrides });

test("every species has an explicit slope and rock profile", () => {
  assert.deepEqual(Object.keys(TERRAIN_MOBILITY).sort(), [...SPECIES_IDS].sort());
  for (const id of SPECIES_IDS) {
    const profile = terrainMobilityFor(id);
    assert.ok(profile.comfortableSlope >= 0 && profile.comfortableSlope < profile.maximumSlope, id);
    assert.ok(profile.maximumSlope <= 1, id);
    assert.ok(profile.strengthDemand > 0, id);
  }
});

test("near-vertical specialists can use faces ordinary heavy species refuse", () => {
  const verticalIbex = terrainMobilityAssessment(animal("highland-grazer"), { slope: .98, rocky: true });
  const verticalCat = terrainMobilityAssessment(animal("highland-prowler"), { slope: .96, rocky: true });
  const bison = terrainMobilityAssessment(animal("great-plains-grazer"), { slope: .55 });
  const elephant = terrainMobilityAssessment(animal("african-elephant"), { slope: .4 });
  assert.equal(verticalIbex.allowed, true);
  assert.equal(verticalCat.allowed, true);
  assert.equal(bison.allowed, false);
  assert.equal(elephant.allowed, false);
});

test("individual strength and condition change usable slope without changing species anatomy", () => {
  const strong = animal("grazer", { leanMass: 10, muscleMass: 7.2 });
  const weak = animal("grazer", { leanMass: 10, muscleMass: 4, health: 42, fatigue: 82, injuries: [{ severity: .6 }] });
  const slope = { slope: .5 };
  assert.ok(mobilityStrengthIndex(strong) > mobilityStrengthIndex(weak));
  assert.equal(terrainMobilityAssessment(strong, slope).allowed, true);
  assert.equal(terrainMobilityAssessment(weak, slope).allowed, false);
});

test("steeper permitted ground slows travel and increases metabolic demand", () => {
  const subject = animal("hunter"), level = terrainMobilityAssessment(subject, { slope: .1 }), steep = terrainMobilityAssessment(subject, { slope: .6, rocky: true });
  assert.equal(steep.allowed, true);
  assert.ok(steep.speedMultiplier < level.speedMultiplier);
  assert.ok(steep.energyMultiplier > level.energyMultiplier);
});

test("route planning keeps steep faces for climbers but excludes them for other species", () => {
  const cells = [{ id: 0, x: 0, z: 0, slope: 0, neighbours: [] }, { id: 1, x: 1, z: 0, slope: .8, rocky: true, neighbours: [] }, { id: 2, x: 2, z: 0, slope: 0, neighbours: [] }];
  cells[0].neighbours = [cells[1]]; cells[1].neighbours = [cells[0], cells[2]]; cells[2].neighbours = [cells[1]];
  const world = { radius: .58, cells, lookup: x => cells[Math.max(0, Math.min(2, Math.round(x)))], corners: cell => Array.from({ length: 6 }, (_, index) => ({ x: cell.x + .58 * Math.cos(index * Math.PI / 3), z: cell.z + .58 * Math.sin(index * Math.PI / 3) })) };
  const mesh = buildNavMesh(world, { maxSlope: 1, allowRocky: true });
  const routeFor = speciesId => { const subject = { ...animal(speciesId), id: speciesId, alive: true, x: 0, z: 0, orientation: 0 }, profile = LOCOMOTION_PROFILES[speciesId]; subject.locomotion = createLocomotionState(subject, profile); subject.movementRequest = createMovementRequest("cross", { x: 2, z: 0 }); return ensureRoute(subject, mesh); };
  assert.equal(routeFor("grazer").points.length, 0);
  assert.deepEqual(routeFor("highland-grazer").corridor, [0, 1, 2]);
});
