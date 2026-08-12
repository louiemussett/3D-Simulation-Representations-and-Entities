import test from "node:test";
import assert from "node:assert/strict";
import { ageBereavement, bereavementDisposition, createBereavementEpisode, recordBereavement } from "../src/bereavement.js";

const observer = (extra = {}) => ({ id: "H2", speciesId: "grazer", careAffinity: .9, aggression: .7, health: 90, energy: 80, fatigue: 15, fear: 20, offspringIds: ["H1"], ...extra });

test("close kin receive stronger bereavement than ordinary group members", () => {
  const child = createBereavementEpisode(observer(), { id: "H1" }, { kinship: { related: true, direct: true, kind: "child" }, sameGroup: true, groupSize: 4, witnessedDeath: true, violent: true });
  const peer = createBereavementEpisode(observer({ offspringIds: [] }), { id: "H3" }, { kinship: { related: false }, sameGroup: true, groupSize: 4, witnessedDeath: true });
  assert.ok(child.griefIntensity > peer.griefIntensity);
});

test("a killer identity exists only with direct attacker evidence", () => {
  const unknown = createBereavementEpisode(observer(), { id: "H1" }, { kinship: { related: true, direct: true }, witnessedDeath: true, violent: true, attackerId: "C1", witnessedAttacker: false });
  const known = createBereavementEpisode(observer(), { id: "H1" }, { kinship: { related: true, direct: true }, witnessedDeath: true, violent: true, attackerId: "C1", witnessedAttacker: true, attackerConfidence: .95 });
  assert.equal(unknown.attackerId, null); assert.equal(known.attackerId, "C1");
});

test("survival emergencies suppress mourning and retaliation", () => {
  const episode = createBereavementEpisode(observer(), { id: "H1" }, { kinship: { related: true, direct: true }, witnessedDeath: true, witnessedAttacker: true, attackerId: "C1", attackerConfidence: 1, violent: true });
  assert.equal(bereavementDisposition(observer(), episode, { survivalEmergency: true }).kind, "defer");
});

test("the same death cannot restart bereavement", () => {
  const animal = observer(), episode = createBereavementEpisode(animal, { id: "H1" }, { kinship: { related: true, direct: true }, witnessedDeath: true });
  assert.ok(recordBereavement(animal, episode)); assert.equal(recordBereavement(animal, episode), null);
  ageBereavement(animal, 24); assert.ok(animal.bereavementEpisodes[0].ageHours >= 24);
});
