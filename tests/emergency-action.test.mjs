import test from "node:test";
import assert from "node:assert/strict";
import { emergencyReleaseAssessment, recordEmergencyAssessment } from "../src/emergency-action.js";
import { exertionMode } from "../src/alertness-exertion.js";

const adult = () => ({ id: "H1", speciesId: "grazer", lifeStage: "adult", alive: true, health: 100, healthCap: 100, fatigue: 74, sprintEnergy: 0, emergencyReserve: 1, commitmentProfile: { evidenceThreshold: .3, decisiveness: .7 } });

test("imminent pursuit can release reserve before total fatigue", () => {
  const animal = adult(), assessment = emergencyReleaseAssessment(animal, { directPursuit: true, targeted: true, contactEta: .05, targetLikelihood: 1, closurePressure: 1, routeQuality: .25, immediateLethalThreat: true });
  assert.equal(assessment.released, true);
  animal.emergencyRelease = assessment;
  assert.equal(exertionMode(animal, true).key, "adrenaline-overdrive");
});

test("dependants cannot release emergency reserve", () => {
  const assessment = emergencyReleaseAssessment({ ...adult(), lifeStage: "dependent" }, { directPursuit: true, contactEta: 0, immediateLethalThreat: true });
  assert.equal(assessment.released, false);
  assert.equal(assessment.physicallyEligible, false);
});

test("emergency assessments retain bounded explanatory audit", () => {
  const animal = adult(), assessment = emergencyReleaseAssessment(animal, { directPursuit: true, contactEta: .05, immediateLethalThreat: true });
  for (let tick = 0; tick < 30; tick += 1) recordEmergencyAssessment(animal, assessment, tick);
  assert.ok(animal.emergencyAudit.episodes.length <= 16);
  assert.equal(animal.emergencyAudit.last.reason, assessment.reason);
});
