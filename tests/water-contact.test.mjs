import test from "node:test";
import assert from "node:assert/strict";
import { closestWaterEdgePoint, drinkingContactState, waterContactPoint } from "../src/water-contact.js";

test("water contact is placed immediately outside the closest shoreline", () => {
  const animal = { x: 3, z: 0, orientation: Math.PI, velocityX: 0, velocityZ: 0 };
  const cell = { id: 7, x: 0, z: 0 };
  const edge = closestWaterEdgePoint(animal, cell, 1);
  const contact = waterContactPoint(animal, cell, 1, .25);
  assert.ok(contact.x > edge.x);
  assert.ok(Math.abs(contact.x - edge.x - .275) < .001);
  assert.equal(contact.sourceId, 7);
});

test("hydration contact requires touching facing and stopping", () => {
  const contact = { x: 1.275, z: 0, edgeX: 1, edgeZ: 0 };
  const ready = drinkingContactState({ x: 1.275, z: 0, orientation: Math.PI, velocityX: 0, velocityZ: 0 }, contact);
  const tooFar = drinkingContactState({ x: 1.6, z: 0, orientation: Math.PI, velocityX: 0, velocityZ: 0 }, contact);
  const reversed = drinkingContactState({ x: 1.275, z: 0, orientation: 0, velocityX: 0, velocityZ: 0 }, contact);
  const moving = drinkingContactState({ x: 1.275, z: 0, orientation: Math.PI, velocityX: .1, velocityZ: 0 }, contact);
  assert.equal(ready.ready, true);
  assert.equal(tooFar.ready, false);
  assert.equal(reversed.ready, false);
  assert.equal(moving.ready, false);
});
