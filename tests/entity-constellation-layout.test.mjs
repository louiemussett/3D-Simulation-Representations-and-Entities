import test from "node:test";
import assert from "node:assert/strict";
import { ENTITY_CONSTELLATION_PANEL_SCALE, ENTITY_OWNERSHIP_STYLES, assignClusterOwnership, bodyAttachedOverlayGeometry, projectedEntityIntersectsViewport, relationalArrow, resolveEntityConstellations, selectEntityConstellationBudget, suppressOverlappingEntityConstellations } from "../src/entity-constellation-layout.js";

const byId = (records) => new Map(records.map((record) => [record.entityId, record]));
const projected = (entityId, screenX, screenY, extra = {}) => ({ entityId, screenX, screenY, projectedBodyPx: 64, ...extra });

test("projected owners must intersect the front camera viewport before receiving a constellation", () => {
  const viewport = { left: 0, top: 0, right: 800, bottom: 600 };
  assert.equal(projectedEntityIntersectsViewport({ screenX: 400, screenY: 300, projectedBodyPx: 40, clipZ: 0, viewDepth: -10 }, viewport), true);
  assert.equal(projectedEntityIntersectsViewport({ screenX: -15, screenY: 300, projectedBodyPx: 40, clipZ: 0, viewDepth: -10 }, viewport), true, "a partly visible body retains its panel");
  assert.equal(projectedEntityIntersectsViewport({ screenX: -21, screenY: 300, projectedBodyPx: 40, clipZ: 0, viewDepth: -10 }, viewport), false);
  assert.equal(projectedEntityIntersectsViewport({ screenX: 400, screenY: 300, projectedBodyPx: 40, clipZ: 0, viewDepth: 2 }, viewport), false, "owners behind the camera are rejected");
  assert.equal(projectedEntityIntersectsViewport({ screenX: 400, screenY: 300, projectedBodyPx: 40, clipZ: 1.01, viewDepth: -10 }, viewport), false, "owners beyond the clip planes are rejected");
  assert.equal(projectedEntityIntersectsViewport({ screenX: NaN, screenY: 300, projectedBodyPx: 40, clipZ: 0, viewDepth: -10 }, viewport), false);
});

test("centre-weighted panel budget keeps screen position primary over distant focus metadata", () => {
  const viewportBounds = { left: 0, top: 0, right: 1280, bottom: 720 };
  const candidates = [
    projected("selected", 40, 40, { selected: true, interactionIds: ["partner"] }),
    projected("partner", 1210, 80),
    projected("hovered", 1220, 680, { hovered: true }),
    projected("actor", 600, 340, { interactionIds: ["target"] }),
    projected("target", 660, 350),
    projected("ordinary", 640, 360),
    projected("edge", 10, 700),
    projected("edge-actor", 10, 620, { interactionIds: ["edge-target"] }),
    projected("edge-target", 30, 640)
  ];
  const result = selectEntityConstellationBudget(candidates, { viewportBounds });
  assert.equal(result.capacity, 4);
  assert.equal(result.visibleEntityIds.length, 4, "centre-ranked candidates still obey the hard cap");
  for (const id of ["ordinary", "actor", "target"]) assert.ok(result.visibleEntityIds.includes(id), id);
  assert.ok(result.visibleEntityIds.includes("partner"));
  assert.ok(!result.visibleEntityIds.includes("selected"), "a distant selection cannot displace a clearly central owner");
  assert.ok(!result.visibleEntityIds.includes("hovered"), "a distant hover cannot displace a clearly central owner");
  assert.equal(result.decisions.find((decision) => decision.entityId === "partner").reason, "focus-interaction");
  assert.equal(result.decisions.find((decision) => decision.entityId === "edge").reason, "outside-centre");
  assert.equal(result.decisions.find((decision) => decision.entityId === "edge-actor").reason, "outside-centre", "an unrelated edge interaction cannot consume the centre budget");
  assert.equal(result.decisions.find((decision) => decision.entityId === "edge-target").reason, "outside-centre");
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result.decisions) && Object.isFrozen(result.decisions[0]));
});

