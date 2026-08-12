import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8"), app = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");

test("Laboratory exposes an optional entity-name toggle", () => { assert.match(html, /id="overlay-entity-names" type="checkbox"/); assert.doesNotMatch(html, /id="overlay-entity-names" type="checkbox" checked/); });
test("entity names persist and narrated Movie subjects are identified", () => { assert.match(app, /rss-laboratory-entity-names-v1/); assert.match(app, /activeNarrationSubjectIds\.has\(a\.id\)/); assert.match(app, /animal\?\.name \|\| animal\?\.label \|\| animal\?\.id/); assert.match(app, /name: entityDisplayName\(a\)/); assert.match(app, /activeNarrationSubjectIds\.has\(corpse\.sourceId\)/); });
