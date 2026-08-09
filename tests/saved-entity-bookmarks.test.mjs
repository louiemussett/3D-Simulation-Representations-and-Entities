import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");

test("saved entities are scoped to a persisted save rather than regenerated from a seed", () => {
  assert.match(app, /function entityBookmarkSaveKey\(\).*?`slot:\$\{activeSaveSlotName\}`.*?"resume"/s);
  assert.match(app, /const entry = \{ id: a\.id, seed: sim\.seed, saveKey, saveLabel:/);
  assert.match(app, /async function openEntityBookmark\(item\)[\s\S]*?readSnapshot\(saveKey\)/);
  assert.doesNotMatch(app, /favouriteList\.addEventListener[\s\S]{0,900}loadSeedWorld\(item\.seed\)/);
});

test("opening a bookmark resolves current remains and close lineage without changing time", () => {
  assert.match(app, /function entityBookmarkTarget\(id\)[\s\S]*?corpse\.sourceId === id/);
  assert.match(app, /record\.ancestorDepths[\s\S]*?generationLabel\(ancestor\.depth, "ancestor"\)/);
  assert.match(app, /relative\.ancestorDepths\?\.\[id\][\s\S]*?generationLabel\(descendant\.depth, "descendant"\)/);
  assert.match(app, /function focusEntityBookmark\(target, originalId\)[\s\S]*?controls\.target\.set/);
});

test("deleting a named save removes only bookmarks belonging to that save", () => {
  assert.match(app, /deleteNamedSlot\(name\)[\s\S]*?item\.saveKey !== saveKey/);
});