test("exclusive focus admits exactly its owner and explicit null admits no panels", () => {
  const viewportBounds = { left: 0, top: 0, right: 1000, bottom: 700 };
  const candidates = [
    projected("centre", 500, 350),
    projected("focus", 8, 20),
    projected("other", 520, 360, { hovered: true })
  ];
  const focused = selectEntityConstellationBudget(candidates, { viewportBounds, exclusiveFocusId: "focus" });
  assert.deepEqual(focused.visibleEntityIds, ["focus"]);
  assert.equal(focused.exclusiveFocus, true);
  assert.equal(focused.exclusiveFocusId, "focus");
  assert.equal(focused.candidateCount, 3);
  assert.equal(focused.decisions.find((decision) => decision.entityId === "centre").reason, "exclusive-focus");
  assert.equal(focused.decisions.find((decision) => decision.entityId === "other").reason, "exclusive-focus");
  const world = selectEntityConstellationBudget(candidates, { viewportBounds, exclusiveFocusId: null });
  assert.deepEqual(world.visibleEntityIds, []);
  assert.equal(world.admittedCount, 0);
  assert.equal(world.suppressedCount, candidates.length);
  assert.equal(world.exclusiveFocus, true);
  assert.equal(world.exclusiveFocusId, null);
  const automatic = selectEntityConstellationBudget(candidates, { viewportBounds, maximumPanels: 2 });
  assert.equal(automatic.exclusiveFocus, false);
  assert.equal(automatic.visibleEntityIds.length, 2, "omitting the option restores the strategic panel budget");
});

test("overlap suppression keeps the most central complete footprint without moving any panel", () => {
  const panel = (entityId, bodyX, anchorX, extra = {}) => ({
    entityId,
    body: { x: bodyX, y: 500 },
    anchor: { x: anchorX, y: 450 },
    footprint: { left: -90, right: 90, top: -45, bottom: 45 },
    selected: false,
    hovered: false,
    ...extra
  });
  const centre = panel("centre", 500, 500), overlap = panel("overlap", 560, 570), clear = panel("clear", 800, 800);
  const before = [centre, overlap, clear].map((item) => ({ entityId: item.entityId, anchor: { ...item.anchor } }));
  const forward = suppressOverlappingEntityConstellations([overlap, clear, centre], { viewportBounds: { left: 0, top: 0, right: 1000, bottom: 1000 }, paddingPx: 0 });
  const reversed = suppressOverlappingEntityConstellations([centre, clear, overlap], { viewportBounds: { left: 0, top: 0, right: 1000, bottom: 1000 }, paddingPx: 0 });
  assert.deepEqual(forward, reversed, "caller order cannot decide which overlapping panel stays");
  assert.deepEqual(forward.visibleEntityIds, ["centre", "clear"]);
  const suppressed = forward.decisions.find((decision) => decision.entityId === "overlap");
  assert.equal(suppressed.reason, "overlap");
  assert.equal(suppressed.blockingEntityId, "centre");
  assert.deepEqual([centre, overlap, clear].map((item) => ({ entityId: item.entityId, anchor: { ...item.anchor } })), before, "admission must not lock or reposition a panel");
  assert.ok(Object.isFrozen(forward) && Object.isFrozen(forward.decisions) && Object.isFrozen(forward.decisions[0]));
});

test("body-attached collision geometry includes the bubbles actually drawn over an animal", () => {
  const full = bodyAttachedOverlayGeometry({
    bodyX: 300,
    bodyY: 400,
    headX: 312,
    headY: 340,
    headRadius: 12,
    displayScale: .5,
    bubbleScale: .5,
    identityVisible: true,
    healthVisible: true,
    expressionVisible: true,
    publicCueVisible: true,
    thoughtVisible: true,
    predictionVisible: true
  });
  const compact = bodyAttachedOverlayGeometry({ bodyX: 300, bodyY: 400, headX: 312, headY: 340, headRadius: 12, displayScale: .5, identityVisible: true });
  assert.ok(full.thought.right < full.prediction.left, "paired cognition bubbles keep their authored gap");
  assert.ok(full.footprint.width > compact.footprint.width, "collision width includes side cues and both bubbles");
  assert.ok(full.footprint.top < compact.footprint.top, "collision height reaches the cognition bubbles above the head");
  assert.ok(Object.isFrozen(full) && Object.isFrozen(full.footprint) && Object.isFrozen(full.thought));
});

