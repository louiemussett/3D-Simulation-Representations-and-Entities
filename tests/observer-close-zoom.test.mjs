import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

test("observer camera supports close inspection and reset preserves that range", () => {
  assert.match(source, /const OBSERVER_MIN_DISTANCE = \.55/);
  assert.equal((source.match(/controls\.minDistance = OBSERVER_MIN_DISTANCE/g) || []).length, 2);
  assert.doesNotMatch(source, /controls\.minDistance = 6/);
  assert.match(source, /controls\.zoomToCursor = true/);
  assert.match(source, /observerCameraClearance\(controls\.getDistance\(\)\)/);
});
