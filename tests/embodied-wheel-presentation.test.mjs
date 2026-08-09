import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("standard embodied wheels show symbols without repeated peripheral words", () => {
  const start = app.indexOf("function renderEmbodiedWheel()");
  const end = app.indexOf("function openEmbodiedWheel", start);
  const renderer = app.slice(start, end);

  assert.match(renderer, /currentEmbodiment\(\)\.difficulty !== "standard"/);
  assert.match(renderer, /showPeripheralLabels \? `<small>\$\{item\.label\}<\/small>` : ""/);
  assert.match(renderer, /embodied-wheel-centre strong/);
  assert.match(renderer, /textContent = selected\?\.label/);
});

test("the shared presentation rule covers both expression and call wheels", () => {
  assert.match(app, /openEmbodiedWheel\(event\.code === "KeyQ" \? "expression" : "call"\)/);
  assert.equal((app.match(/function renderEmbodiedWheel\(\)/g) || []).length, 1);
});