test("overlap visibility hysteresis prevents tiny swaps but yields to a clearly more central owner", () => {
  const panel = (entityId, bodyX) => ({ entityId, body: { x: bodyX, y: 500 }, anchor: { x: 500, y: 450 }, footprint: { left: -100, right: 100, top: -50, bottom: 50 } });
  const viewportBounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  const held = suppressOverlappingEntityConstellations([panel("retained", 512), panel("challenger", 500)], { viewportBounds, previousVisibleIds: ["retained"], paddingPx: 0 });
  assert.deepEqual(held.visibleEntityIds, ["retained"]);
  const yielded = suppressOverlappingEntityConstellations([panel("retained", 600), panel("challenger", 500)], { viewportBounds, previousVisibleIds: ["retained"], paddingPx: 0 });
  assert.deepEqual(yielded.visibleEntityIds, ["challenger"]);
});

test("a selected near-centre instrument wins a local overlap without defeating a clearly central panel from the edge", () => {
  const panel = (entityId, bodyX, selected = false) => ({ entityId, body: { x: bodyX, y: 500 }, anchor: { x: 500, y: 450 }, footprint: { left: -100, right: 100, top: -50, bottom: 50 }, selected });
  const viewportBounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  const localFocus = suppressOverlappingEntityConstellations([panel("central", 500), panel("selected", 525, true)], { viewportBounds, paddingPx: 0 });
  assert.deepEqual(localFocus.visibleEntityIds, ["selected"]);
  const distantFocus = suppressOverlappingEntityConstellations([panel("central", 500), panel("selected", 800, true)], { viewportBounds, paddingPx: 0 });
  assert.deepEqual(distantFocus.visibleEntityIds, ["central"]);
});

test("ordinary panels prefer the usable viewport centre deterministically", () => {
  const viewportBounds = { left: 300, top: 20, right: 1300, bottom: 820 };
  const candidates = [projected("far", 1150, 700), projected("centre", 800, 420), projected("near", 850, 440), projected("edge", 305, 25)];
  const forward = selectEntityConstellationBudget(candidates, { viewportBounds, maximumPanels: 2 });
  const reversed = selectEntityConstellationBudget([...candidates].reverse(), { viewportBounds, maximumPanels: 2 });
  assert.deepEqual(forward, reversed);
  assert.deepEqual(forward.visibleEntityIds, ["centre", "near"]);
  assert.equal(forward.decisions.find((decision) => decision.entityId === "edge").reason, "outside-centre");
});

test("previously visible owners receive bounded cutoff hysteresis without defeating a clearly closer owner", () => {
  const viewportBounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  const retained = projected("retained", 600, 500), challenger = projected("challenger", 575, 500);
  const held = selectEntityConstellationBudget([retained, challenger], { viewportBounds, maximumPanels: 1, previousVisibleIds: ["retained"] });
  assert.deepEqual(held.visibleEntityIds, ["retained"]);
  const closer = selectEntityConstellationBudget([retained, projected("challenger", 510, 500)], { viewportBounds, maximumPanels: 1, previousVisibleIds: ["retained"] });
  assert.deepEqual(closer.visibleEntityIds, ["challenger"]);
});

test("explicit viewport admission alone controls whether an owner can consume the panel budget", () => {
  const viewportBounds = { left: 0, top: 0, right: 1000, bottom: 1000 };
  const hiddenActor = projected("hidden", 500, 500, { projectedBodyPx: 80, viewportAdmitted: false, hovered: true, interactionIds: ["edge"] });
  const centre = projected("centre", 520, 500, { projectedBodyPx: .1 });
  const edge = projected("edge", 990, 990, { projectedBodyPx: 12 });
  const result = selectEntityConstellationBudget([hiddenActor, centre, edge], { viewportBounds, maximumPanels: 1 });
  assert.deepEqual(result.visibleEntityIds, ["centre"]);
  assert.equal(result.decisions.find((decision) => decision.entityId === "hidden").reason, "outside-viewport");
  assert.equal(result.decisions.find((decision) => decision.entityId === "edge").reason, "outside-centre", "a hidden interaction endpoint cannot promote its partner");
  const tiny = selectEntityConstellationBudget([projected("tiny", 500, 500, { projectedBodyPx: 0 })], { viewportBounds });
  assert.deepEqual(tiny.visibleEntityIds, ["tiny"], "projected body size is diagnostic and never a zoom gate");
});

