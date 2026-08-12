import { captureDocumentarySnapshot, documentaryInputRevision, documentarySceneEventRevision } from "../evidence/snapshot-adapter.js";
import { EvidenceLedger, validateEvidenceInput } from "../evidence/evidence-ledger.js";
import { defaultEvidenceAdapters } from "../evidence/adapters.js";
import { BeliefStore } from "../beliefs/belief-store.js";
import { SituationManager } from "../situations/situation-manager.js";
import { PropositionStore } from "../audience/proposition-store.js";
import { deepFreeze } from "./immutable.js";
import { PerformanceBudgetTracker } from "./performance-budget.js";

const now = () => globalThis.performance?.now?.() ?? Date.now();

export class ObservationTransactionRuntime {
  constructor({ adapters = defaultEvidenceAdapters(), evidence = new EvidenceLedger(), beliefs = new BeliefStore(), situations = new SituationManager(), propositions = new PropositionStore(), onRecord = null, performance = new PerformanceBudgetTracker() } = {}) {
    this.adapters = adapters; this.evidence = evidence; this.beliefs = beliefs; this.situations = situations; this.propositions = propositions; this.onRecord = onRecord; this.performance = performance; this.revision = 0; this.last = null; this.diagnostics = []; this.lastSimulation = null; this.lastInputRevision = null; this.lastSceneEventRevision = null; this.healthCache = null;
  }
  observe(simulation, { scenes = [], capturedAtMonotonicMs = null } = {}) {
    const started = now(), inputRevision = documentaryInputRevision(simulation), sceneEventRevision = documentarySceneEventRevision(scenes);
    if (inputRevision != null && simulation === this.lastSimulation && inputRevision === this.lastInputRevision && sceneEventRevision === this.lastSceneEventRevision) return this.last;
    const snapshot = captureDocumentarySnapshot(simulation, { scenes, capturedAtMonotonicMs });
    if (this.last?.snapshot.snapshotId === snapshot.snapshotId && sceneEventRevision === this.lastSceneEventRevision) {
      this.lastSimulation = simulation; this.lastInputRevision = inputRevision; this.lastSceneEventRevision = sceneEventRevision;
      return this.last;
    }
    const transaction = this.evidence.begin(snapshot.simulationTick), adapterDiagnostics = [];
    for (const adapter of this.adapters) {
      const adapterStarted = now();
      try {
        const inputs = adapter.observe(snapshot, this.last?.snapshot) || [], valid = [];
        for (const input of inputs) { try { validateEvidenceInput(input); valid.push(input); } catch (error) { adapterDiagnostics.push({ adapterId: adapter.id, status: "RECORD_REJECTED", message: error.message }); } }
        transaction.addAll(valid); adapterDiagnostics.push({ adapterId: adapter.id, status: "OK", records: valid.length, durationMs: now() - adapterStarted });
      } catch (error) { adapterDiagnostics.push({ adapterId: adapter.id, status: "ADAPTER_FAILED", message: error.message, durationMs: now() - adapterStarted }); }
    }
    const evidenceDelta = transaction.commit(), beliefDelta = this.beliefs.reviseEvidence(evidenceDelta), propositionDelta = this.propositions.revise(beliefDelta), situationDelta = this.situations.observe({ snapshot, beliefs: beliefDelta.snapshot, scenes });
    this.revision += 1;
    const observation = Object.freeze({
      revision: this.revision, snapshot, evidenceDelta, beliefDelta, propositionDelta, situationDelta,
      evidence: this.evidence.snapshot(), beliefs: beliefDelta.snapshot, propositions: this.propositions.snapshot(), situations: situationDelta.snapshot,
      adapterDiagnostics: deepFreeze(adapterDiagnostics), durationMs: now() - started
    });
    this.last = observation; this.lastSimulation = simulation; this.lastInputRevision = inputRevision; this.lastSceneEventRevision = sceneEventRevision; this.healthCache = null; this.performance.record("observationTransaction", observation.durationMs); this.diagnostics.push(...adapterDiagnostics.filter(item => item.status !== "OK")); if (this.diagnostics.length > 500) this.diagnostics.splice(0, this.diagnostics.length - 500);
    this.onRecord?.("author_evidence_batch", { revision: observation.revision, evidenceRevision: evidenceDelta.revision, evidenceIds: evidenceDelta.records.map(item => item.evidenceId), adapterDiagnostics }, snapshot.simulationTick);
    for (const belief of beliefDelta.changed) this.onRecord?.("author_belief_revision", belief, snapshot.simulationTick);
    for (const transition of situationDelta.transitions) this.onRecord?.("author_situation_transition", transition, snapshot.simulationTick);
    return observation;
  }
  reset() { this.evidence = new EvidenceLedger(); this.beliefs = new BeliefStore(); this.situations = new SituationManager(); this.propositions = new PropositionStore(); this.performance.reset(); this.revision = 0; this.last = null; this.diagnostics = []; this.lastSimulation = null; this.lastInputRevision = null; this.lastSceneEventRevision = null; this.healthCache = null; }
  health() {
    const key = `${this.revision}|${this.evidence.revision}|${this.beliefs.revision}|${this.situations.revision}|${this.propositions.revision}|${this.performance.revision || 0}|${this.diagnostics.length}`;
    if (this.healthCache?.key === key) return this.healthCache.value;
    const value = Object.freeze({ observationRevision: this.revision, evidenceRevision: this.evidence.revision, beliefsRevision: this.beliefs.revision, situationRevision: this.situations.revision, propositionRevision: this.propositions.revision, evidenceRecords: this.evidence.active.size, beliefRecords: this.beliefs.active.size, activeSituations: this.situations.active().length, lastDurationMs: this.last?.durationMs || 0, adapterFailures: this.diagnostics.length, performance: this.performance.snapshot() });
    this.healthCache = { key, value }; return value;
  }
}
