import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const [app, css] = await Promise.all([
  readFile(new URL("src/app.js", root), "utf8"),
  readFile(new URL("src/styles.css", root), "utf8")
]);

test("Cinema keeps its authored type hierarchy under the readable global defaults", () => {
  const scaler = app.slice(app.indexOf("function applyInterfacePresentation("), app.indexOf("\nfunction resetIconTextureCaches("));
  assert.match(scaler, /#movie-hud, #movie-hud \*/);
  assert.match(scaler, /authoredSize \* scale/);
  assert.match(app, /#movie-hud \.movie-hud-heading strong/);
  assert.match(app, /#movie-hud \.movie-shot-copy strong/);
  assert.match(app, /#movie-hud label/);
  assert.match(app, /#movie-hud \.movie-output-status/);
});

test("Cinema has a readable first-run width and panel-width responsive controls", () => {
  assert.match(css, /\.movie-hud\{[^}]*width:min\(520px,calc\(100% - 36px\)\)/s);
  assert.match(css, /container:cinema-hud \/ inline-size/);
  assert.match(css, /@container cinema-hud \(max-width:430px\)/);
  assert.match(css, /@container cinema-hud \(max-width:340px\)/);
  assert.match(css, /\.movie-presets,\.movie-control-grid \{ grid-template-columns:minmax\(0,1fr\); \}/);
  assert.match(css, /\.movie-output-toggles,\.movie-output-status \{ grid-template-columns:repeat\(2,minmax\(0,1fr\)\); \}/);
});

test("Cinema prevents horizontal overflow at default and user-resized widths", () => {
  assert.match(css, /#movie-hud\.managed-resizable-window \{ overflow-x:hidden; overflow-y:auto; \}/);
  assert.match(css, /#movie-hud :where\(\*\) \{ min-width:0; \}/);
  assert.match(css, /#movie-hud :where\(button,input,select,textarea\) \{ max-width:100%; \}/);
  assert.match(css, /\.movie-lens-grid \{ max-height:none;overflow:visible; \}/);
});