test("cluster ownership is deterministic, order independent and locally collision free", () => {
  const ids = Array.from({ length: 24 }, (_, index) => `VG${index + 1}`);
  const forward = assignClusterOwnership(ids), reversed = assignClusterOwnership([...ids].reverse());
  assert.deepEqual(forward, reversed);
  assert.equal(new Set(forward.map((entry) => entry.styleIndex)).size, ids.length);
  assert.equal(new Set(forward.map((entry) => `${entry.accent}|${entry.shape}|${entry.tetherPattern}`)).size, ids.length);
  assert.ok(ENTITY_OWNERSHIP_STYLES.capacity >= ids.length);
  assert.ok(Object.isFrozen(forward) && Object.isFrozen(forward[0]) && Object.isFrozen(forward[0].dash));
});

test("non-conflicting prior ownership survives local cluster membership changes", () => {
  const initial = assignClusterOwnership(["VG1", "VG2", "VG3"]), prior = Object.fromEntries(initial.map((entry) => [entry.entityId, entry]));
  const changed = assignClusterOwnership(["VG1", "VG2", "VG4"], prior), lookup = byId(changed);
  assert.equal(lookup.get("VG1").styleIndex, prior.VG1.styleIndex);
  assert.equal(lookup.get("VG2").styleIndex, prior.VG2.styleIndex);
  assert.notEqual(lookup.get("VG4").styleIndex, lookup.get("VG1").styleIndex);
  resolveEntityConstellations([projected("VG1", 0, 0)], { previousOwnership: prior });
  assert.equal(Object.isFrozen(prior), false, "caller-owned prior state is not frozen or mutated");
});

test("overlapping entities fan away from their projected interaction centre", () => {
  const records = byId(resolveEntityConstellations([projected("A", 100, 100), projected("B", 118, 100)]));
  const left = records.get("A"), right = records.get("B");
  assert.equal(left.clusterId, "A");
  assert.equal(left.clusterSize, 2);
  assert.equal(left.mode, "panel");
  assert.equal(left.placement, "fanned");
  assert.ok(left.anchorOffset.x < 0 && right.anchorOffset.x > 0);
  assert.ok(left.anchor.x < left.body.x && right.anchor.x > right.body.x);
  assert.deepEqual(left.clusterMembers, ["A", "B"]);
});

test("exactly coincident entities receive finite deterministic outward sectors", () => {
  const first = resolveEntityConstellations([projected("B", 50, 60), projected("A", 50, 60)]), second = resolveEntityConstellations([projected("A", 50, 60), projected("B", 50, 60)]);
  assert.deepEqual(first, second);
  const records = byId(first), a = records.get("A"), b = records.get("B");
  for (const value of [a.anchorOffset.x, a.anchorOffset.y, b.anchorOffset.x, b.anchorOffset.y]) assert.ok(Number.isFinite(value));
  assert.ok(Math.abs(a.anchorOffset.x + b.anchorOffset.x) < 1e-9);
  assert.ok(Math.abs(a.anchorOffset.y + b.anchorOffset.y) < 1e-9);
  assert.ok(a.tether.length > 0 && b.tether.length > 0);
});

test("explicit nearby interactions join a cluster without treating equally distant strangers as related", () => {
  const records = byId(resolveEntityConstellations([
    projected("A", 0, 0, { interactionIds: ["B"] }),
    projected("B", 320, 0),
    projected("C", 0, 320)
  ], { overlapPx: 1, interactionClusterPx: 350 }));
  assert.equal(records.get("A").clusterId, records.get("B").clusterId);
  assert.notEqual(records.get("A").clusterId, records.get("C").clusterId);
});

