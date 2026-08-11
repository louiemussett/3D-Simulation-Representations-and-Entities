import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const docs = readFileSync(new URL("../DEVELOPMENT.md", import.meta.url), "utf8");

test("world generation exposes phased accessible progress and cancellation", () => {
  for (const id of ["world-generation-progress", "world-generation-phase", "world-generation-detail", "world-generation-bar", "world-generation-cancel"]) assert.match(html, new RegExp(`id="${id}"`));
  assert.match(html, /role="status"[^>]*aria-live="polite"/);
  assert.match(app, /HexWorld\.createAsync/);
  assert.match(app, /buildNavMeshAsync/);
  assert.match(app, /worldGenerationController\?\.abort/);
  assert.match(app, /error\?\.name === "AbortError"/);
});

test("large-map mode is a local presentation setting with bounded vegetation work", () => {
  assert.match(html, /id="graphics-large-map-performance"/);
  assert.match(app, /graphicsSettings\.largeMapPerformanceMode \? 4 : 8/);
  assert.match(app, /largeMapPerformanceMode: graphicsSettings\.largeMapPerformanceMode/);
  const snapshotBody = app.match(/function snapshotWorld\(\)[^\n]+/)?.[0] || "";
  assert.ok(snapshotBody);
  assert.doesNotMatch(snapshotBody, /largeMapPerformanceMode/);
  assert.match(docs, /presentation-only graphics preference/);
});

test("daily hydrology consumes ordered deltas instead of rebuilding terrain", () => {
  const cycle = app.match(/function beginWaterCycle\(\)[\s\S]*?\n\}/)?.[0] || "";
  assert.match(cycle, /sim\.hexWorld\.update/);
  assert.match(cycle, /sim\.hexWorld\.waterCellIds/);
  assert.match(cycle, /rebuildWaterPresentation\(delta\)/);
  assert.doesNotMatch(cycle, /buildTerrain\(/);
});

test("terrain and water presentation use one ground mesh and ID-addressable water meshes", () => {
  assert.match(app, /verticesPerCell = 7/);
  assert.match(app, /new IndexArray\(cellCount \* 18\)/);
  assert.match(app, /const lakeRenderMeshes = new Map\(\)/);
  assert.match(app, /const riverRenderMeshes = new Map\(\)/);
  assert.match(app, /groundColours\.addUpdateRange/);
  assert.match(app, /terrainSurfaceTable = \{ positions, offsets, verticesPerCell \}/);
});
