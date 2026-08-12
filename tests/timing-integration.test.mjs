import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(path, import.meta.url), "utf8");

test("application weather and reproduction use the shared timing models", async () => {
  const source = await read("../src/app.js");
  assert.match(source, /seasonForAbsoluteDay\(sim\.day, worldSetup\.startSeason\)/);
  assert.match(source, /currentReproductiveStatus\(a\)/);
  assert.match(source, /updateReproductiveEnvironment/);
  assert.doesNotMatch(source, /\(\(sim\.day - 1\) % 120\)/);
  assert.doesNotMatch(source, /seasonMods\[sim\.season\]\.breed/);
  assert.doesNotMatch(source, /speciesId === "grazer" \? 28 : 36/);
});

test("world schema five rejects old biological timing saves without deleting them", async () => {
  const source = await read("../src/app.js");
  assert.match(source, /const WORLD_SCHEMA = 5/);
  assert.match(source, /365-day biological timing model requires schema/);
  assert.match(source, /Incompatible previous world/);
  assert.match(source, /incompatible · new 365-day world required/);
});

test("time controls and documentation describe the 365-day calendar", async () => {
  const [html, readme, development] = await Promise.all([read("../index.html"), read("../README.md"), read("../DEVELOPMENT.md")]);
  assert.match(html, /value="43200">30 days/);
  assert.match(html, /value="525600">1 ecological year \(365 days\)/);
  assert.match(readme, /Spring 92, Summer 92, Autumn 91 and Winter 90/);
  assert.match(development, /World schema 5 deliberately rejects older timing-model saves/);
});

test("new worlds can load an entered seed at an exact absolute day", async () => {
  const [html, source] = await Promise.all([read("../index.html"), read("../src/app.js")]);
  assert.match(html, /id="new-world-seed"/);
  assert.match(html, /id="new-world-day"[^>]*min="1"/);
  assert.match(source, /loadSeedWorldAsync\(seedDate\.seed, setup, request, \{ targetDay: seedDate\.day \}\)/);
  assert.match(source, /targetMinute = \(targetDay - 1\) \* MINUTES_PER_DAY/);
  assert.match(source, /phase: "history"/);
});
