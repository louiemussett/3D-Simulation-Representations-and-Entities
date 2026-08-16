import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const reference = await readFile(new URL("../src/laboratory-reference.js", import.meta.url), "utf8");

test("main Laboratory mounts live food and spatial ecology in World, Entity and Society", () => {
  assert.match(app, /world-ecology-workspace/);
  assert.match(app, /entity-ecology-workspace/);
  assert.match(app, /society-ecology-workspace/);
  assert.match(app, /Food, carcass and spatial ecology/);
  assert.match(app, /Live food ecology and territorial landscape/);
  assert.match(app, /Territorial social conflict/);
});

test("entity ecology exposes preferences, carcass provenance, browsing and claim lifecycle", () => {
  for (const phrase of ["Preferred vegetation", "Avoided vegetation", "Preferred carcass sources", "Carcass provenance", "Tree browsing", "Current defended claim", "stable occupancy", "Territory conflict"]) assert.match(app, new RegExp(phrase));
});

test("species reference is generated from food and spatial registries for all species", () => {
  assert.match(reference, /foodPreferenceSummary/);
  assert.match(reference, /spatialEcology/);
  assert.match(reference, /speciesEcologyDirectoryHtml/);
  assert.match(reference, /A home range is not a defended territory/);
  assert.match(reference, /reachable foliage can be browsed/);
});
