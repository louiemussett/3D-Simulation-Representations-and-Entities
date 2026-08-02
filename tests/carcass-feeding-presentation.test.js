import test from "node:test";
import assert from "node:assert/strict";
import { carcassFeedingLook, smoothFeedingLook } from "../src/carcass-feeding-presentation.js";

test("carcass feeding look converts world bearing into local hunter yaw", () => {
  const actor = { x: 0, z: 0, orientation: 0 };
  assert.deepEqual(carcassFeedingLook(actor, { x: 1, z: 0 }), { headYaw: 0, bodyYaw: 0 });
  assert.ok(carcassFeedingLook(actor, { x: 0, z: 1 }).headYaw < 0);
  assert.ok(carcassFeedingLook(actor, { x: 0, z: -1 }).headYaw > 0);
});

test("head yaw is clamped and excess rotation is assigned to presentation body yaw", () => {
  const look = carcassFeedingLook({ x: 0, z: 0, orientation: 0 }, { x: -1, z: 0 });
  assert.ok(Math.abs(look.headYaw) <= Math.PI / 3 + 1e-9);
  assert.ok(Math.abs(look.bodyYaw) > 0);
});

test("feeding look smoothly acquires and releases its target", () => {
  const acquired = smoothFeedingLook({ headYaw: 0, bodyYaw: 0 }, { headYaw: 1, bodyYaw: .3 }, 16);
  assert.ok(acquired.headYaw > 0 && acquired.headYaw < 1);
  const released = smoothFeedingLook(acquired, { headYaw: 0, bodyYaw: 0 }, 16);
  assert.ok(released.headYaw < acquired.headYaw);
});
