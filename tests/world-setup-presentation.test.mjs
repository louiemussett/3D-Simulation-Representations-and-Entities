import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("physical-span presets expose the exact custom-span reference values", () => {
  for (const label of ["Compact — 90", "Medium — 150", "Standard — 220", "Vast — 300"]) assert.match(html, new RegExp(label));
  assert.match(html, /Custom physical span \(optional\)[\s\S]*Enter world units\. Presets are 90, 150, 220 and 300/);
  assert.match(app, /Custom · \$\{setup\.size\} world units \(overrides \$\{spanName\} · \$\{presetSpan\}\)/);
  assert.match(app, /\$\{spanName\} · \$\{setup\.size\} world units/);
});
