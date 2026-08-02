import test from "node:test";
import assert from "node:assert/strict";
import { buildCinemaInteractionChains, chooseCinemaInteractionBeat, cinemaInteractionLens } from "../src/cinema-interaction-chains.js";

const hunter = { id: "RH1", label: "Ridge Hunter RH1", alive: true, canHunt: true, x: 0, z: 0, targetId: "VG1", evidenceTargetId: "VG1", evidenceChannel: "smell", actionKey: "tracking prey trail", predationPhase: "tracking", speed: .08 };
const prey = { id: "VG1", label: "Valley Grazer VG1", alive: true, canHunt: false, x: 9, z: 0, actionKey: "vigilant walk", awareOfIds: [] };
const joiner = { id: "RH2", label: "Ridge Hunter RH2", alive: true, canHunt: true, x: 11, z: 2, targetId: "VG1", actionKey: "joining chase", predationPhase: "approach" };

test("predation evidence becomes one ordered multi-subject Cinema thread", () => {
  const chain = buildCinemaInteractionChains([hunter, prey, joiner]).find(item => item.chainId === "predation:RH1:VG1");
  assert.equal(chain.chainId, "predation:RH1:VG1");
  assert.deepEqual(chain.scenes.map(scene => scene.chainStage), ["evidence", "prey-response", "hunter-progress", "nearby-participant", "distance-overview", "prey-condition", "hunter-condition"]);
  assert.deepEqual(chain.scenes[0].ids, ["RH1"]);
  assert.deepEqual(chain.scenes[1].ids, ["VG1"]);
  assert.deepEqual(new Set(chain.scenes[4].ids), new Set(["RH1", "VG1", "RH2"]));
  assert.match(chain.scenes[1].detail, /does not prove/);
});

test("thread continuation advances beats and cools down a completed unchanged chain", () => {
  const chain = buildCinemaInteractionChains([hunter, prey, joiner]).find(item => item.chainId === "predation:RH1:VG1"), chains = [chain];
  let state = {}, choice;
  const stages = [];
  for (let sequence = 0; sequence < chains[0].scenes.length; sequence += 1) { choice = chooseCinemaInteractionBeat(chains, state, sequence); stages.push(choice.scene.chainStage); state = choice.state; }
  assert.deepEqual(stages, chains[0].scenes.map(scene => scene.chainStage));
  choice = chooseCinemaInteractionBeat(chains, state, stages.length);
  assert.equal(choice.scene, null);
  assert.equal(choice.state.completed[chains[0].signature], stages.length);
});

test("an evolving pursuit continues after the last shown beat instead of restarting", () => {
  const initial = buildCinemaInteractionChains([hunter, prey, joiner]).find(item => item.chainId === "predation:RH1:VG1");
  let choice = chooseCinemaInteractionBeat([initial], {}, 0);
  assert.equal(choice.scene.chainStage, "evidence");
  choice = chooseCinemaInteractionBeat([initial], choice.state, 1);
  assert.equal(choice.scene.chainStage, "prey-response");

  const changedPrey = { ...prey, awareOfIds: [hunter.id], actionKey: "fleeing from threat" };
  const changedHunter = { ...hunter, actionKey: "pursuing visible prey", predationPhase: "pursuit" };
  const evolved = buildCinemaInteractionChains([changedHunter, changedPrey, joiner]).find(item => item.chainId === "predation:RH1:VG1");
  assert.notEqual(evolved.signature, initial.signature);
  choice = chooseCinemaInteractionBeat([evolved], choice.state, 2);
  assert.equal(choice.scene.chainStage, "hunter-progress");
  assert.match(choice.scene.detail, /pursuit phase/i);
});

test("interaction lens withholds physiology except for deliberate condition beats", () => {
  assert.equal(cinemaInteractionLens("evidence").physiology, undefined);
  assert.equal(cinemaInteractionLens("distance-overview").physiology, undefined);
  assert.equal(cinemaInteractionLens("prey-condition").physiology, true);
  assert.equal(cinemaInteractionLens("hunter-condition").physiology, true);
});

test("courtship and mating remain one paired thread as the phase changes", () => {
  const female = { id: "VG1", label: "Valley Grazer VG1", alive: true, sex: "F", lifeStage: "adult", x: 0, z: 0, courtshipPartnerId: "VG2", actionTargetId: "VG2", actionKey: "courtship", reproductionStage: "courtship" };
  const male = { id: "VG2", label: "Valley Grazer VG2", alive: true, sex: "M", lifeStage: "adult", x: 1, z: 0, courtshipPartnerId: "VG1", actionTargetId: "VG1", actionKey: "courtship", reproductionStage: "courtship" };
  const courtship = buildCinemaInteractionChains([female, male]).find(item => item.kind === "reproduction");
  assert.equal(courtship.chainId, "reproduction:VG1:VG2");
  assert.equal(courtship.phase, "courtship");
  assert.deepEqual(courtship.scenes.map(scene => scene.chainStage), ["relationship-open", "partner-response", "relationship-progress", "relationship-overview", "reproductive-condition"]);
  const mating = buildCinemaInteractionChains([{ ...female, courtshipPartnerId: null, matingPartnerId: "VG2", actionKey: "mating", reproductionStage: "mating" }, { ...male, courtshipPartnerId: null, matingPartnerId: "VG1", actionKey: "mating", reproductionStage: "mating" }]).find(item => item.kind === "reproduction");
  assert.equal(mating.chainId, courtship.chainId);
  assert.notEqual(mating.signature, courtship.signature);
});

test("pregnancy and nursing create evidence-linked family threads", () => {
  const mother = { id: "VG1", label: "Valley Grazer VG1", alive: true, sex: "F", lifeStage: "adult", x: 0, z: 0, groupId: "family", pregnant: true, pregnancyProgress: .82, pregnancyOffspringCount: 2, offspringIds: ["VG3"], lactation: 20, actionTargetId: "VG3", actionKey: "allow-nursing" };
  const child = { id: "VG3", label: "Valley Grazer VG3", alive: true, lifeStage: "dependent", x: .4, z: 0, groupId: "family", motherId: "VG1", actionTargetId: "VG1", actionKey: "nurse" };
  const chains = buildCinemaInteractionChains([mother, child]), pregnancy = chains.find(item => item.kind === "pregnancy"), care = chains.find(item => item.kind === "caregiving");
  assert.equal(pregnancy.phase, "late pregnancy");
  assert.match(pregnancy.scenes[0].detail, /82% complete/);
  assert.equal(care.phase, "nursing");
  assert.deepEqual(care.scenes[2].ids, ["VG1", "VG3"]);
  assert.equal(cinemaInteractionLens("maternal-condition").physiology, true);
  assert.equal(cinemaInteractionLens("family-overview").physiology, undefined);
});

test("a rapid predation phase jumps directly to the current action beat", () => {
  const initial = buildCinemaInteractionChains([hunter, prey]).find(item => item.kind === "predation");
  const first = chooseCinemaInteractionBeat([initial], {}, 0);
  const pursuit = buildCinemaInteractionChains([{ ...hunter, actionKey: "chasing prey", predationPhase: "pursuit" }, prey]).find(item => item.kind === "predation");
  const changed = chooseCinemaInteractionBeat([pursuit], first.state, 1);
  assert.equal(changed.scene.chainStage, "hunter-progress");
  assert.equal(changed.state.phase, "pursuit");
});
