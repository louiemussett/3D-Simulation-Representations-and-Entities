import test from "node:test";
import assert from "node:assert/strict";
import { bestStrategicArea, groupRecoveryPressure, observeEntityArea, rememberGroupEvent } from "../src/strategic-memory.js";
test("hunter estimates prey density, movement and calories by area", () => { const hunter = { entityKnowledge: { H1: { lastKnown: { x: 1, z: 1, tick: 5 } } } }; observeEntityArea(hunter, { targetId: "H1", x: 3, z: 2, relationship: "prey", estimatedCalories: 12000, confidence: .9 }, 7); const area = bestStrategicArea(hunter); assert.ok(area.preyCount > 0); assert.ok(area.estimatedCalories > 0); assert.ok(area.headingX > 0); });
test("a remembered group loss creates a size-recovery pressure", () => { const leader = {}; rememberGroupEvent(leader, { kind: "member-lost", memberId: "H4", sizeBefore: 6, sizeAfter: 5 }, 20); assert.equal(leader.groupHistory[0].memberId, "H4"); assert.ok(groupRecoveryPressure(leader, 5) > 0); });
