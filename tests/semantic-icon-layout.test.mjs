import test from "node:test";
import assert from "node:assert/strict";
import { semanticIconLayout } from "../src/semantic-icon-layout.js";

test("composite semantic icons reserve separate subject meaning and verb regions", () => {
  const layout = semanticIconLayout({ verb: "REQUESTS" });
  // The component-size box includes generous drawing padding; the actual
  // silhouettes occupy less than 60% of it.
  assert.ok(layout.meaning.x - layout.subject.x >= layout.componentSize * 1.6);
  assert.ok(layout.verb.y - layout.subject.y >= layout.componentSize);
  assert.ok(layout.connector.x1 < layout.connector.x2);
  assert.ok(layout.connector.x1 > layout.subject.x);
  assert.ok(layout.connector.x2 < layout.meaning.x);
  assert.ok(layout.componentSize >= 55);
  assert.ok(176 - layout.meaning.x >= 47, "ringed meaning keeps a protected right inset");
  assert.ok(layout.verb.font >= 11);
});

test("single-meaning badges use the centre without empty grammar regions", () => {
  const layout = semanticIconLayout({ hasSubject: false });
  assert.equal(layout.subject, null);
  assert.equal(layout.verb, null);
  assert.equal(layout.meaning.x, 88);
  assert.ok(layout.componentSize >= 70);
});
