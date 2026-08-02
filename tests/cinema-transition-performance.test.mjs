import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("Cinema cuts refresh camera admission and overlays without rebuilding landscape presentation", () => {
  assert.match(app, /function refreshCinemaShotPresentation\(\) \{ return profiler\.measure\("cinema shot presentation refresh", \(\) => renderAllWork\(\{ cameraOnly: true, refreshOverlays: true \}\)\); \}/);
  assert.match(app, /movieState\.presentationPending && transitionProgress >= 1[\s\S]{0,220}refreshCinemaShotPresentation\(\)/);
  assert.match(app, /function renderAllWork\(\{ cameraOnly = false, refreshOverlays = false \} = \{\}\)/);
  assert.match(app, /if \(!cameraOnly\) \{[\s\S]{0,700}updateKnowledgeFog/);
});

test("Cinema entry and camera recovery use the lightweight presentation refresh", () => {
  assert.match(app, /document\.body\.classList\.add\("movie-mode"\)[\s\S]{0,420}refreshCinemaShotPresentation\(\)/);
  assert.match(app, /restoreCameraFadedVegetation\(\); refreshCinemaShotPresentation\(\)/);
});

test("Cinema still queues bounded multi-shot coverage before the next cut", () => {
  assert.match(app, /const maximumShots = [\s\S]{0,500}\? 3/);
  assert.match(app, /movieState\.queue = planCinemaCommentary\(plannedBeats\)/);
});
