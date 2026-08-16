import test from "node:test";
import assert from "node:assert/strict";
import {
  AdaptiveShotDirector, AudienceModel, AuthorIdFactory, CommitmentManager,
  DocumentaryEvidenceBus, EditorialCandidateGenerator, EPISTEMIC_LANGUAGE_POLICY, PredictiveDocumentaryAuthor,
  PropositionStore, QuestionLedger, ScientificInterpreter, ThresholdDetector,
  buildCameraIntention, buildNarrationContract, defaultEvidenceFromScene, normalizeProbabilityOutcomes,
  scoreEditorialCandidate, validatePresentationContract
} from "../src/documentary-author/index.js";

test("evidence is immutable, validated, bounded and deterministically identified", () => {
  const bus = new DocumentaryEvidenceBus({ maximum: 2, idFactory: new AuthorIdFactory("test") });
  const first = bus.publish({ tick: 1, type: "behaviour.started", subjects: ["a"], confidence: 1, magnitude: .5, payload: { action: "walk" } });
  assert.equal(first.evidenceId, "test-evidence-000001"); assert.equal(Object.isFrozen(first), true);
  bus.publish({ tick: 2, type: "behaviour.completed", subjects: ["a"], confidence: 1, magnitude: .5 }); bus.publish({ tick: 3, type: "behaviour.started", subjects: ["b"], confidence: 1, magnitude: .5 });
  assert.equal(bus.records.length, 2); assert.equal(bus.dropped, 1);
});

test("threshold hysteresis emits transitions without boundary chatter", () => {
  const detector = new ThresholdDetector({ enter: .75, exit: .68 });
  assert.equal(detector.observe(.74), null); assert.equal(detector.observe(.76).toBand, "high"); assert.equal(detector.observe(.72), null); assert.equal(detector.observe(.67).toBand, "normal");
});

test("archive evidence adapter ignores sparse and malformed records", () => {
  const records = defaultEvidenceFromScene({ kind: "landscape", ids: [] }, { variant: 2, subjects: [{ id: "a", archiveEvidence: [undefined, null, {}, { path: "entity.a.energy", value: 40, type: "number" }] }], worldEvidence: [undefined, { value: 2 }, { path: "simulation.world.rain", value: 0, type: "number" }] });
  assert.equal(records.filter(item => item.type === "archive.entity_field").length, 1);
  assert.equal(records.filter(item => item.type === "archive.world_field").length, 1);
  assert.ok(records.every(item => item.payload.path !== undefined || !item.type.startsWith("archive.")));
});

test("scientific interpretation preserves evidence provenance", () => {
  const ids = new AuthorIdFactory("science"), propositions = new PropositionStore({ idFactory: ids }), interpreter = new ScientificInterpreter({ propositionStore: propositions, claimLedger: { revise: ({ proposition }) => ({ claimId: "claim", propositionId: proposition.propositionId }) }, idFactory: ids });
  const evidence = new DocumentaryEvidenceBus({ idFactory: ids }).publish({ tick: 4, type: "behaviour.current", subjects: ["a"], confidence: 1, magnitude: .5, payload: { actionKey: "drink" } });
  const result = interpreter.interpret(evidence); assert.deepEqual(result.proposition.support, [evidence.evidenceId]); assert.equal(result.proposition.epistemicClass, "AUTHORITATIVE_STATE");
});

test("epistemic classes have bounded language policies", () => { assert.equal(EPISTEMIC_LANGUAGE_POLICY.UNKNOWN, "question-or-silence"); assert.equal(EPISTEMIC_LANGUAGE_POLICY.EDITORIAL_HYPOTHESIS, "modal"); });

test("prediction outcomes are normalised and invalid outcomes abstain", () => { const outcomes = normalizeProbabilityOutcomes([{ id: "a", probability: 2 }, { id: "b", probability: 1 }]); assert.ok(Math.abs(outcomes.reduce((sum, item) => sum + item.probability, 0) - 1) < 1e-9); assert.deepEqual(normalizeProbabilityOutcomes([]), []); });

test("audience novelty falls after communicating unchanged semantics", () => {
  const audience = new AudienceModel({ retentionLambda: 0 }), proposition = { propositionId: "p", arguments: { state: "same" } };
  assert.equal(audience.novelty(proposition, 0), 1); audience.communicate(proposition, { atMs: 0, visualReinforcement: 1 }); assert.ok(audience.novelty(proposition, 10) < .4);
});

