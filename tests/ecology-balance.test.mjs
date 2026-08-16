import test from "node:test";
import assert from "node:assert/strict";
import { ecologyPreset, initialStomachPercent } from "../src/ecology-balance.js";

test("initial stomach ranges are deterministic and species appropriate", () => {
  assert.equal(initialStomachPercent("hunter", "adult", 0), 58);
  assert.equal(initialStomachPercent("hunter", "adult", 1), 82);
  assert.equal(initialStomachPercent("grazer", "adult", 0), 45);
  assert.equal(initialStomachPercent("grazer", "adult", 1), 70);
  assert.equal(initialStomachPercent("grazer", "dependent", .5), 80);
});

test("ecology presets expose the agreed experimental horizons", () => {
  assert.deepEqual(ecologyPreset("opening"), { name: "opening", seeds: 20, minutes: 60 });
  assert.equal(ecologyPreset("population").minutes, 43200);
  assert.equal(ecologyPreset("generational").minutes, 1051200);
  assert.throws(() => ecologyPreset("unknown"));
});
