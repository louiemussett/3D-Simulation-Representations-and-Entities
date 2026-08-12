import { validatePresentationContract } from "./contract-validator.js";

export function realiseDeterministicContract({ contract, context, propositions, evidence, policy, audienceMemory = null, compose }) {
  const validation = validatePresentationContract(contract, { propositions, evidence, policy, tick: context?.tick ?? Infinity });
  if (!validation.valid || contract?.narration?.mode === "SILENCE") return { text: "", claimIds: [], propositionIds: [], evidenceIds: [], subjectIds: contract?.subjectIds || [], speakerFocus: null, validation, fallback: true, source: "silence", silenceReason: validation.valid ? "contract-requested-silence" : "contract-invalid" };
  const licensed = (contract.allowedClaimIds || []).map(id => propositions.get(id)).filter(Boolean), novel = licensed.filter(claim => !audienceMemory?.hasClaim?.(claim, context?.tick));
  if (contract.narration.requireNewInformation && audienceMemory && !novel.length) return { text: "", claimIds: [], propositionIds: [], evidenceIds: [], subjectIds: contract.subjectIds, speakerFocus: null, validation, fallback: true, source: "silence", silenceReason: "no-materially-new-licensed-claim" };
  const maximum = contract.narration.maximumSentences || 4, claims = prioritizeClaims(novel.length ? novel : licensed, contract).slice(0, Math.max(1, maximum * 2)), composed = compose?.({ ...context, licensedClaims: claims, contract }) || {}, composedText = String(composed.text || composed || ""), sentenceLicenses = composed.claimIdsBySentence;
  const composedIsLicensed = Array.isArray(sentenceLicenses) && sentenceLicenses.length > 0 && sentenceLicenses.every(ids => Array.isArray(ids) && ids.length && ids.every(id => contract.allowedClaimIds.includes(id)));
  const realised = composedIsLicensed ? { text: limitSentences(composedText, maximum), claimIds: [...new Set(sentenceLicenses.flat())], source: "licensed-external-realiser", fallback: composed.fallback ?? false } : realiseClaims(claims, { maximum, contract, context });
  const selectedClaims = realised.claimIds.map(id => propositions.get(id)).filter(Boolean), evidenceIds = [...new Set(selectedClaims.flatMap(item => item.evidenceIds || []))];
  return { ...composed, ...realised, propositionIds: realised.claimIds, evidenceIds, subjectIds: contract.subjectIds, speakerFocus: observableSpeakerFocus(licensed, contract), validation, silenceReason: realised.text ? null : "realiser-produced-no-text" };
}

export function observableSpeakerFocus(claims = [], contract = {}) {
  const orderedIds = [...new Set([...(contract.camera?.primarySubjects || []), ...(contract.narration?.subjectIds || []), ...(contract.subjectIds || [])].map(String))];
  const expressionBySubject = new Map(), callBySubject = new Map();
  for (const claim of claims) {
    const subjectId = String(claim.subjectIds?.[0] || "");
    if (!subjectId || !orderedIds.includes(subjectId)) continue;
    const value = claim.normalizedArguments || {};
    if (claim.predicate === "entity.expression.current") {
      const source = value.expression, kind = source?.kind || source?.label || (typeof source === "string" ? source : null);
      if (kind) expressionBySubject.set(subjectId, Object.freeze({ kind: String(kind), label: source?.label ? String(source.label) : null, observable: true }));
    }
    if (claim.predicate === "entity.communication.current") {
      const source = value.emitted, kind = source?.kind || source?.label || (typeof source === "string" ? source : null);
      if (kind) callBySubject.set(subjectId, Object.freeze({ kind: String(kind), urgency: finiteOrNull(source?.urgency), channel: source?.channel ? String(source.channel) : null, vocal: Boolean(source?.vocal), observable: true }));
    }
  }
  const subjectId = orderedIds.find(id => callBySubject.has(id)) || orderedIds.find(id => expressionBySubject.has(id));
  if (!subjectId) return null;
  return Object.freeze({
    subjectId,
    basis: callBySubject.has(subjectId) ? "OBSERVABLE_CALL" : "OBSERVABLE_EXPRESSION",
    expression: expressionBySubject.get(subjectId) || null,
    call: callBySubject.get(subjectId) || null,
    privateThought: null
  });
}

