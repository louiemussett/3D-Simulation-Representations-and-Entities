import test from "node:test";
import assert from "node:assert/strict";
import { ENTITY_CONSTELLATION_CARD_GEOMETRY, ENTITY_INSTRUMENT_PANEL_GEOMETRY, entityConstellationCardProfile, entityConstellationSideCells } from "../src/entity-constellation-card-layout.js";

const closeTo = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} was not within ${tolerance} of ${expected}`);
const contained = (item, cell) => item.x - item.width / 2 >= cell.left - 1e-6
  && item.x + item.width / 2 <= cell.right + 1e-6
  && item.y - item.height / 2 >= cell.top - 1e-6
  && item.y + item.height / 2 <= cell.bottom + 1e-6;

test("summary face and outward cue use the exact centres of their asymmetric authored bays", () => {
  const result = entityConstellationSideCells({
    detailLevel: "summary",
    panelCenter: { x: 0, y: -5 },
    screenSize: { width: 314, height: 82 },
    iconScale: 1
  });
  closeTo(result.expression.x, -116);
  closeTo(result.outward.x, 105);
  closeTo(result.expression.y, -5);
  closeTo(result.outward.y, -5);
  closeTo(result.expressionCell.width, 82);
  closeTo(result.expressionCell.height, 82);
  closeTo(result.outwardCell.width, 104);
  closeTo(result.outwardCell.height, 82);
  closeTo(result.expression.width, 66);
  closeTo(result.expression.height, 66);
  closeTo(result.outward.width, 92);
  closeTo(result.outward.height, 68);
  assert.equal(contained(result.expression, result.expressionCell), true);
  assert.equal(contained(result.outward, result.outwardCell), true);
  closeTo(result.outward.width / result.outward.height, 92 / 68);
});

test("expanded side cells follow the lower rail instead of obsolete fixed offsets", () => {
  const result = entityConstellationSideCells({
    detailLevel: "expanded",
    panelCenter: { x: 0, y: -54 },
    screenSize: { width: 304, height: 203 },
    iconScale: 1
  });
  closeTo(result.expression.x, -106.08333333333333);
  closeTo(result.outward.x, 106.08333333333333);
  closeTo(result.expression.y, 7.05859375);
  closeTo(result.outward.y, 7.05859375);
  assert.equal(contained(result.expression, result.expressionCell), true);
  assert.equal(contained(result.outward, result.outwardCell), true);
});

test("large icon settings are fitted inside both side compartments without distortion", () => {
  for (const detailLevel of ["summary", "expanded"]) {
    const screenSize = detailLevel === "summary" ? { width: 314, height: 82 } : { width: 304, height: 203 };
    const result = entityConstellationSideCells({ detailLevel, screenSize, iconScale: 5 });
    assert.equal(contained(result.expression, result.expressionCell), true);
    assert.equal(contained(result.outward, result.outwardCell), true);
    assert.equal(contained(result.action, result.outwardCell), true);
    closeTo(result.expression.width, result.expression.height);
    closeTo(result.outward.width / result.outward.height, detailLevel === "summary" ? 92 / 68 : 64 / 52);
    if (detailLevel === "summary") closeTo(result.action.width / result.action.height, 92 / 68);
    else closeTo(result.action.width, result.action.height);
    assert.ok(result.expression.fit < 1 && result.outward.fit < 1 && result.action.fit < 1);
  }
});

test("card geometry remains immutable and preserves a useful centre identity bay", () => {
  assert.equal(Object.isFrozen(ENTITY_CONSTELLATION_CARD_GEOMETRY), true);
  assert.equal(Object.isFrozen(ENTITY_CONSTELLATION_CARD_GEOMETRY.summary.expressionCell), true);
  assert.equal(ENTITY_CONSTELLATION_CARD_GEOMETRY.summary.dividers.right - ENTITY_CONSTELLATION_CARD_GEOMETRY.summary.dividers.left, 256);
  assert.equal(ENTITY_CONSTELLATION_CARD_GEOMETRY.expanded.expressionCell.right - ENTITY_CONSTELLATION_CARD_GEOMETRY.expanded.expressionCell.left, 92);
  assert.equal(ENTITY_CONSTELLATION_CARD_GEOMETRY.summary.expressionCell.right - ENTITY_CONSTELLATION_CARD_GEOMETRY.summary.expressionCell.left, 164);
  assert.equal(ENTITY_CONSTELLATION_CARD_GEOMETRY.summary.outwardCell.right - ENTITY_CONSTELLATION_CARD_GEOMETRY.summary.outwardCell.left, 208);
  assert.equal(ENTITY_CONSTELLATION_CARD_GEOMETRY.expanded.thoughtCell.right <= ENTITY_CONSTELLATION_CARD_GEOMETRY.expanded.predictionCell.left, true);
});

test("default profile preserves the legacy disclosures and the canonical asymmetric public rail", () => {
  const profile = entityConstellationCardProfile();
  closeTo(profile.expanded.screenSize.width, 304);
  closeTo(profile.expanded.screenSize.height, 203);
  closeTo(profile.summary.screenSize.width, 314);
  closeTo(profile.summary.screenSize.height, 82);
  closeTo(profile.compact.screenSize.width, 134);
  closeTo(profile.compact.screenSize.height, 29);
  assert.equal(Object.isFrozen(profile), true);
  assert.equal(Object.isFrozen(profile.expanded.thoughtCell), true);
});

test("whole-panel scaling preserves the authored 82/128/104 bay proportions", () => {
  const ordinary = entityConstellationCardProfile();
  const enlarged = entityConstellationCardProfile({ panelScale: 1.5 });
  closeTo(ordinary.panel.screenSize.width, 314);
  closeTo(ordinary.panel.screenSize.height, 82);
  closeTo(ordinary.panel.sideCells.expressionCell.width, 82);
  closeTo(ordinary.panel.sideCells.outwardCell.width, 104);
  closeTo(ordinary.panel.sideCells.outwardCell.left - ordinary.panel.sideCells.expressionCell.right, 128);
  closeTo(enlarged.panel.screenSize.width, 471);
  closeTo(enlarged.panel.screenSize.height, 123);
  closeTo(enlarged.panel.sideCells.expressionCell.width, 123);
  closeTo(enlarged.panel.sideCells.outwardCell.width, 156);
  closeTo(enlarged.panel.sideCells.outwardCell.left - enlarged.panel.sideCells.expressionCell.right, 192);
});

test("paired private bubbles never overlap or escape the expanded card at supported child scales", () => {
  for (const thoughtScale of [.75, 1, 1.25, 2]) for (const predictionScale of [.75, 1, 1.25, 2]) {
    const profile = entityConstellationCardProfile({ thoughtScale, predictionScale });
    const { expanded } = profile;
    assert.equal(contained(expanded.thought, expanded.thoughtCell), true);
    assert.equal(contained(expanded.prediction, expanded.predictionCell), true);
    assert.equal(contained(expanded.thought, expanded.panel), true);
    assert.equal(contained(expanded.prediction, expanded.panel), true);
    assert.ok(expanded.thoughtCell.right <= expanded.predictionCell.left);
    assert.ok(expanded.thought.x + expanded.thought.width / 2 <= expanded.prediction.x - expanded.prediction.width / 2);
    closeTo(expanded.thought.width / expanded.thought.height, 116 / 91);
    closeTo(expanded.prediction.width / expanded.prediction.height, 116 / 91);
  }
});

test("private bubble settings grow only the upper row and keep the public rail anchored", () => {
  const small = entityConstellationCardProfile({ thoughtScale: .75, predictionScale: .75 });
  const large = entityConstellationCardProfile({ thoughtScale: 2, predictionScale: 2 });
  assert.ok(large.expanded.screenSize.width > small.expanded.screenSize.width);
  assert.ok(large.expanded.screenSize.height > small.expanded.screenSize.height);
  assert.deepEqual(large.expanded.lowerRail, small.expanded.lowerRail);
  assert.deepEqual(large.expanded.sideCells, small.expanded.sideCells);
  closeTo(large.expanded.panel.bottom, small.expanded.panel.bottom);
  assert.ok(large.expanded.panel.top < small.expanded.panel.top);
});

test("profile geometry is settings-only, deterministic and clamps every display scale", () => {
  const input = { panelScale: 1.2, identityScale: 1.3, expressionScale: .9, publicCueScale: 1.4, thoughtScale: 1.6, predictionScale: 1.1 };
  assert.deepEqual(entityConstellationCardProfile({ ...input, predictionVisible: false }), entityConstellationCardProfile({ ...input, predictionVisible: true }));
  const bounded = entityConstellationCardProfile({ panelScale: .1, identityScale: 9, expressionScale: 9, publicCueScale: 9, thoughtScale: .1, predictionScale: 9 });
  assert.deepEqual(bounded.scales, { panel: .6, identity: 1.5, expression: 2, publicCue: 2, thought: .75, prediction: 2 });
});

test("identity scaling expands the centre bay without changing either semantic side size", () => {
  const ordinary = entityConstellationCardProfile({ identityScale: .75 });
  const large = entityConstellationCardProfile({ identityScale: 1.5 });
  assert.ok(large.summary.screenSize.width > ordinary.summary.screenSize.width);
  assert.ok(large.expanded.screenSize.width > ordinary.expanded.screenSize.width);
  closeTo(large.summary.sideCells.expression.width, ordinary.summary.sideCells.expression.width);
  closeTo(large.summary.sideCells.expression.height, ordinary.summary.sideCells.expression.height);
  closeTo(large.summary.sideCells.outward.width, ordinary.summary.sideCells.outward.width);
  closeTo(large.summary.sideCells.outward.height, ordinary.summary.sideCells.outward.height);
});

test("expression and public-cue scales are independently applied inside side cells", () => {
  const expressionLarge = entityConstellationSideCells({ detailLevel: "summary", screenSize: { width: 420, height: 150 }, iconScale: 1, expressionScale: 2, publicCueScale: .75 });
  const cueLarge = entityConstellationSideCells({ detailLevel: "summary", screenSize: { width: 420, height: 150 }, iconScale: 1, expressionScale: .75, publicCueScale: 2 });
  assert.ok(expressionLarge.expression.width > cueLarge.expression.width);
  assert.ok(cueLarge.outward.width > expressionLarge.outward.width);
  assert.ok(cueLarge.action.width > expressionLarge.action.width);
  for (const result of [expressionLarge, cueLarge]) {
    assert.equal(contained(result.expression, result.expressionCell), true);
    assert.equal(contained(result.outward, result.outwardCell), true);
    assert.equal(contained(result.action, result.outwardCell), true);
  }
});

test("one thick public panel owns every distance scale", () => {
  const profile = entityConstellationCardProfile();
  assert.equal(profile.panel.detailLevel, "panel");
  assert.deepEqual(profile.panel.screenSize, profile.summary.screenSize);
  assert.deepEqual(profile.panel.sideCells, profile.summary.sideCells);
  assert.ok(profile.panel.thought.y < profile.panel.panel.top);
  assert.ok(profile.panel.prediction.y < profile.panel.panel.top);
  assert.ok(profile.panel.thought.x < profile.panel.prediction.x);
});

test("private attachment settings never resize the thick public panel", () => {
  const small = entityConstellationCardProfile({ thoughtScale: .75, predictionScale: .75 });
  const large = entityConstellationCardProfile({ thoughtScale: 2, predictionScale: 2 });
  assert.deepEqual(large.panel.screenSize, small.panel.screenSize);
  assert.deepEqual(large.panel.panel, small.panel.panel);
  assert.ok(large.panel.selectedFootprint.height > small.panel.selectedFootprint.height);
  assert.ok(large.panel.selectedFootprint.width > small.panel.selectedFootprint.width);
});

test("selected instrument is one fixed root with the required vertical hierarchy", () => {
  const { instrument } = entityConstellationCardProfile();
  assert.equal(instrument.detailLevel, "instrument");
  closeTo(instrument.screenSize.width, ENTITY_INSTRUMENT_PANEL_GEOMETRY.width);
  closeTo(instrument.screenSize.height, 312);
  assert.deepEqual(instrument.root, instrument.panel);
  assert.deepEqual(instrument.publicRail, instrument.identityBand);
  closeTo(instrument.identityBand.top, instrument.panel.top);
  closeTo(instrument.identityBand.bottom, instrument.healthBand.top);
  closeTo(instrument.healthBand.bottom, instrument.decisionBand.top);
  closeTo(instrument.decisionBand.bottom, instrument.physiologyBand.top);
  closeTo(instrument.physiologyBand.bottom, instrument.panel.bottom);
  closeTo(instrument.healthBand.left, instrument.panel.left);
  closeTo(instrument.healthBand.right, instrument.panel.right);
  closeTo(instrument.decisionBand.left, instrument.panel.left);
  closeTo(instrument.decisionBand.right, instrument.panel.right);
  assert.ok(instrument.metabolicCell.right < instrument.performanceCell.left);
  assert.equal(instrument.metabolic.rows.length, 4);
  assert.equal(instrument.performance.rows.length, 4);
  assert.equal(Object.isFrozen(instrument), true);
  assert.equal(Object.isFrozen(instrument.metabolic.rows), true);
});

test("unselected public rail is unaffected by selected-instrument display settings", () => {
  const ordinary = entityConstellationCardProfile();
  const altered = entityConstellationCardProfile({
    healthScale: 2,
    physiologyScale: 2,
    physiologyTextScale: 1.5,
    healthVisible: false,
    decisionContextVisible: false,
    metabolicVisible: false
  });
  assert.deepEqual(altered.panel, ordinary.panel);
  assert.deepEqual(altered.summary, ordinary.summary);
  assert.notDeepEqual(altered.instrument, ordinary.instrument);
});

test("live animal content cannot resize the selected instrument", () => {
  const settings = { panelScale: 1.1, physiologyScale: 1.25, physiologyTextScale: 1.1, healthScale: .9 };
  const before = entityConstellationCardProfile({
    ...settings,
    currentHealth: 100,
    immediateConcern: "seeking water",
    forecastEffect: "favours water",
    pregnancyCount: 1
  });
  const after = entityConstellationCardProfile({
    ...settings,
    currentHealth: 3,
    immediateConcern: "emergency food acquisition",
    forecastEffect: "no decision change",
    pregnancyCount: 4,
    thoughtVisible: false,
    predictionVisible: false
  });
  assert.deepEqual(after, before);
});

test("saved section settings deterministically remove bands and let one physiology column span the root", () => {
  const result = entityConstellationCardProfile({
    healthVisible: false,
    decisionContextVisible: false,
    performanceVisible: false,
    metabolicVisible: true
  }).instrument;
  assert.equal(result.healthBand, null);
  assert.equal(result.decisionBand, null);
  assert.equal(result.performanceCell, null);
  assert.equal(result.performance, null);
  assert.ok(result.metabolicCell);
  closeTo(result.metabolicCell.left, result.physiologyBand.left + 8);
  closeTo(result.metabolicCell.right, result.physiologyBand.right - 8);
  assert.deepEqual(result.visibleSections, { health: false, decision: false, metabolic: true, performance: false });
  closeTo(result.screenSize.height, ENTITY_INSTRUMENT_PANEL_GEOMETRY.identityHeight + ENTITY_INSTRUMENT_PANEL_GEOMETRY.physiologyHeight);
});

test("transparent attachments are selected-only slots outside the root and never resize it", () => {
  const small = entityConstellationCardProfile({ thoughtScale: .75, predictionScale: .75 }).instrument;
  const large = entityConstellationCardProfile({ thoughtScale: 2, predictionScale: 2 }).instrument;
  assert.deepEqual(large.panel, small.panel);
  assert.deepEqual(large.screenSize, small.screenSize);
  assert.ok(small.thought.y < small.panel.top);
  assert.ok(small.prediction.y < small.panel.top);
  assert.ok(small.thought.x + small.thought.width / 2 < small.prediction.x - small.prediction.width / 2);
  assert.ok(large.selectedFootprint.width > small.selectedFootprint.width);
  assert.ok(large.selectedFootprint.height > small.selectedFootprint.height);
  closeTo(small.attachmentTargets.thought.y, small.panel.top);
  closeTo(small.attachmentTargets.prediction.y, small.panel.top);
  assert.ok(small.attachmentTargets.thought.x < small.attachmentTargets.prediction.x);
});

test("settings-disabled private channels release their invisible attachment footprint", () => {
  const complete = entityConstellationCardProfile().instrument;
  const thoughtOnly = entityConstellationCardProfile({ forecastAttachmentEnabled: false }).instrument;
  const neither = entityConstellationCardProfile({ thoughtAttachmentEnabled: false, forecastAttachmentEnabled: false }).instrument;
  assert.deepEqual(thoughtOnly.panel, complete.panel);
  assert.equal(thoughtOnly.prediction.width, 0);
  assert.ok(thoughtOnly.thought.width > 0);
  assert.ok(thoughtOnly.attachmentBounds.width < complete.attachmentBounds.width);
  assert.equal(neither.thought.width, 0);
  assert.equal(neither.prediction.width, 0);
  assert.deepEqual(neither.selectedFootprint, neither.panel);
});
