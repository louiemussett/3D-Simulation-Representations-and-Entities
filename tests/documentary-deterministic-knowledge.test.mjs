import test from "node:test";
import assert from "node:assert/strict";
import { DOCUMENTARY_LANGUAGE, documentaryLanguageCapacity, documentaryFeaturePassage } from "../src/documentary-language-library.js";
import { deterministicLaboratoryPassage, deterministicPhysiologyPassage, deterministicPlanningPassage, deterministicSocialPassage, deterministicWorldSystemPassage, EXTENDED_DOCUMENTARY_LANGUAGE } from "../src/documentary-deterministic-knowledge.js";
import { composeAdaptiveDocumentaryNarration, deterministicArchiveEvidencePassage } from "../src/documentary-narration.js";

const subject = overrides => ({ id: "grazer-12", speciesId: "grazer", speciesLabel: "Valley Grazer", lifeStage: "adult", health: 90, hydration: 70, energy: 70, ...overrides });

test("deterministic scientific vocabulary covers the expanded Laboratory domains", () => {
  assert.ok(Object.keys(EXTENDED_DOCUMENTARY_LANGUAGE).length >= 50);
  assert.ok(Object.keys(DOCUMENTARY_LANGUAGE).length >= 85);
  assert.ok(documentaryLanguageCapacity() >= 2200);
  for (const key of ["aerobicPerformance", "burstCapacity", "recoveryDebt", "activeRecovery", "acuteStress", "fightOrFlight", "digestion", "planning", "mateChoice", "kinship", "groundwater", "runoffDynamics", "soilProcess", "succession", "populationStructure", "inheritance"]) {
    const family = DOCUMENTARY_LANGUAGE[key];
    assert.ok(family, key);
    assert.equal(family.observations.length, 3);
    assert.equal(family.mechanisms.length, 3);
    assert.equal(family.consequences.length, 3);
    assert.match(documentaryFeaturePassage(key, { variant: 4 }).text, /\./);
  }
});

test("performance narration distinguishes sustainable headroom from burst reserve", () => {
  const passage = deterministicPhysiologyPassage({ subjects: [subject({ performanceZone: "burst", requestedPace: "sprint", affordablePace: "sustainable-run", aerobicHeadroom: 42, burstReserve: 18, recoveryBurden: 12, aerobicLoad: 30, muscularLoad: 55, anaerobicDebt: 34, recoveryDepth: "active", recommendedRecovery: "active", stressState: "calm", stressIntensity: 0 })] });
  assert.match(passage.text, /performance zone|aerobic headroom|burst capacity|recovery burden|anaerobic debt/i);
  assert.doesNotMatch(passage.text, /energy was created|must abandon/i);
  assert.ok(passage.question);
  assert.ok(passage.hypothesis);
});

test("acute stress narration says mobilisation is not energy creation", () => {
  const passage = deterministicPhysiologyPassage({ subjects: [subject({ performanceZone: "emergency", requestedPace: "sprint", affordablePace: "sprint", aerobicHeadroom: 50, burstReserve: 45, recoveryBurden: 20, stressState: "acute", stressIntensity: 84, stressRecoveryDebt: 35 })] });
  assert.match(passage.text, /mobilise existing fuel/i);
  assert.match(passage.text, /cannot create energy/i);
});

test("planning narration separates need, satisfier and outcome", () => {
  const passage = deterministicPlanningPassage({ subjects: [subject({ priority: "hydration", satisfier: "remembered river", commitmentStatus: "committed", commitmentProgress: .42, needSatisfier: { phase: "travel", method: "remembered river" } })] });
  assert.match(passage.text, /priority/i);
  assert.match(passage.text, /proposed satisfier/i);
  assert.match(passage.text, /underlying need/i);
  assert.doesNotMatch(passage.text, /will reach|certain/i);
});

test("social narration gives preferences and relationships bounded meanings", () => {
  const passage = deterministicSocialPassage({ subjects: [subject({ sex: "F", matePreferences: { valuesCare: .8 }, strongestRelationship: { partnerId: "grazer-3", kind: "friend", affinity: .7, trust: .6 } })] });
  assert.match(passage.text, /mate-preference profile/i);
  assert.match(passage.text, /never compels acceptance/i);
});

test("world narration connects verified rain, runoff and downstream uncertainty", () => {
  const passage = deterministicWorldSystemPassage({ habitat: "upper valley", weatherDetail: { rain: .8 }, landscape: { groundwater: 40, local: { meanRunoff: .12, meanBiomass: .5, heavilyGrazedCells: 2 } }, world: { waterCells: 12, wetlandCells: 4, woodlandCells: 9 } });
  assert.match(passage.text, /infiltration/i);
  assert.match(passage.text, /surface runoff/i);
  assert.match(passage.question, /downstream/i);
  assert.match(passage.hypothesis, /discharge/i);
});

test("specialised physiology archive language replaces the generic scalar fallback", () => {
  const passage = deterministicArchiveEvidencePassage({ subjects: [subject({ archiveEvidence: [{ path: "entity.grazer-12.recoveryDebt.travel", value: 62, type: "number" }] })] });
  assert.match(passage.text, /distinct causes/i);
  assert.doesNotMatch(passage.text, /silently discarded/i);
});

test("adaptive deterministic narration returns authored questions and hypotheses", () => {
  const context = { contextDepth: 5, narrationLength: "extended", lensPreset: "research", subjectCount: 1, habitat: "grassland", actionKey: "active-recovery", actionLabel: "recovering after a sprint", subjects: [subject({ performanceZone: "burst", requestedPace: "sprint", affordablePace: "walk", aerobicHeadroom: 30, burstReserve: 14, recoveryBurden: 56, aerobicLoad: 44, muscularLoad: 70, anaerobicDebt: 48, recoveryDepth: "active", recommendedRecovery: "alert-rest", stressState: "recovering", stressIntensity: 30, stressRecoveryDebt: 22 })] };
  const plan = composeAdaptiveDocumentaryNarration(context);
  assert.match(plan.text, /performance zone|aerobic headroom|burst capacity|recovery burden/i);
  assert.ok(plan.questions.length > 0);
  assert.ok(plan.hypotheses.length > 0);
  assert.equal(deterministicLaboratoryPassage(context).key, plan.topics.find(key => key.startsWith("physiology:")));
});
