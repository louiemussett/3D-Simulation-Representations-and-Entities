import { EPISTEMIC_CLASSES, validateProposition } from "./schemas.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export class PropositionStore {
  constructor({ maximum = 8000, idFactory } = {}) { this.maximum = maximum; this.idFactory = idFactory; this.items = new Map(); this.byPredicate = new Map(); }
  add(input) {
    const proposition = Object.freeze({ propositionId: input.propositionId || this.idFactory.next("proposition"), subjectIds: Object.freeze([...(input.subjectIds || [])]), predicate: String(input.predicate), arguments: Object.freeze({ ...(input.arguments || {}) }), epistemicClass: input.epistemicClass || "UNKNOWN", confidence: clamp01(input.confidence), support: Object.freeze([...(input.support || [])]), contradiction: Object.freeze([...(input.contradiction || [])]), validity: Object.freeze({ fromTick: Number(input.validity?.fromTick) || 0, untilTick: input.validity?.untilTick ?? null }), materiality: clamp01(input.materiality ?? .5) });
    const validation = validateProposition(proposition); if (!validation.valid) throw new TypeError(validation.errors.join(", "));
    this.items.set(proposition.propositionId, proposition); const list = this.byPredicate.get(proposition.predicate) || []; list.push(proposition.propositionId); this.byPredicate.set(proposition.predicate, list.slice(-128)); while (this.items.size > this.maximum) this.items.delete(this.items.keys().next().value); return proposition;
  }
  get(id) { return this.items.get(id) || null; }
  find(predicate) { return (this.byPredicate.get(predicate) || []).map(id => this.items.get(id)).filter(Boolean); }
}

export class ClaimLedger {
  constructor({ maximum = 4000, idFactory } = {}) { this.maximum = maximum; this.idFactory = idFactory; this.claims = new Map(); this.current = new Map(); }
  revise({ claimId = null, proposition, status = "SUPPORTED", confidence = proposition.confidence, alternatives = [], tick = 0 }) { const id = claimId || this.idFactory.next("claim"), revisions = this.claims.get(id) || [], item = Object.freeze({ claimId: id, revision: revisions.length + 1, propositionId: proposition.propositionId, status, confidence: clamp01(confidence), alternatives: Object.freeze(alternatives.map(item => Object.freeze({ ...item, confidence: clamp01(item.confidence) }))), firstSupportedAtTick: revisions[0]?.firstSupportedAtTick ?? tick, updatedAtTick: tick, expiresAtTick: proposition.validity.untilTick }); revisions.push(item); this.claims.set(id, revisions.slice(-32)); this.current.set(proposition.predicate + ":" + proposition.subjectIds.join("|"), item); while (this.claims.size > this.maximum) { const oldest = this.claims.keys().next().value; this.claims.delete(oldest); } return item; }
  latest(claimId) { return this.claims.get(claimId)?.at(-1) || null; }
}

export class ScientificInterpreter {
  constructor({ propositionStore, claimLedger, idFactory } = {}) { this.propositions = propositionStore; this.claims = claimLedger; this.idFactory = idFactory; this.rules = new Map(); this.registerDefaults(); }
  register(type, rule) { this.rules.set(type, rule); return this; }
  registerDefaults() {
    this.register("behaviour.current", evidence => ({ predicate: `behaviour_${evidence.payload.actionKey || "unknown"}`, arguments: evidence.payload, epistemicClass: "AUTHORITATIVE_STATE", materiality: .55 }));
    this.register("physiology.current_band", evidence => ({ predicate: "physiological_condition_observed", arguments: evidence.payload, epistemicClass: "AUTHORITATIVE_STATE", materiality: .48 }));
    this.register("environment.current", evidence => ({ predicate: "environmental_conditions_observed", arguments: evidence.payload, epistemicClass: "AUTHORITATIVE_STATE", materiality: .5 }));
  }
  interpret(evidence) { const rule = this.rules.get(evidence.type), output = rule ? rule(evidence) : { predicate: evidence.type.replaceAll(".", "_"), arguments: evidence.payload, epistemicClass: evidence.provenance.sourceClass === "AUTHORITATIVE_STATE" ? "AUTHORITATIVE_STATE" : "DIRECT_OBSERVATION", materiality: evidence.magnitude }; const proposition = this.propositions.add({ subjectIds: evidence.subjects, predicate: output.predicate, arguments: output.arguments, epistemicClass: EPISTEMIC_CLASSES.includes(output.epistemicClass) ? output.epistemicClass : "UNKNOWN", confidence: evidence.confidence, support: [evidence.evidenceId], validity: { fromTick: evidence.tick, untilTick: output.untilTick ?? null }, materiality: output.materiality }); const claim = this.claims.revise({ proposition, tick: evidence.tick }); return { proposition, claim }; }
}

export const EPISTEMIC_LANGUAGE_POLICY = Object.freeze({ DIRECT_OBSERVATION: "declarative", AUTHORITATIVE_STATE: "declarative", DETERMINISTIC_DERIVATION: "bounded-declarative", STRONG_ASSOCIATION: "qualified", EDITORIAL_HYPOTHESIS: "modal", BOUNDED_PREDICTION: "future-modal", REPORTED_BY_ENTITY_SIGNAL: "attributed", UNKNOWN: "question-or-silence" });

