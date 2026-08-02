import test from "node:test";
import assert from "node:assert/strict";
import { NEED_ONTOLOGY, liveNeedGraph } from "../src/need-ontology-presentation.js";

test("complete need ontology exposes survival and relational need domains", () => {
  assert.deepEqual(NEED_ONTOLOGY.map((branch) => branch.id), [
    "water",
    "food",
    "safety",
    "thermal",
    "care",
    "affiliation",
    "participation",
    "autonomy",
    "reproduction",
    "information",
  ]);
  assert.ok(NEED_ONTOLOGY
    .find((branch) => branch.id === "food")
    .methods.find((method) => method.id === "hunt-evidenced-prey")
    .dependencies.includes("adequate-hydration"));
});

test("live water plan retains its terminal need while recovery is active", () => {
  const graph = liveNeedGraph({ plan: { need: "water", method: "travel to water", phase: "recover", reason: "endurance is insufficient" }, planning: { water: { etaHours: 3.2, reserve: 15, predictedAmountAtArrival: 18 } }, animal: { hydration: 44, fatigue: 82 }, resource: { hasEvidence: true, evidence: "lake memory · 82% confidence", failures: 1 } });
  assert.equal(graph.nodes[0].label, "Maintain hydration");
  assert.equal(graph.nodes.find((node) => node.id === "recover").status, "active");
  assert.equal(graph.nodes.find((node) => node.id === "travel").status, "waiting");
  assert.equal(graph.eta, "3.2 h");
  assert.match(graph.whyNot[0], /Endurance is insufficient/);
});

test("no instantiated plan produces an explicit unavailable diagnostic", () => {
  assert.equal(liveNeedGraph({}).available, false);
});
