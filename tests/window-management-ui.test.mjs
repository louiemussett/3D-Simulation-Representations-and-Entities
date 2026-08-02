import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [html, app, css] = await Promise.all([
  readFile(new URL("index.html", root), "utf8"),
  readFile(new URL("src/app.js", root), "utf8"),
  readFile(new URL("src/styles.css", root), "utf8")
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
});

test("the startup action identifies the exact world it will open", () => {
  assert.match(html, /id="menu-world-source"/);
  assert.match(html, /id="menu-world-state"/);
  assert.match(html, /id="menu-world-detail"/);
  assert.match(html, />Saved worlds<\/button>/);
  assert.match(app, /action: "Resume previous world"/);
  assert.match(app, /action: "Return to current world"/);
  assert.match(app, /action: "Begin observing this world"/);
  assert.match(app, /It does not reload an older quick save/);
  assert.match(app, /dataset\.worldMode === "saved"/);
  assert.match(app, /async function loadSavedWorldAndEnter\(name/);
  assert.match(app, /const loaded = await loadSlotByName\(name\)/);
  assert.match(app, /if \(!loaded\)[\s\S]*return false;[\s\S]*enterGame\(\);[\s\S]*return true;/);
  assert.match(app, /return true; \} catch \{ addEvent\("Load slot failed"\)/);
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