test("density, selection, presentation tier and projected body size all use the same panel surface", () => {
  const dense = byId(resolveEntityConstellations([
    projected("A", 100, 100, { selected: true }),
    projected("B", 103, 100),
    projected("C", 100, 103),
    projected("D", 103, 103)
  ]));
  for (const id of ["A", "B", "C", "D"]) {
    assert.equal(dense.get(id).detailLevel, "panel");
    assert.equal(dense.get(id).mode, "panel");
    assert.equal(dense.get(id).slots.panel.visible, true);
  }
  const distant = byId(resolveEntityConstellations([
    projected("E", 300, 200, { tier: "distant", projectedBodyPx: .1 }),
    projected("F", 700, 200, { tier: "selected", hovered: true, projectedBodyPx: 240 })
  ]));
  for (const id of ["E", "F"]) assert.equal(distant.get(id).detailLevel, "panel");
});

test("explicit viewport admission hides panels while caller channels govern cognition attachments", () => {
  const records = byId(resolveEntityConstellations([
    projected("offscreen", 100, 100, { viewportAdmitted: false, selected: true }),
    projected("selected", 400, 100, { selected: true, visibleChannels: ["identity", "thought", "prediction"] }),
    projected("unselected", 800, 100, { visibleChannels: ["identity", "thought", "prediction"] })
  ]));
  assert.equal(records.has("offscreen"), false);
  assert.equal(records.get("selected").slots.thought.visible, true);
  assert.equal(records.get("selected").slots.prediction.visible, true);
  assert.equal(records.get("unselected").selected, false);
  assert.equal(records.get("unselected").slots.thought.visible, true);
  assert.equal(records.get("unselected").slots.prediction.visible, true);
});

test("panelScale is continuous, deterministic, bounded and scales all panel geometry", () => {
  const options = { isolatedOffsetX: 40, isolatedOffsetY: -20, panelWidthPx: 240, panelHeightPx: 80 };
  const small = resolveEntityConstellations([projected("A", 100, 100, { panelScale: .5, selected: true })], options)[0];
  const large = resolveEntityConstellations([projected("A", 100, 100, { panelScale: 1.25, selected: true })], options)[0];
  assert.equal(small.panelScale, .5);
  assert.equal(large.panelScale, 1.25);
  assert.equal(small.panelDimensions.width, 120);
  assert.equal(large.panelDimensions.width, 300);
  assert.equal(large.slots.expression.x / small.slots.expression.x, 2.5);
  assert.equal(large.anchorOffset.x / small.anchorOffset.x, 2.5);
  assert.equal(resolveEntityConstellations([projected("low", 0, 0, { panelScale: -5 })])[0].panelScale, ENTITY_CONSTELLATION_PANEL_SCALE.minimum);
  assert.equal(resolveEntityConstellations([projected("high", 0, 0, { panelScale: 99 })])[0].panelScale, ENTITY_CONSTELLATION_PANEL_SCALE.maximum);
  assert.deepEqual(resolveEntityConstellations([projected("A", 100, 100, { panelScale: .873 })], options), resolveEntityConstellations([projected("A", 100, 100, { panelScale: .873 })], options));
});

test("focus metadata keeps related neighbours legible and dims unrelated constellations more", () => {
  const records = byId(resolveEntityConstellations([
    projected("A", 100, 100, { selected: true }),
    projected("B", 112, 100),
    projected("C", 600, 400)
  ]));
  assert.equal(records.get("A").opacity, 1);
  assert.ok(records.get("B").opacity < 1);
  assert.ok(records.get("B").opacity > records.get("C").opacity);
  assert.equal(records.get("A").tetherWidth, 3);
  assert.equal(records.get("B").dimmed, true);
  assert.equal(records.get("C").dimmed, true);
});

