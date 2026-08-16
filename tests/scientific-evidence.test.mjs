import test from "node:test";
import assert from "node:assert/strict";
import { evidenceReadiness, HUMAN_PERCEPTION_REFERENCE, scientificDatum, validateScientificDatum } from "../src/scientific-evidence.js";

test("scientific values retain units evidence confidence and sources", () => {
  assert.equal(validateScientificDatum(HUMAN_PERCEPTION_REFERENCE.temporalResolution).length, 0);
  assert.equal(HUMAN_PERCEPTION_REFERENCE.simulated, false);
});

test("readiness refuses unsourced exact-species claims", () => {
  const datum = scientificDatum({ value: 42, units: "Hz", evidenceGrade: "measured-exact-species", confidence: .8 });
  const readiness = evidenceReadiness([datum]);
  assert.equal(readiness.complete, false);
  assert.match(readiness.gaps[0], /source ID/);
});
