import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const index = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("world setup exposes calculated food webs, five quick levels and an exact slider", () => {
  for (const id of ["ridge-hunter-web", "brush-fox-web", "shadow-stalker-web", "pack-breaker-web", "waterline-ambusher-web", "highland-prowler-web", "sunscale-ambusher-web", "full"]) assert.match(index, new RegExp(`option value="${id}"`));
  for (const percent of [20, 50, 100, 150, 200]) assert.match(index, new RegExp(`<option value="${percent}"`));
  assert.match(index, /id="ecology-population-scale"[^>]*min="20"[^>]*max="200"[^>]*step="10"/);
  assert.match(index, /option value="ridge-hunter-web" selected/);
  assert.match(index, /id="start-herbivores"[^>]*value="149"/);
  assert.match(index, /id="start-carnivores"[^>]*value="1"/);
});

test("world setup persists population scale while exact species editing remains available", () => {
  assert.match(app, /ecologyPopulationScale:\s*100/);
  assert.match(app, /ecologyPopulationScale:\s*ecologyPopulationScalePercent\(\)/);
  assert.match(app, /setup\.ecologyPopulationScale/);
  assert.match(app, /ui\.ecologyPreset\.value = "custom"/);
  assert.match(app, /for \(const id of SPECIES_IDS\) ui\.startSpecies/);
});

test("low hunting populations start with a protected late-pregnant female founder", () => {
  assert.match(app, /needsPregnantPredatorFounder\(speciesId, population\)/);
  assert.match(app, /needsPregnantPredatorFounder\(speciesId, population\.length\)/);
  assert.match(app, /plan\[0\] = \{ \.\.\.plan\[0\], sex: "F", stage: "adult" \}/);
  assert.match(app, /protectedFounder \? \.95/);
  assert.match(app, /lowPopulationFounderSafeguard: true/);
  assert.match(app, /singleCarnivoreFounder = protectedFounder && population\.length === 1 && isCarnivore\(female\)/);
  assert.match(app, /maximumFounderFatPercent = Math\.max\(20, profile\.obeseAbove - 2\)/);
  assert.match(app, /Math\.max\(20, profile\.idealHigh \+ 6, profile\.idealHigh \* 1\.25\)/);
  assert.match(app, /setBodyFatPercent\(female, targetFatPercent\)/);
  assert.match(app, /fillMetabolicReserves\(female, \{ gut: 1, blood: 1, liver: 1 \}\)/);
});