test("every panel uses one scaled coordinate system with paired cognition attachments", () => {
  const records = byId(resolveEntityConstellations([projected("A", 10, 20, { selected: true }), projected("B", 400, 320, { selected: true })]));
  assert.deepEqual(records.get("A").slots, records.get("B").slots);
  const slots = records.get("A").slots;
  assert.equal(slots.panel.visible, true);
  assert.ok(slots.thought.x < 0 && slots.prediction.x > 0);
  assert.equal(slots.thought.x, -slots.prediction.x);
  assert.equal(slots.thought.y, slots.prediction.y);
  assert.ok(slots.thought.y < slots.identity.y);
  assert.ok(slots.expression.x < slots.identity.x && slots.signal.x > slots.identity.x);
  assert.ok(slots.action.x >= slots.signal.x && slots.action.y > slots.signal.y);
  const a = records.get("A"), anchorMagnitude = Math.hypot(a.anchorOffset.x, a.anchorOffset.y);
  assert.ok(Math.abs(a.fanDirection.x - a.anchorOffset.x / anchorMagnitude) < 1e-12);
  assert.ok(Math.abs(a.fanDirection.y - a.anchorOffset.y / anchorMagnitude) < 1e-12);
  const absolute = (record, slot) => ({ x: record.anchor.x + record.slots[slot].x, y: record.anchor.y + record.slots[slot].y });
  const identityDelta = { x: absolute(records.get("B"), "identity").x - absolute(records.get("A"), "identity").x, y: absolute(records.get("B"), "identity").y - absolute(records.get("A"), "identity").y };
  const thoughtDelta = { x: absolute(records.get("B"), "thought").x - absolute(records.get("A"), "thought").x, y: absolute(records.get("B"), "thought").y - absolute(records.get("A"), "thought").y };
  const predictionDelta = { x: absolute(records.get("B"), "prediction").x - absolute(records.get("A"), "prediction").x, y: absolute(records.get("B"), "prediction").y - absolute(records.get("A"), "prediction").y };
  assert.deepEqual(identityDelta, thoughtDelta);
  assert.deepEqual(identityDelta, predictionDelta);
});

test("visible-channel input only suppresses slots and never changes ownership geometry", () => {
  const ordinary = resolveEntityConstellations([projected("A", 10, 20, { selected: true })])[0];
  const limited = resolveEntityConstellations([projected("A", 10, 20, { selected: true, visibleChannels: ["identity", "signal"] })])[0];
  assert.deepEqual(limited.anchorOffset, ordinary.anchorOffset);
  assert.equal(limited.slots.identity.visible, true);
  assert.equal(limited.slots.signal.visible, true);
  assert.equal(limited.slots.panel.visible, true, "every admitted subset receives the same ownership panel");
  assert.equal(limited.slots.expression.visible, false);
  assert.equal(limited.slots.thought.visible, false);
  assert.equal(limited.slots.prediction.visible, false);
});

test("thought and prediction channels are independently suppressible inside the shared card", () => {
  const thoughtOnly = resolveEntityConstellations([projected("A", 10, 20, { selected: true, visibleChannels: ["identity", "thought"] })])[0];
  const predictionOnly = resolveEntityConstellations([projected("A", 10, 20, { selected: true, visibleChannels: ["identity", "prediction"] })])[0];
  assert.equal(thoughtOnly.slots.panel.visible, true);
  assert.equal(thoughtOnly.slots.thought.visible, true);
  assert.equal(thoughtOnly.slots.prediction.visible, false);
  assert.equal(predictionOnly.slots.panel.visible, true);
  assert.equal(predictionOnly.slots.thought.visible, false);
  assert.equal(predictionOnly.slots.prediction.visible, true);
  assert.deepEqual(thoughtOnly.anchorOffset, predictionOnly.anchorOffset);
});

test("cognition attachment bays remain reserved across channel appearance and disappearance", () => {
  const options = {
    viewportBounds: { left: 0, top: 10, right: 800, bottom: 600 },
    isolatedOffsetX: 0,
    isolatedOffsetY: -200,
    panelWidthPx: 258,
    panelHeightPx: 86,
    slotSizes: { thought: { width: 120, height: 80 }, prediction: { width: 120, height: 80 } }
  };
  const selected = (visibleChannels) => resolveEntityConstellations([
    projected("A", 80, 30, { selected: true, visibleChannels })
  ], options)[0];
  const neither = selected(["identity"]);
  const thought = selected(["identity", "thought"]);
  const prediction = selected(["identity", "prediction"]);
  const both = selected(["identity", "thought", "prediction"]);
  for (const record of [thought, prediction, both]) {
    assert.deepEqual(record.footprint, neither.footprint);
    assert.deepEqual(record.anchor, neither.anchor);
    assert.deepEqual(record.anchorOffset, neither.anchorOffset);
    assert.deepEqual(record.panelDimensions, neither.panelDimensions);
  }
  assert.equal(neither.slots.thought.visible, false);
  assert.equal(neither.slots.prediction.visible, false);
  assert.equal(thought.slots.thought.visible, true);
  assert.equal(prediction.slots.prediction.visible, true);
  assert.equal(both.slots.thought.visible && both.slots.prediction.visible, true);

  const unselected = resolveEntityConstellations([
    projected("A", 80, 30, { visibleChannels: ["identity", "thought", "prediction"] })
  ], options)[0];
  assert.equal(unselected.slots.thought.visible, true);
  assert.equal(unselected.slots.prediction.visible, true);
  assert.deepEqual(unselected.footprint, neither.footprint, "unselected cognition uses the same stable attachment footprint");
});

