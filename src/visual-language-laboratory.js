import { activeEmittedSignal, FACIAL_EXPRESSION_LEGEND, visibleExpression } from "./visual-language.js";
import { emittedSymbol, PUBLIC_SIGNAL_VARIANTS, signalAllowed } from "./symbol-registry.js";

const section = (id, title, description, keys) => Object.freeze({ id, title, description, keys: Object.freeze(keys) });

/**
 * Human-readable groupings for the complete facial-expression vocabulary.
 * These group observable appearances; they are not extra mental-state claims.
 */
export const EXPRESSION_LIBRARY_SECTIONS = Object.freeze([
  section("baseline-social", "Baseline, rest and affiliation", "Low-arousal and visibly social faces.", ["calm", "relaxed", "affiliative"]),
  section("attention", "Attention and orientation", "Observable changes in attention or sudden orientation.", ["alert", "focused", "startled"]),
  section("danger-conflict", "Danger, uncertainty and conflict", "Visible distress, fear, panic or aggression.", ["worried", "fear", "panic", "angry"]),
  section("health-exertion", "Health, exertion and fatigue", "Visible injury, strain, collapse, weariness or sleep.", ["pain", "dizzy", "strained", "exhausted", "weary", "sleepy"]),
  section("temperature", "Temperature stress", "Visible heat or cold stress, including dangerous extremes.", ["hot", "cold"])
]);

const expressionSectionByKey = new Map(EXPRESSION_LIBRARY_SECTIONS.flatMap(group => group.keys.map(key => [key, group])));
const signalVariantById = new Map(PUBLIC_SIGNAL_VARIANTS.map(variant => [variant.id, variant]));

export function expressionLibrarySection(key = "") {
  return expressionSectionByKey.get(key) || Object.freeze({ id: "other", title: "Other visible state", description: "An observable outward appearance." });
}

const livingAnimal = animal => animal && animal.alive !== false && Number(animal.health ?? 1) > 0;
const frozenUsage = usage => Object.freeze(Object.fromEntries([...usage].map(([key, value]) => [key, Object.freeze({ count: value.count, entities: Object.freeze([...value.entities]) })])));

/**
 * Produce a deliberately public projection for the live Laboratory view.
 * Animal objects, private predictions, memories and confidence ledgers never
 * leave this boundary.
 */
export function visualLanguagePopulationSnapshot(animals = [], tick = 0) {
  const living = animals.filter(livingAnimal);
  const expressionUsage = new Map(FACIAL_EXPRESSION_LEGEND.map(entry => [entry.key, { count: 0, entities: [] }]));
  const signalUsage = new Map(PUBLIC_SIGNAL_VARIANTS.map(entry => [entry.id, { count: 0, entities: [] }]));
  const emitters = [];

  for (const animal of living) {
    const expression = visibleExpression(animal, tick);
    const expressionRow = expressionUsage.get(expression.key) || { count: 0, entities: [] };
    expressionRow.count += 1;
    expressionRow.entities.push(String(animal.id || "unnamed"));
    expressionUsage.set(expression.key, expressionRow);

    const record = activeEmittedSignal(animal, tick);
    if (!record) continue;
    // The live Laboratory is a projection of admitted public evidence, not a
    // dump of any legacy or malformed socialSignal-shaped object. Reuse the
    // same contract gate as the world renderer before exposing a record.
    if (!signalAllowed(animal, record.kind, record)) continue;
    const signal = emittedSymbol(animal, record.kind, record), variant = signalVariantById.get(signal.id);
    const signalRow = signalUsage.get(signal.id) || { count: 0, entities: [] };
    signalRow.count += 1;
    signalRow.entities.push(String(animal.id || "unnamed"));
    signalUsage.set(signal.id, signalRow);
    emitters.push(Object.freeze({
      entityId: String(animal.id || "unnamed"),
      speciesId: String(animal.speciesId || "unknown"),
      lifeStage: String(animal.lifeStage || "unknown"),
      expressionKey: expression.key,
      expressionLabel: expression.label,
      expressionRole: expression.role,
      signalId: signal.id,
      signalLabel: signal.label,
      signalKind: String(record.kind),
      signalIntent: signal.intent || signal.contract?.intent || variant?.intent || "state",
      contractId: signal.contractId || variant?.contract || String(record.kind),
      source: variant?.source || "automatic-status",
      availability: variant?.availability || "active",
      vocal: Boolean(signal.vocal && Number(animal.vocalUntil || 0) > Number(tick))
    }));
  }

  const expressions = frozenUsage(expressionUsage), signals = frozenUsage(signalUsage);
  return Object.freeze({
    population: living.length,
    activeExpressionTypes: Object.values(expressions).filter(item => item.count > 0).length,
    activeSignalTypes: Object.values(signals).filter(item => item.count > 0).length,
    activePublicEmitters: emitters.length,
    vocalising: emitters.filter(item => item.vocal).length,
    expressionUsage: expressions,
    signalUsage: signals,
    emitters: Object.freeze(emitters.sort((left, right) => left.entityId.localeCompare(right.entityId)))
  });
}