function realiseClaims(claims, { maximum, contract }) {
  const identity = new Map(claims.filter(claim => /identity/.test(claim.predicate)).flatMap(claim => claim.subjectIds.map(id => [id, claim.normalizedArguments?.name || claim.normalizedArguments?.identityId || id]))), sentences = [];
  for (const claim of claims) {
    if (sentences.length >= maximum) break;
    const text = sentenceForClaim(claim, identity, contract);
    if (text) sentences.push({ text, claimId: claim.claimId });
  }
  return { text: sentences.map(item => item.text).join(" "), claimIds: sentences.map(item => item.claimId), source: "licensed-claim-realiser", fallback: true };
}

function sentenceForClaim(claim, identity, contract) {
  const value = claim.normalizedArguments || {}, name = identity.get(claim.subjectIds?.[0]) || value.name || claim.subjectIds?.[0] || "This animal", predicate = claim.predicate;
  if (predicate === "entity.identity") return `${name} is ${joinWords(value.lifeStage, value.sex, value.speciesId) || "an identified animal"}.`;
  if (predicate === "entity.remains.identity") return `${name}'s ${plain(value.stage || "remains")} remain here${value.cause ? ` after ${plain(value.cause)}` : ""}.`;
  if (predicate === "entity.action.current") return `${name} is ${plain(value.label || value.key || "active")}${value.intendedOutcome ? ` to ${plain(value.intendedOutcome)}` : ""}${value.reason ? ` because ${plain(value.reason)}` : ""}.`;
  if (predicate === "entity.plan.current") return `${name}'s present method is ${plain(value.methodId || "still forming")}${value.needId ? `, serving ${plain(value.needId)}` : ""}${value.phase ? `; it is now in the ${plain(value.phase)} phase` : ""}.`;
  if (predicate === "entity.movement.current") { const speed = Math.hypot(Number(value.velocity?.x || 0), Number(value.velocity?.z || 0)); return `${name} is ${speed > .12 ? "moving quickly" : speed > .025 ? "moving steadily" : "nearly stationary"}${value.movement?.blocked ? ", with its route blocked" : ""}.`; }
  if (predicate === "entity.physiology.current") return `${name}'s condition is ${physiologySummary(value)}.`;
  if (predicate === "entity.expression.current") { const expression = value.expression?.kind || value.expression?.label || (typeof value.expression === "string" ? value.expression : null), posture = value.posture?.kind || value.posture?.label || value.posture?.activity || value.posture?.headMovement || (typeof value.posture === "string" ? value.posture : null); return expression || posture ? `${name} visibly shows ${plain(expression || posture)}${expression && posture ? ` in a ${plain(posture)} posture` : ""}—an outward cue, not evidence of a private thought.` : ""; }
  if (predicate === "entity.communication.current") { const emitted = value.emitted?.kind || value.emitted?.label || (typeof value.emitted === "string" ? value.emitted : null); return emitted ? `${name} gives ${article(`${plain(emitted)} public signal`)}.` : ""; }
  if (predicate === "entity.perception.current") return collectionSentence(name, "is registering", value);
  if (predicate === "entity.memory.current") return collectionSentence(name, "retains", value, "memory record");
  if (predicate === "entity.relationships.current") return collectionSentence(name, "has", value.relationships || value.social, "recorded social connection");
  if (predicate === "entity.reproduction.current") { const preferences = value.matePreferences || value.mateGraph; return preferences && Object.keys(preferences).length ? `${name}'s mate assessment currently weighs ${Object.keys(preferences).slice(0, 3).map(plain).join(", ")}.` : ""; }
  if (predicate === "entity.lineage.current") { const count = value.offspringIds?.length || 0; return count ? `${name} has ${count} recorded ${count === 1 ? "offspring" : "offspring"} in the lineage archive.` : ""; }
  if (predicate === "world.current") { const weather = value.weather?.type || value.weather?.kind || "current weather", hydrology = value.hydrology || {}; return `Across the world, ${plain(weather)} accompanies a population of ${Number(value.population || 0)}${Number.isFinite(Number(hydrology.runoff)) ? `; runoff is ${band(hydrology.runoff, .25, .6)}` : ""}.`; }
  if (predicate === "environment.cell.current") return `At this location, ${terrainSummary(value)}.`;
  if (predicate.startsWith("event.")) return String(value.detail || `A verified ${plain(predicate.slice(6))} event has occurred`).replace(/[.!?]?$/, ".");
  if (predicate === "entity.archive.current" || predicate === "entity.remains.archive") return archiveSentence(name, value);
  return contract.narration.function === "RESOLUTION" ? `The verified state of ${name} has materially changed.` : "";
}