test("viewport clamping uses each item's continuously scaled panel footprint", () => {
  const bounds = { left: 380, top: 12, right: 1280, bottom: 788 };
  const record = resolveEntityConstellations([projected("A", 400, 30, { panelScale: 1.25, visibleChannels: ["identity"] })], {
    viewportBounds: bounds,
    isolatedOffsetX: -200,
    isolatedOffsetY: -200,
    panelWidthPx: 240,
    panelHeightPx: 80
  })[0];
  assert.equal(record.panelDimensions.width, 300);
  assert.ok(record.anchor.x + record.footprint.left >= bounds.left - 1e-9);
  assert.ok(record.anchor.x + record.footprint.right <= bounds.right + 1e-9);
  assert.ok(record.anchor.y + record.footprint.top >= bounds.top - 1e-9);
  assert.ok(record.anchor.y + record.footprint.bottom <= bounds.bottom + 1e-9);
  assert.equal(record.anchorOffset.x, record.anchor.x - record.body.x);
  assert.equal(record.anchorOffset.y, record.anchor.y - record.body.y);
  assert.ok(Number.isFinite(record.tether.length) && record.tether.length > 0);
});

test("selected thought and prediction attachment extents participate in clamping and collision", () => {
  const bounds = { left: 0, top: 10, right: 800, bottom: 600 };
  const record = resolveEntityConstellations([projected("A", 40, 30, { selected: true, projectedBodyPx: 70 })], {
    viewportBounds: bounds,
    isolatedOffsetX: 0,
    isolatedOffsetY: -200,
    panelWidthPx: 258,
    panelHeightPx: 86,
    slotSizes: { thought: { width: 120, height: 80 }, prediction: { width: 120, height: 80 } }
  })[0];
  assert.ok(record.footprint.top < record.panelDimensions.centerY - record.panelDimensions.height / 2, "the upper attachments extend beyond the black panel");
  assert.ok(record.anchor.y + record.footprint.top >= bounds.top - 1e-6);
  assert.ok(record.anchor.y + record.footprint.bottom <= bounds.bottom + 1e-6);

  const publicOnly = resolveEntityConstellations([
    projected("P1", 100, 100, { visibleChannels: ["identity"] }),
    projected("P2", 100, 240, { visibleChannels: ["identity"] })
  ], { overlapPx: 1 });
  const withAttachments = resolveEntityConstellations([
    projected("S1", 100, 100, { selected: true, visibleChannels: ["identity", "thought", "prediction"] }),
    projected("S2", 100, 240, { selected: true, visibleChannels: ["identity", "thought", "prediction"] })
  ], { overlapPx: 1 });
  assert.equal(publicOnly[0].clusterSize, 1);
  assert.equal(withAttachments[0].clusterSize, 2, "visible attachment bounds must take part in overlap grouping");
});

