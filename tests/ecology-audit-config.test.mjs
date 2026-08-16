import test from "node:test";
import assert from "node:assert/strict";
import { compatibleEcologyCheckpoint, parseEcologyAuditArguments } from "../src/ecology-audit-config.js";

test("ecology audit arguments select presets, overrides and unique seeds", () => {
  const options = parseEcologyAuditArguments(["--preset", "population", "--minutes", "90", "--seeds", "1,2,1", "--chunk", "10", "--workers", "3", "--setup", "{\"carnivores\":2}", "--no-resume"], "C:/audit");
  assert.equal(options.preset, "population"); assert.equal(options.minutes, 90); assert.deepEqual(options.seeds, [1, 2]); assert.equal(options.chunk, 10); assert.equal(options.workers, 3); assert.deepEqual(options.setup, { carnivores: 2 }); assert.equal(options.resume, false);
});

test("ecology audit arguments reject invalid values", () => {
  assert.throws(() => parseEcologyAuditArguments(["--minutes", "0"]));
  assert.throws(() => parseEcologyAuditArguments(["--seeds", "abc"]));
  assert.throws(() => parseEcologyAuditArguments(["--workers", "0"]));
  assert.throws(() => parseEcologyAuditArguments(["--setup", "[]"]));
  assert.throws(() => parseEcologyAuditArguments(["--observation-minutes", "30"]));
});

test("ecology audit defaults to balanced pace and supports detailed pace", () => {
  assert.equal(parseEcologyAuditArguments([], "C:/audit").observationMinutes, 180);
  assert.equal(parseEcologyAuditArguments(["--observation-minutes", "360"], "C:/audit").observationMinutes, 360);
});

test("resume accepts only checkpoints with matching duration and setup", () => {
  const report = { parameters: { minutes: 60, setup: { carnivores: 2 } } }, options = { minutes: 60, setup: { carnivores: 2 } };
  assert.equal(compatibleEcologyCheckpoint(report, options), true);
  assert.equal(compatibleEcologyCheckpoint(report, { ...options, minutes: 61 }), false);
});