function physiologySummary(value) { const rows = []; if (Number.isFinite(Number(value.energy))) rows.push(`${band(value.energy, 35, 68)} usable energy`); if (Number.isFinite(Number(value.hydration))) rows.push(`${band(value.hydration, 35, 70)} hydration`); if (Number.isFinite(Number(value.fatigue))) rows.push(`${band(value.fatigue, 35, 70)} fatigue`); if (value.recoveryDepth) rows.push(`${plain(value.recoveryDepth)} recovery`); if (Number(value.adrenalineStress || 0) > 20) rows.push(`${band(value.adrenalineStress, 35, 70)} adrenaline stress`); return rows.slice(0, 3).join(", ") || "not yet fully measured"; }
function terrainSummary(value) { const parts = []; if (value.waterDepth > 0) parts.push(`${band(value.waterDepth, .15, .75)} surface water`); if (value.plantBiomass != null) parts.push(`${band(value.plantBiomass, .2, .65)} plant biomass`); if (value.moisture != null) parts.push(`${band(value.moisture, .25, .7)} ground moisture`); return parts.join(", ") || "the recorded terrain state is stable"; }
function archiveSentence(name, value) { const keys = ["drive", "currentAction", "lifeStage", "thermalStatus"].filter(key => value[key] != null); return keys.length ? `${name}'s Laboratory archive records ${keys.slice(0, 3).map(key => `${plain(key)} ${plain(value[key])}`).join(", ")}.` : ""; }
function collectionSentence(name, verb, value, fallback = "record") { const count = Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : Number(Boolean(value)); return count ? `${name} ${verb} ${count} ${count === 1 ? fallback : `${fallback}s`}.` : ""; }
function band(value, low, high) { const number = Number(value); return number < low ? "low" : number > high ? "high" : "moderate"; }
function plain(value) { return String(value ?? "").replaceAll("_", " ").replaceAll("-", " ").replace(/\s+/g, " ").trim().toLowerCase(); }
function joinWords(...values) { return values.filter(Boolean).map(plain).join(" "); }
function article(text) { return `${/^[aeiou]/i.test(text) ? "an" : "a"} ${text}`; }
function finiteOrNull(value) { return Number.isFinite(Number(value)) ? Number(value) : null; }
function prioritizeClaims(claims, contract) { const order = predicate => /^event\./.test(predicate) ? 0 : /identity/.test(predicate) ? 1 : /action/.test(predicate) ? 2 : /plan/.test(predicate) ? 3 : /physiology/.test(predicate) ? 4 : /communication|expression/.test(predicate) ? 5 : /perception|memory|relationships|reproduction/.test(predicate) ? 6 : /world|environment/.test(predicate) ? 7 : 8; return [...claims].sort((left, right) => order(left.predicate) - order(right.predicate) || Number(contract.subjectIds?.includes(right.subjectIds?.[0])) - Number(contract.subjectIds?.includes(left.subjectIds?.[0])) || left.claimId.localeCompare(right.claimId)); }
function limitSentences(text, maximum) { const matches = text.trim().match(/[^.!?]+[.!?]+|[^.!?]+$/g) || []; return matches.slice(0, maximum).join(" ").replace(/\s+/g, " ").trim(); }