test("responsive renderer slot overrides also drive relation and ownership coordinates", () => {
  const [record] = resolveEntityConstellations([projected("A", 200, 200, { panelScale: .5, selected: true, projectedBodyPx: 70, visibleChannels: ["identity", "expression", "signal", "thought", "prediction"] })], {
    slotOverrides: { panel: { panel: { x: 0, y: -72 }, expression: { x: -121, y: 0 }, signal: { x: 119, y: 0 }, thought: { x: -82, y: -111 }, prediction: { x: 82, y: -111 } } }
  });
  assert.deepEqual({ x: record.slots.panel.x, y: record.slots.panel.y }, { x: 0, y: -36 });
  assert.deepEqual({ x: record.slots.expression.x, y: record.slots.expression.y }, { x: -60.5, y: 0 });
  assert.deepEqual({ x: record.slots.signal.x, y: record.slots.signal.y }, { x: 59.5, y: 0 });
  assert.deepEqual({ x: record.slots.thought.x, y: record.slots.thought.y }, { x: -41, y: -55.5 });
  assert.deepEqual({ x: record.slots.prediction.x, y: record.slots.prediction.y }, { x: 41, y: -55.5 });
});

test("selected instruments and unselected rails can share one collision pass", () => {
  const publicProfile = {
    detailLevel: "panel",
    panelWidthPx: 258,
    panelHeightPx: 86,
    panelCenterX: 0,
    panelCenterY: 0,
    slots: { panel: { x: 0, y: 0 }, expression: { x: -90, y: 0 }, signal: { x: 90, y: 0 } }
  };
  const instrumentProfile = {
    detailLevel: "instrument",
    panelWidthPx: 420,
    panelHeightPx: 330,
    panelCenterX: 0,
    panelCenterY: 0,
    slots: { panel: { x: 0, y: 0 }, expression: { x: -160, y: -120 }, signal: { x: 160, y: -120 }, thought: { x: -65, y: -225 }, prediction: { x: 65, y: -225 } },
    slotSizes: { thought: { width: 116, height: 91 }, prediction: { width: 116, height: 91 } },
    attachmentPaddingPx: 4
  };
  const records = byId(resolveEntityConstellations([
    projected("selected", 300, 300, { selected: true, visibleChannels: ["identity", "expression", "signal", "thought", "prediction"], layoutProfile: instrumentProfile }),
    projected("public", 720, 300, { visibleChannels: ["identity", "expression", "signal"], layoutProfile: publicProfile })
  ], { overlapPx: 1 }));

  assert.equal(records.get("selected").detailLevel, "instrument");
  assert.equal(records.get("selected").panelDimensions.width, 420);
  assert.equal(records.get("selected").panelDimensions.height, 330);
  assert.equal(records.get("selected").slots.expression.x, -160);
  assert.ok(records.get("selected").footprint.top < -165, "private attachment bays extend the selected collision footprint");
  assert.equal(records.get("public").detailLevel, "panel");
  assert.equal(records.get("public").panelDimensions.width, 258);
  assert.equal(records.get("public").panelDimensions.height, 86);
  assert.equal(records.get("public").slots.expression.x, -90);
});

test("relational arrows are explicit, directional and inherit actor ownership style", () => {
  const records = byId(resolveEntityConstellations([projected("A", 20, 100), projected("B", 320, 100)]));
  const arrow = relationalArrow(records.get("A"), records.get("B"), { kind: "courtship", startSlot: "action" });
  assert.equal(arrow.actorId, "A");
  assert.equal(arrow.targetId, "B");
  assert.equal(arrow.kind, "courtship");
  assert.ok(arrow.direction.x > 0);
  assert.ok(arrow.end.x > arrow.start.x);
  assert.deepEqual(arrow.head.tip, arrow.end);
  assert.equal(arrow.style.accent, records.get("A").style.accent);
  assert.equal(relationalArrow(records.get("A"), records.get("A")), null);
});

test("resolver does not mutate inputs and rejects duplicate or invalid projected records", () => {
  const items = [projected("A", 1, 2, { interactionIds: ["B"], visibleChannels: ["identity", "thought"] }), projected("B", 3, 4)];
  const before = structuredClone(items), result = resolveEntityConstellations(items);
  assert.deepEqual(items, before);
  assert.ok(Object.isFrozen(result) && Object.isFrozen(result[0]) && Object.isFrozen(result[0].slots));
  assert.throws(() => resolveEntityConstellations([projected("A", 0, 0), projected("A", 1, 1)]), /Duplicate/);
  assert.throws(() => resolveEntityConstellations([{ entityId: "A", screenX: NaN, screenY: 0 }]), /finite projected/);
});
