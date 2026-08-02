import test from "node:test";
import assert from "node:assert/strict";
import {
  ENTITY_PANEL_DISTANCE_SCALE,
  entityPanelScaleForDistance,
  resolveEntityPanelScaleSnapshot
} from "../src/entity-panel-distance-scale.js";

test("one thick panel scales continuously from camera-to-entity distance", () => {
  assert.equal(entityPanelScaleForDistance(ENTITY_PANEL_DISTANCE_SCALE.referenceDistance), 1);
  assert.ok(entityPanelScaleForDistance(20) > entityPanelScaleForDistance(48));
  assert.ok(entityPanelScaleForDistance(96) < entityPanelScaleForDistance(48));
  assert.equal(entityPanelScaleForDistance(.01), ENTITY_PANEL_DISTANCE_SCALE.maximumScale);
  assert.equal(entityPanelScaleForDistance(100000), ENTITY_PANEL_DISTANCE_SCALE.minimumScale);
});

test("orbit pan pitch and entity movement cannot resize a held panel", () => {
  const initial = resolveEntityPanelScaleSnapshot({ distance: 30, wheelRevision: 4 });
  const tilted = resolveEntityPanelScaleSnapshot({ distance: 90, wheelRevision: 4, previous: initial });
  const panned = resolveEntityPanelScaleSnapshot({ distance: 160, wheelRevision: 4, previous: tilted });
  assert.equal(tilted.scale, initial.scale);
  assert.equal(panned.scale, initial.scale);
  assert.equal(tilted.distance, initial.distance, "the scale provenance remains the wheel-sampled entity distance");
  assert.equal(panned.held, true);
});

test("a wheel revision resamples each entity's own distance", () => {
  const initial = resolveEntityPanelScaleSnapshot({ distance: 30, wheelRevision: 4 });
  const zoomed = resolveEntityPanelScaleSnapshot({ distance: 70, wheelRevision: 5, previous: initial });
  assert.notEqual(zoomed.scale, initial.scale);
  assert.equal(zoomed.distance, 70);
  assert.equal(zoomed.wheelRevision, 5);
  assert.equal(zoomed.held, false);
});

test("newly visible entities receive a deterministic scale before any wheel input", () => {
  assert.deepEqual(
    resolveEntityPanelScaleSnapshot({ distance: 64, wheelRevision: 0 }),
    resolveEntityPanelScaleSnapshot({ distance: 64, wheelRevision: 0 })
  );
});
