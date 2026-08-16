import test from "node:test";
import assert from "node:assert/strict";
import { unifiedSocialGraph } from "../src/social-graph.js";

test("unified social graph merges kin, group, explicit bonds and memory with status", () => {
  const subject = { id: "A", groupId: "pack", motherId: "P", parentIds: ["P"], offspringIds: ["C"], ancestorDepths: { P: 1 }, relationships: [], socialMemory: { C: { partnerId: "C", affinity: .8 }, M: { partnerId: "M", affinity: .4 } } };
  const animals = [subject, { id: "P", alive: true, ancestorDepths: {} }, { id: "C", alive: true, groupId: "pack", ancestorDepths: { A: 1 } }, { id: "G", alive: true, groupId: "pack", ancestorDepths: {} }, { id: "R", alive: true, ancestorDepths: {} }];
  const lineageRecords = { P: { id: "P", ancestorDepths: {} }, C: { id: "C", ancestorDepths: { A: 1 } }, D: { id: "D", ancestorDepths: { A: 1 }, deathTick: 42 } };
  const graph = unifiedSocialGraph(subject, { animals, lineageRecords, relationships: [{ sourceId: "A", targetId: "R", type: "friendship", strength: .7 }] });
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  assert.deepEqual(byId.get("C").sources, ["family", "group", "memory"]);
  assert.equal(byId.get("D").status, "deceased");
  assert.equal(byId.get("M").status, "memory-only");
  assert.deepEqual(byId.get("R").sources, ["relationship"]);
  assert.equal(graph.counts.family, 3);
  assert.equal(graph.counts.group, 2);
});
