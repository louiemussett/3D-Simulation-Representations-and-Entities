import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS, loadPersonalSpaceOverlaySettings, normalizePersonalSpaceOverlaySettings, pressureChannelsForState, savePersonalSpaceOverlaySettings } from "../src/personal-space-overlay-settings.js";

test("personal-space overlay settings normalize unsafe stored values", () => {
  const settings = normalizePersonalSpaceOverlaySettings({ scope: "invalid", relationshipMode: "several", opacity: 500, maximumEntities: -3, truthVsPerceived: true });
  assert.equal(settings.scope, "selected");
  assert.equal(settings.relationshipMode, "several");
  assert.equal(settings.opacity, 100);
  assert.equal(settings.maximumEntities, 1);
  assert.equal(settings.truthVsPerceived, true);
});

test("personal-space overlay settings persist independently of world state", () => {
  const values = new Map(), storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  savePersonalSpaceOverlaySettings(storage, { ...DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS, enabled: true, scope: "nearby", maximumEntities: 9 });
  assert.deepEqual(loadPersonalSpaceOverlaySettings(storage), { ...DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS, enabled: true, scope: "nearby", maximumEntities: 9 });
});

test("pressure channel filters do not change authoritative state", () => {
  const state = Object.freeze({ threatPressure: .8, crowdingPressure: .4, attractionPressure: .6, affiliationPressure: .5, carePressure: .2, relationshipClass: "courtship-mate" });
  const channels = pressureChannelsForState(state, { ...DEFAULT_PERSONAL_SPACE_OVERLAY_SETTINGS, threatPressure: false });
  assert.equal(channels.threat, 0);
  assert.equal(channels.avoidance, .4);
  assert.equal(channels.courtship, .6);
  assert.equal(state.threatPressure, .8);
});
