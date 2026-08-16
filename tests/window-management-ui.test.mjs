import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [html, app, css, worldCodec] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("src/app.js", root), "utf8"),
  readFile(new URL("src/styles.css", root), "utf8"),
  readFile(new URL("src/persistence/world-codec.js", root), "utf8")
]);

test("the in-game Escape menu is distinct from the startup menu and can recover every principal window", () => {
  assert.match(html, /id="game-menu"/);
  assert.match(html, /id="escape-menu"[^>]*role="dialog"[^>]*aria-modal="true"/);
  assert.match(html, /id="escape-window-list"/);
  for (const id of ["observer", "selection", "laboratory", "reality", "settings", "new-world", "showcase", "cinema"]) {
    assert.match(html, new RegExp(`data-window-id="${id}"`), id);
  }
  for (const id of ["observer", "selection", "laboratory"]) assert.match(html, new RegExp(`data-close-window="${id}"`), id);
  assert.match(app, /openEscapeMenu\(\)/);
  assert.match(app, /escapeMenuSession = \{ wasRunning: running, movieWasPaused: movieState\.paused/);
  assert.match(app, /setRunning\(session\.wasRunning\)/);
  assert.doesNotMatch(app, /movieState\.active && event\.code === "Escape"/);
  assert.match(html, /id="escape-save-exit"[^>]*>Save and exit to main menu<\/button>/);
  for (const id of ["escape-save-choice", "escape-save-existing", "escape-save-new-name", "escape-save-choice-confirm"]) assert.match(html, new RegExp(`id="${id}"`));
  for (const mode of ["existing", "quick", "new"]) assert.match(html, new RegExp(`name="escape-save-mode" value="${mode}"`));
  assert.match(html, /id="escape-unstuck-entity"[^>]*>Unstuck selected entity<\/button>/);
  assert.match(html, /id="graphics-unstuck-entity"[^>]*>Unstuck selected entity<\/button>/);
  assert.match(app, /function recoverStuckEntity\(\)/);
  assert.match(app, /nearestSafeUnstuckDestination/);
  assert.match(app, /bodySupportedByNavmesh/);
  assert.doesNotMatch(app, /window\.prompt\("Name this save before exiting"/);
  assert.match(app, /function renderEscapeSaveChoice\(\)/);
  assert.match(app, /mode === "quick" \? await saveProgress\(true, \{ slotName: null \}\) : await saveNamedSlot\(\{ name, alsoResume: true, silent: true \}\)/);
  assert.match(app, /if \(!saved\)[\s\S]{0,400}has not exited/);
  assert.match(app, /gameSessionStarted = false; closeEscapeMenu\(\{ restore: false \}\); showGameMenu\("main"\)/);
  assert.match(app, /async function saveProgress\(silent = false, \{ slotName = activeSaveSlotName \} = \{\}\)[\s\S]{0,500}return true;[\s\S]{0,500}return false;/);
  assert.match(app, /async function saveNamedSlot\([\s\S]{0,500}writeSnapshot\(`slot:\$\{name\}`[\s\S]{0,300}writeSnapshot\("resume"/);
});

test("the startup action identifies the exact world it will open", () => {
  assert.match(html, /id="menu-world-source"/);
  assert.match(html, /id="menu-world-state"/);
  assert.match(html, /id="menu-world-detail"/);
  assert.match(html, />Saved worlds<\/button>/);
  assert.match(app, /action: saveName \? `Continue “\$\{saveName\}”` : "Resume previous world"/);
  assert.match(app, /source: saveName \? `Selected save · \$\{saveName\}` : "Most recent quick save"/);
  assert.match(app, /action: activeSaveSlotName \? `Return to “\$\{activeSaveSlotName\}”` : "Return to current world"/);
  assert.match(app, /action: "Begin observing this world"/);
  assert.match(app, /It does not reload an older quick save/);
  assert.match(app, /dataset\.worldMode === "saved"/);
  assert.match(app, /async function loadSavedWorldAndEnter\(name/);
  assert.match(app, /const loaded = await loadSlotByName\(name\)/);
  assert.match(app, /if \(!loaded\)[\s\S]*return false;[\s\S]*enterGame\(\);[\s\S]*return true;/);
  assert.match(app, /return true; \} catch \{ addEvent\("Load slot failed"\)/);
  assert.match(app, /createWorldSnapshot\(sim,[\s\S]{0,200}saveSlotName: activeSaveSlotName/);
  assert.match(worldCodec, /saveSlotName: saveSlotName \|\| null/);
  assert.match(app, /await activateSnapshotAsync\(\{ \.\.\.snapshot, saveSlotName: name \}/);
});

test("menu backgrounds can loop through selected images in stable library order", () => {
  assert.match(app, /<option value="sequence">Selected images in order<\/option>/);
  assert.match(app, /function sequentialMenuBackgroundPool\(pool, current = ""\)/);
  assert.match(app, /menuBackgroundRotation\.mode === "sequence" \? sequentialMenuBackgroundPool/);
  assert.match(app, /function menuBackgroundModeCycles\(\) \{ return menuBackgroundRotation\.mode === "cycle" \|\| menuBackgroundRotation\.mode === "sequence"; \}/);
  assert.match(app, /menuBackgroundRotation\.selected = menuBackgroundValues\(\)\.filter\(item => selected\.has\(item\)\)/);
});

test("resizable windows persist bounded width and height while Main Laboratory owns the viewport", () => {
  assert.match(app, /rss-window-sizes-v1/);
  assert.match(app, /normalizedManagedWindowSize/);
  assert.match(app, /window-resize-handle/);
  assert.match(app, /width: Number\.parseFloat\(element\.style\.width\), height: Number\.parseFloat\(element\.style\.height\)/);
  assert.match(css, /\.inspector\.is-main-laboratory:not\(\.is-minimised\)[^{]*\{[^}]*width:var\(--interface-fullscreen-width\)[^}]*height:var\(--interface-fullscreen-height\)/s);
  assert.match(app, /--interface-fullscreen-width/);
  assert.match(app, /width \/ scale/);
});

test("minimised windows leave recoverable dock entries instead of malformed floating title cards", () => {
  assert.match(html, /id="window-dock"/);
  assert.match(app, /syncWindowDock/);
  assert.match(app, /dataset\.restoreWindow/);
  assert.match(css, /#observer-hud\.is-minimised[^}]*display:none !important/);
  assert.match(css, /\.window-dock \{/);
});
