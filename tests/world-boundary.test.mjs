import test from "node:test";
import assert from "node:assert/strict";
import { assessWorldBoundary, DEFAULT_EDGE_DWELL_TICKS, DEFAULT_EDGE_MARGIN, DEFAULT_RECOVERY_BUFFER, DEFAULT_SAFE_INSET, recoveryDistance, worldBoundaryClearance } from "../src/world-boundary.js";

test("crossing the playable edge starts a committed inward recovery", () => {
  const state = assessWorldBoundary({ x: 50.4, z: 8 }, 50);
  assert.equal(state.recovering, true);
  assert.ok(state.target.x < 50);
  assert.equal(state.target.z, 8);
  assert.equal(state.outer, 50 + DEFAULT_RECOVERY_BUFFER);
});

test("recovery remains active until the whole animal is safely inset", () => {
  assert.equal(assessWorldBoundary({ x: 49.5, z: 0 }, 50, { wasRecovering: true }).recovering, true);
  assert.equal(assessWorldBoundary({ x: 50 - DEFAULT_EDGE_MARGIN - .1, z: 0 }, 50, { wasRecovering: true }).recovering, false);
});

test("recovery target finishes beyond the release threshold to prevent edge loops", () => {
  const state = assessWorldBoundary({ x: 50.2, z: 7 }, 50);
  assert.ok(state.target.x < 50 - state.edgeMargin);
  assert.ok(worldBoundaryClearance(state.target, 50) > state.edgeMargin);
});

test("an animal may briefly visit the edge but cannot settle there indefinitely", () => {
  const visiting = assessWorldBoundary({ x: 49, z: 0 }, 50, { edgeDwellTicks: DEFAULT_EDGE_DWELL_TICKS - 1 });
  const lingering = assessWorldBoundary({ x: 49, z: 0 }, 50, { edgeDwellTicks: DEFAULT_EDGE_DWELL_TICKS });
  assert.equal(visiting.nearPlayableEdge, true);
  assert.equal(visiting.recovering, false);
  assert.equal(lingering.lingeringAtEdge, true);
  assert.equal(lingering.recovering, true);
  assert.equal(lingering.target.x, 50 - DEFAULT_EDGE_MARGIN - DEFAULT_SAFE_INSET);
});

test("boundary clearance is positive inside and negative outside", () => {
  assert.equal(worldBoundaryClearance({ x: 47, z: 2 }, 50), 3);
  assert.equal(worldBoundaryClearance({ x: 51, z: 2 }, 50), -1);
});

test("outer recovery frame is a hard final limit including corners", () => {
  const state = assessWorldBoundary({ x: 80, z: -80 }, 50);
  assert.deepEqual(state.clamped, { x: 54.5, z: -54.5 });
  assert.deepEqual(state.target, { x: 50 - DEFAULT_EDGE_MARGIN - DEFAULT_SAFE_INSET, z: -50 + DEFAULT_EDGE_MARGIN + DEFAULT_SAFE_INSET });
  assert.ok(recoveryDistance({ x: 53, z: -54 }, 50) > 4);
});
