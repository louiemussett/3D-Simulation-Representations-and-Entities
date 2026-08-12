import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/app.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");

test("a selected herd can expand constituent groups without replacing herd selection", () => {
  assert.match(app, /const expandedHerdGroupIds = new Set\(\)/);
  assert.match(app, /data-group-expand=/);
  assert.match(app, /aria-expanded=/);
  assert.match(app, /data-herd-groups-toggle="all"/);
  assert.match(app, /members\.map\(observerMemberSummary\)/);
});

test("the herd panel presents one herd above numbered groups and their individuals", () => {
  assert.match(app, /One herd · \$\{rows\.length\} constituent/);
  assert.match(app, /<strong>Group \$\{groupNumber\}<\/strong>/);
  assert.match(app, /Show individuals/);
  assert.match(app, /Individuals in group \$\{groupNumber\}/);
  assert.match(app, /Individuals attached directly to this herd/);
  assert.doesNotMatch(app, /<strong>\$\{escapeHtml\(label\)\}<\/strong> · \$\{members\.length\}/);
});

test("group expansion and group focus are distinct controls", () => {
  const expansionHandler = app.indexOf('event.target.closest("[data-group-expand]")');
  const focusHandler = app.indexOf('dataset.groupFocus', expansionHandler);
  assert.ok(expansionHandler >= 0);
  assert.ok(focusHandler > expansionHandler);
  assert.match(app, /class="observer-group-focus" data-group-focus=/);
});

test("expanded herd members have a bounded nested layout", () => {
  assert.match(styles, /\.observer-herd-group-members\s*\{/);
  assert.match(styles, /\.observer-herd-group-summary\s*\{/);
  assert.match(styles, /grid-template-columns:\s*minmax\(0,1fr\) auto/);
  assert.match(styles, /\.observer-organization-groups\s*\{[^}]*list-style:\s*none/);
  assert.match(styles, /\.observer-herd-members-title\s*\{/);
  assert.match(styles, /\.observer-herd-individuals\s*\{/);
});
