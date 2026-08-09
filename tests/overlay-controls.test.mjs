import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const reference = readFileSync(new URL("../src/laboratory-reference.js", import.meta.url), "utf8");

const controls = ["vision", "personal-space", "predator-intent", "knowledge-fog", "smell", "sound", "calls", "memory", "selection-ring", "navigation-cues", "motion-trails", "entity-focus", "biomass", "water", "pheromone", "territories"];

test("every visible overlay control has a DOM binding and render-change listener", () => {
  for (const id of controls) assert.match(html, new RegExp(`id=["']overlay-${id}["']`), id);
  for (const property of ["overlayVision", "overlayPersonalSpace", "overlayPredatorIntent", "overlayKnowledgeFog", "overlaySmell", "overlaySound", "overlayCalls", "overlayMemory", "overlaySelectionRing", "overlayNavigationCues", "overlayMotionTrails", "overlayEntityFocus", "overlayBiomass", "overlayWater", "overlayPheromone", "overlayTerritories"]) {
    assert.match(app, new RegExp(`${property}\\s*=|${property}:`), property);
    assert.match(app, new RegExp(`\\[${property.replace("overlay", "ui.overlay")}|ui\\.${property}`), property);
  }
});

test("selected panel mirrors sensory, spatial and ecology overlays", () => {
  for (const key of ["vision", "smell", "sound", "calls", "memory", "intent", "fog", "personal", "ring", "navigation", "trails", "focus", "biomass", "water", "scent", "territories"]) assert.match(app, new RegExp(`option\\(["']${key}["']`), key);
});

test("Main Laboratory exposes every currently functional overlay control", () => {
  for (const property of [
    "overlayVision", "overlaySmell", "overlaySound", "overlayCalls", "overlayMemory", "overlayPredatorIntent",
    "overlayKnowledgeFog", "overlayPersonalSpace", "overlaySelectionRing", "overlayNavigationCues", "overlayMotionTrails",
    "overlayEntityFocus", "overlayEntitySymbols", "overlayEntityNames", "overlayHealthBars", "overlayEnduranceBar",
    "overlayCompositionBar", "overlayAnalysisStage", "overlayOrganismOnly", "overlayHideEntityPresentation",
    "overlayBiomass", "overlayWater", "overlayPheromone", "overlayTerritories"
  ]) assert.match(app, new RegExp(`\\["${property}",`), property);
  assert.match(app, /input\.hidden = false/);
  assert.match(app, /LABORATORY_OVERLAY_GROUPS\.map\(overlayGroup\)/);
});

test("scent evidence is matched by authoritative cells and territory is simulation-backed", () => {
  assert.match(app, /cellAt\(m\.x, m\.z\)[\s\S]*map\(\(cell\) => key\(cell\)\)/);
  assert.match(app, /Object\.values\(sim\.territoryClaims \|\| \{\}\)/);
  assert.match(app, /sim\.territoryDisputes \|\| \[\]/);
  assert.match(reference, /Scent contacts versus all scent trails/);
  assert.match(reference, /Territory circles come from the simulation's registered territoriality/);
});

test("selection ring, navigation and trail controls reach their actual world renderers", () => {
  assert.match(app, /groups\.selection\.visible = !organismOnly && Boolean\(ui\.overlaySelectionRing\?\.checked \|\| ui\.overlayNavigationCues/);
  assert.match(app, /item\.ring\.visible = Boolean\(ui\.overlaySelectionRing/);
  assert.match(app, /item\.arrow\.visible = navigationCues/);
  assert.match(app, /item\.arrow\.visible = Boolean\(ui\.overlayNavigationCues/);
  assert.match(app, /updateMotionTrail\([\s\S]*ui\.overlayMotionTrails/);
});
