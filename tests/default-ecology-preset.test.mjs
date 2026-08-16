import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const index = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("startup selects only the updated founder ecology preset", () => {
  assert.match(app, /const DEFAULT_ECOLOGY_PRESET = "updated-originals"/);
  assert.match(app, /ecologyPreset: DEFAULT_ECOLOGY_PRESET/);
  assert.match(index, /option value="updated-originals" selected/);
  assert.doesNotMatch(index, /option value="compact" selected/);
});