test("recently narrated unchanged world propositions are excluded from editorial candidates", () => {
  const ids = new AuthorIdFactory("repeat"), audience = new AudienceModel(), store = new PropositionStore({ idFactory: ids }), proposition = store.add({ predicate: "scene_hydrology", subjectIds: [], arguments: { detail: "Runoff connects this ground to locations beyond the frame." }, epistemicClass: "DIRECT_OBSERVATION", confidence: 1, support: ["evidence-1"], materiality: .7 });
  const situation = { situationId: "hydrology", type: "HYDROLOGICAL_CHANGE", phase: "DISCOVERY", importance: .7, communicablePropositionIds: [proposition.propositionId], propositions: [proposition] };
  const generator = new EditorialCandidateGenerator();
  assert.ok(generator.generate({ situations: [situation], audience, nowMs: 1000 }).some(item => item.situationId === "hydrology"));
  audience.communicate(proposition, { atMs: 1000, visualReinforcement: .6 });
  const question = { questionId: "question-1", situationId: "hydrology", spoken: false };
  assert.equal(generator.generate({ situations: [situation], audience, nowMs: 2000, questions: [question] }).some(item => item.situationId === "hydrology"), false);
});

test("questions have an explicit lifecycle", () => { const ledger = new QuestionLedger({ idFactory: new AuthorIdFactory("q") }), question = ledger.open({ textIntent: "whether_path_continues", situationId: "s", tick: 1, expiresAtTick: 3 }); assert.equal(question.state, "OPEN"); ledger.expire(4); assert.equal(question.state, "EXPIRED"); });

test("silence has positive editorial utility", () => { const score = scoreEditorialCandidate({ action: "REMAIN_SILENT", silence: { breathingRoom: 1, ambientStrength: 1, toneProtection: 1, audienceGap: 0 } }); assert.ok(score.total > .7); });

test("commitment requires a material utility margin to switch", () => {
  const manager = new CommitmentManager({ baseThreshold: .2, maximumTicks: 30 }), current = { candidate: { candidateId: "a", situationId: "a" }, score: { total: .6 } }, challenger = { candidate: { candidateId: "b", situationId: "b" }, score: { total: .7 } };
  manager.choose([current], 1); assert.equal(manager.choose([current, challenger], 2).candidate.situationId, "a");
});

test("presentation contracts reject camera subjects absent from narration", () => { const ids = new AuthorIdFactory("c"), store = new PropositionStore({ idFactory: ids }), proposition = store.add({ subjectIds: ["a"], predicate: "walks", epistemicClass: "AUTHORITATIVE_STATE", confidence: 1, support: ["e"], validity: { fromTick: 1 } }), decision = { action: "FOLLOW_THREAD" }, narration = buildNarrationContract({ idFactory: ids, decision, propositions: [proposition] }), camera = buildCameraIntention({ idFactory: ids, decision, subjectIds: ["b"] }); assert.equal(validatePresentationContract({ narration, camera }, store).valid, false); });

test("adaptive camera predicts occlusion repairs and preserves safe fallback", () => { const director = new AdaptiveShotDirector(); director.setIntention({ intentId: "i" }); assert.equal(director.update({ visibility: 1, composition: 1, predictedOcclusion: .8 }).action, "LATERAL_REPOSITION"); assert.equal(director.update({ invalidPose: true }).action, "SAFE_CAMERA"); });

test("predictive author runs complete evidence-to-contract pipeline in active mode", () => {
  const author = new PredictiveDocumentaryAuthor({ mode: "V2_ACTIVE" }), result = author.cycle({ scene: { id: "scene", kind: "animal", ids: ["grazer-1"], score: 70, title: "A journey", detail: "The grazer continues." }, context: { subjects: [{ id: "grazer-1", actionKey: "drink", energy: 60, hydration: 30 }], actionKey: "drink" }, tick: 10, recordingTimeMs: 1000, entities: new Map([["grazer-1", { id: "grazer-1", name: "Northbank" }]]) });
  assert.equal(result.activate, true); assert.equal(result.validation.valid, true); assert.ok(result.realised.text.length > 0); assert.ok(result.realised.evidenceIds.length > 0); assert.ok(author.health().propositions >= 2);
});

test("shadow author produces traceable decisions without activating output", () => { const author = new PredictiveDocumentaryAuthor({ mode: "V2_SHADOW" }), result = author.cycle({ scene: { id: "world", kind: "landscape", ids: [], score: 40 }, context: { landscape: { terrain: "wetland" } }, tick: 1 }); assert.equal(result.activate, false); assert.ok(author.trace.records.some(record => record.type === "AUTHOR_DECISION")); });
