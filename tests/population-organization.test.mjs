import test from "node:test";
import assert from "node:assert/strict";
import { buildLargeOrganizations, largeOrganizationEligible, organizationProfile, updateTerritoryClaims } from "../src/population-organization.js";

test("large organizations activate only for sufficiently large worlds and populations", () => {
  assert.equal(largeOrganizationEligible({ worldSize: 90, population: 7 }), false);
  assert.equal(largeOrganizationEligible({ worldSize: 90, population: 8 }), true);
});

test("one ordinary group never becomes a meta-group merely because it is large", () => {
  const group = { id: "family", speciesId: "grazer", count: 20, centroid: { x: 0, z: 0 }, goal: "protection" };
  assert.equal(buildLargeOrganizations([group], { grazer: { diet: "plants" } }, { worldSize: 90, population: 20 }).length, 0);
});

test("a meta-group may include nearby compatible individuals after multiple groups cohere", () => {
  const groups = [{ id: "family-a", speciesId: "grazer", count: 4, centroid: { x: 0, z: 0 }, movement: { x: 1, z: 0 }, goal: "travelling" }, { id: "males-b", speciesId: "grazer", count: 4, centroid: { x: 3, z: 0 }, movement: { x: 1, z: .1 }, goal: "water" }];
  const individuals = [{ id: "solo-1", speciesId: "grazer", count: 1, centroid: { x: 2, z: 1 }, movement: { x: .8, z: 0 }, goal: "explore" }];
  const result = buildLargeOrganizations(groups, { grazer: { diet: "plants" } }, { worldSize: 90, population: 9, individuals });
  assert.deepEqual(result[0].groupIds, ["family-a", "males-b"]);
  assert.deepEqual(result[0].individualIds, ["solo-1"]);
  assert.equal(result[0].count, 9);
});

test("nearby groups moving in opposing directions do not form a meta-group", () => {
  const groups = [{ id: "a", speciesId: "grazer", count: 4, centroid: { x: 0, z: 0 }, movement: { x: 1, z: 0 }, goal: "travelling" }, { id: "b", speciesId: "grazer", count: 4, centroid: { x: 2, z: 0 }, movement: { x: -1, z: 0 }, goal: "travelling" }];
  assert.equal(buildLargeOrganizations(groups, { grazer: { diet: "plants" } }, { worldSize: 90, population: 8 }).length, 0);
});

test("nearby families and groups can form a migration group", () => {
  const groups = [{ id: "g1", speciesId: "grazer", count: 5, centroid: { x: 0, z: 0 }, goal: "water" }, { id: "g2", speciesId: "grazer", count: 6, centroid: { x: 4, z: 2 }, goal: "travelling" }];
  const result = buildLargeOrganizations(groups, { grazer: { diet: "plants", herdTendency: .8 } }, { worldSize: 180, population: 100 });
  assert.equal(result[0].type, "migration-group"); assert.deepEqual(result[0].groupIds, ["g1", "g2"]);
});

test("future herbivore species can mix while carnivores remain separate by default", () => {
  const species = { deer: { diet: "plants" }, bison: { diet: "plants" }, wolf: { diet: "meat" } };
  const base = [{ id: "d", speciesId: "deer", count: 5, centroid: { x: 0, z: 0 }, goal: "foraging" }, { id: "b", speciesId: "bison", count: 5, centroid: { x: 2, z: 0 }, goal: "foraging" }];
  assert.equal(buildLargeOrganizations(base, species, { worldSize: 180, population: 100 })[0].type, "mixed-herd");
  assert.equal(buildLargeOrganizations([...base.slice(0, 1), { id: "w", speciesId: "wolf", count: 5, centroid: { x: 2, z: 0 }, goal: "hunting" }], species, { worldSize: 180, population: 100 }).length, 0);
});

test("overlapping territorial owners produce bounded dispute pressure", () => {
  const owners = [{ id: "pack-a", speciesId: "wolf", count: 5, centroid: { x: 0, z: 0 } }, { id: "wolf-b", speciesId: "wolf", count: 1, centroid: { x: 8, z: 0 } }];
  const result = updateTerritoryClaims({}, owners, { wolf: { diet: "meat", territoriality: .9, territoryRadius: 12 } }, 20, { worldSize: 180, population: 100 });
  assert.equal(Object.keys(result.claims).length, 2); assert.ok(result.disputes[0].intensity > 0);
  assert.equal(organizationProfile({ diet: "meat" }).coalitionKind, "pack");
});
