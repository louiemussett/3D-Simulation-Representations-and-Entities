import { NEED_DEFINITIONS, SATISFIER_DEFINITIONS } from "./behaviour-ontology.js";
import { canonicalNeedId, createSatisfierOption } from "./commitment-contracts.js";

export function satisfierOptionsForNeed(need, { availability = {}, evidenceBySatisfier = {}, confidenceBySatisfier = {}, effectBySatisfier = {} } = {}) {
  const needId = canonicalNeedId(need), definition = NEED_DEFINITIONS[needId];
  if (!definition) return Object.freeze([]);
  return Object.freeze(definition.satisfiers.map(id => SATISFIER_DEFINITIONS[id]).filter(Boolean).map(entry => createSatisfierOption({ satisfierId: entry.id, supports: entry.supports, impairs: entry.impairs, expectedEffects: effectBySatisfier[entry.id] || Object.fromEntries([...entry.supports.map(id => [id, id === needId ? .8 : .35]), ...entry.impairs.map(id => [id, -.35])]), confidence: confidenceBySatisfier[entry.id] ?? .6, available: availability[entry.id] !== false, evidenceIds: evidenceBySatisfier[entry.id] || [], methods: entry.methods })));
}
