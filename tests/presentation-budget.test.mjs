import test from "node:test";
import assert from "node:assert/strict";
import { MinimapInvalidation, PRESENTATION_CHANNELS, PresentationBudgetAllocator, presentationPartVisibility, resolvePresentationTier, shouldRunBoundedUpdate } from "../src/presentation-budget.js";

test("all five tiers resolve across selection and zoom distance", () => {
  assert.equal(resolvePresentationTier({ selected: true, distance: 999 }), "selected");
  assert.equal(resolvePresentationTier({ distance: 12 }), "close");
  assert.equal(resolvePresentationTier({ distance: 60 }), "medium");
  assert.equal(resolvePresentationTier({ distance: 120 }), "distant");
  assert.equal(resolvePresentationTier({ distance: 12, cameraDistance: 120 }), "medium");
  assert.equal(resolvePresentationTier({ distance: 12, cameraDistance: 190 }), "distant");
  assert.equal(resolvePresentationTier({ strategic: true, distance: 12 }), "strategic");
  assert.deepEqual(PRESENTATION_CHANNELS.strategic, ["aggregates"]);
});

test("tier transitions restore identifying animal parts", () => {
  assert.deepEqual(presentationPartVisibility("medium"), { head: true, eyes: true, tail: true, face: false, lifeStageMarker: true });
  assert.equal(presentationPartVisibility("distant").head, false);
  assert.equal(presentationPartVisibility("distant").eyes, false);
  assert.equal(presentationPartVisibility("close").head, true);
  assert.equal(presentationPartVisibility("close").eyes, true);
  assert.equal(presentationPartVisibility("selected").face, true);
});

test("budgets are enforced with selected and immediate threats first", () => {
  const allocator = new PresentationBudgetAllocator({ trails: 2, connectors: 1, thoughts: 1, callRings: 1, healthBars: 1, actionBadges: 1, movementArrows: 1, urgentHalos: 1 }, 0);
  const candidates = [
    { id: "ordinary", tier: "selected", distance: 2, selected: true, permittedChannels: ["movement", "cause", "thought", "signals", "injury"] },
    { id: "threat", tier: "close", distance: 4, immediateThreat: true, permittedChannels: ["movement", "cause", "signals", "injury"] },
    { id: "other", tier: "close", distance: 1, permittedChannels: ["movement", "cause", "signals", "injury"] }
  ];
  const result = allocator.allocate(candidates);
  assert.equal([...result.values()].filter((channels) => channels.has("trails")).length, 1);
  assert.equal(result.get("ordinary").has("connectors"), true);
  assert.equal(result.get("ordinary").has("thoughts"), true);
  assert.equal([...result.values()].filter((channels) => channels.has("movementArrows")).length, 1);
  assert.equal([...result.values()].filter((channels) => channels.has("urgentHalos")).length, 1);
});

test("privacy overrides importance and budget availability", () => {
  const allocator = new PresentationBudgetAllocator({ connectors: 10, thoughts: 10 });
  const result = allocator.allocate([{ id: "observed", tier: "selected", selected: true, distance: 0, permittedChannels: ["body", "movement", "injury", "signals"] }]);
  assert.equal(result.get("observed").has("connectors"), false);
  assert.equal(result.get("observed").has("thoughts"), false);
});

test("hysteresis keeps an existing overlay through a close ranking change", () => {
  const allocator = new PresentationBudgetAllocator({ healthBars: 1 }, 100);
  const candidate = (id, distance) => ({ id, tier: "close", distance, permittedChannels: ["injury"] });
  assert.equal(allocator.allocate([candidate("a", 10), candidate("b", 11)]).get("a").has("healthBars"), true);
  assert.equal(allocator.allocate([candidate("a", 11), candidate("b", 10)]).get("a").has("healthBars"), true);
});

test("reality work is visibility-gated and rate bounded", () => {
  assert.equal(shouldRunBoundedUpdate({ visible: false, now: 1000, lastRun: 0, interval: 500 }), false);
  assert.equal(shouldRunBoundedUpdate({ visible: true, now: 400, lastRun: 0, interval: 500 }), false);
  assert.equal(shouldRunBoundedUpdate({ visible: true, now: 500, lastRun: 0, interval: 500 }), true);
  assert.equal(shouldRunBoundedUpdate({ visible: true, now: 1, lastRun: 0, interval: 500, force: true }), true);
});

test("minimap static and dynamic invalidation remain separate", () => {
  const invalidation = new MinimapInvalidation();
  assert.equal(invalidation.needsStatic("terrain-1"), true); invalidation.markStatic("terrain-1");
  invalidation.markDynamic("animals-1");
  assert.equal(invalidation.needsStatic("terrain-1"), false);
  assert.equal(invalidation.needsDynamic("animals-2"), true);
  assert.equal(invalidation.needsStatic("terrain-1"), false);
});
