import { CAUSAL_LEVELS, NARRATION_FUNCTIONS } from "./schemas.js";

const words = value => String(value || "").trim().split(/\s+/).filter(Boolean);
const normalize = value => String(value || "").toLowerCase().replace(/[^a-z0-9.\s-]/g, " ").replace(/\s+/g, " ").trim();

export function renderControlledAccount(developments = []) {
  return developments.map(item => String(item.text || item.claim || "").trim().replace(/[.!?]?$/, ".")).filter(Boolean).join("\n");
}

export function buildNarrationPacket({ requestId, function: narrationFunction = "OBSERVATION", thread, camera = {}, verifiedFacts = [], verifiedDevelopments, verifiedChanges = [], unresolvedFacts = [], chapterWindow = null, perspective = {}, permittedInterpretations = [], permittedPredictions = [], forbiddenClaims = [], recentTopics = [], targetWords = 36, minimumWords = 12, maximumWords = 52, deadlineMs, tone = "observational, restrained, scientifically grounded" }) {
  if (!NARRATION_FUNCTIONS.includes(narrationFunction)) throw new TypeError(`Unknown narration function ${narrationFunction}`);
  const facts = verifiedFacts.map(item => ({ factId: item.factId, text: item.text, atMs: Number.isFinite(item.atMs) ? item.atMs : null, source: item.source || "simulation", epistemicStatus: item.epistemicStatus || "MEASURED_SIMULATION", uncertainty: item.uncertainty || null, subjectIds: [...(item.subjectIds || [])], evidenceIds: [...(item.evidenceIds || [])] }));
  const developments = (verifiedDevelopments || facts).map(item => ({ factId: item.factId, text: item.text, atMs: Number.isFinite(item.atMs) ? item.atMs : null, source: item.source || "simulation", epistemicStatus: item.epistemicStatus || "MEASURED_SIMULATION", uncertainty: item.uncertainty || null, narrativeRole: item.narrativeRole || null, subjectIds: [...(item.subjectIds || [])], evidenceIds: [...(item.evidenceIds || [])] })).sort((left, right) => (left.atMs ?? 0) - (right.atMs ?? 0));
  developments.forEach((item, index) => { if (!item.narrativeRole) item.narrativeRole = index === 0 ? "EARLIER_STATE" : index === developments.length - 1 ? "PRESENT_SITUATION" : "DEVELOPMENT"; });
  return { schemaVersion: 1, requestId, task: narrationFunction === "SUMMARY" ? "render_longitudinal_documentary_overview" : "render_documentary_narration", style: "Controlled Cinematic Naturalism", function: narrationFunction, tone, targetWords, minimumWords, maximumWords, deadlineMs, chapterWindow: chapterWindow ? { startMs: chapterWindow.startMs, endMs: chapterWindow.endMs } : null, thread: { threadId: thread?.threadId || null, question: thread?.question || null, phase: thread?.phase || null, subjectIds: [...(thread?.subjectIds || [])] }, camera: { ...camera }, perspective: { narratorAccess: perspective.narratorAccess || "OMNISCIENT_SIMULATION", animalKnowledgeRequiresPerceptionEvidence: perspective.animalKnowledgeRequiresPerceptionEvidence !== false, ...perspective }, verifiedFacts: facts, verifiedDevelopments: developments, verifiedChanges: verifiedChanges.map(item => typeof item === "string" ? { text: item, evidenceIds: [] } : { text: item.text, evidenceIds: [...(item.evidenceIds || [])] }), unresolvedFacts: unresolvedFacts.map(item => typeof item === "string" ? { text: item, evidenceIds: [] } : { text: item.text, evidenceIds: [...(item.evidenceIds || [])] }), controlledAccount: renderControlledAccount(developments), permittedInterpretations: permittedInterpretations.map(item => ({ interpretationId: item.interpretationId, text: item.text, causalLevel: item.causalLevel })), permittedPredictions: permittedPredictions.map(item => ({ predictionId: item.predictionId, text: item.text })), forbiddenClaims: [...forbiddenClaims], recentTopics: recentTopics.slice(-16) };
}

const CAUSAL_PATTERNS = [
  { pattern: /\b(caused|forced|made|because of|therefore|as a result)\b/i, minimum: "DETERMINISTIC" },
  { pattern: /\b(appears to|is likely to|may be|might be|could be)\b/i, minimum: "EDITORIAL_HYPOTHESIS" }
];
const levelRank = level => CAUSAL_LEVELS.indexOf(level);

export function validateNarrationResult(result, packet, { nowMs = 0, knownSubjects = new Map() } = {}) {
  const errors = [], text = String(result?.text || "").trim(), outputWords = words(text), allowedIds = new Set(packet.thread.subjectIds), factIds = new Set(packet.verifiedFacts.map(item => item.factId)), interpretationIds = new Set(packet.permittedInterpretations.map(item => item.interpretationId)), predictionIds = new Set(packet.permittedPredictions.map(item => item.predictionId));
  if (!text) errors.push("empty-text");
  if (outputWords.length < packet.minimumWords) errors.push("below-minimum-words");
  if (outputWords.length > packet.maximumWords) errors.push("above-maximum-words");
  if (Number.isFinite(packet.deadlineMs) && nowMs > packet.deadlineMs) errors.push("expired");
  if (!Array.isArray(result?.claims) || !Array.isArray(result?.mentionedSubjectIds)) errors.push("invalid-structure");
  for (const id of result?.mentionedSubjectIds || []) if (!allowedIds.has(id) || knownSubjects.size && !knownSubjects.has(id)) errors.push(`unknown-subject:${id}`);
  for (const claim of result?.claims || []) { const ids = claim.supportIds || []; if (claim.supportType === "VERIFIED_FACT" && ids.some(id => !factIds.has(id))) errors.push("unknown-fact-support"); else if (claim.supportType === "PERMITTED_INTERPRETATION" && ids.some(id => !interpretationIds.has(id))) errors.push("unknown-interpretation-support"); else if (claim.supportType === "PERMITTED_PREDICTION" && ids.some(id => !predictionIds.has(id))) errors.push("unknown-prediction-support"); else if (!ids.length) errors.push("unsupported-claim"); }
  const normalizedText = normalize(text); for (const forbidden of packet.forbiddenClaims) if (normalizedText.includes(normalize(forbidden))) errors.push("forbidden-claim");
  const numbers = text.match(/\b\d+(?:\.\d+)?\b/g) || [], allowedNumbers = new Set(packet.verifiedFacts.flatMap(item => item.text.match(/\b\d+(?:\.\d+)?\b/g) || [])); for (const number of numbers) if (!allowedNumbers.has(number)) errors.push(`unsupported-number:${number}`);
  const causalEvidence = packet.permittedInterpretations.map(item => item.causalLevel); for (const rule of CAUSAL_PATTERNS) if (rule.pattern.test(text) && !causalEvidence.some(level => levelRank(level) >= 0 && levelRank(level) <= levelRank(rule.minimum))) errors.push("causal-strength-violation");
  if (/\b(feels?|wants?|hopes?|afraid|frightened|deliberately|intends?|knows?|unaware)\b/i.test(text) && !packet.verifiedFacts.some(item => /feel|want|hope|fear|fright|deliber|intend|know|aware/i.test(item.text))) errors.push("unsupported-internal-state");
  if (/\b(everything (?:now )?depends|only chance|certain to|inevitable|doomed|cannot survive|will die)\b/i.test(text) && !packet.permittedPredictions.length) errors.push("unsupported-outcome-framing");
  if (/```|<\/|\b(as an ai|analysis:|system prompt|json schema)\b/i.test(text)) errors.push("model-commentary");
  return { valid: errors.length === 0, errors: [...new Set(errors)], wordCount: outputWords.length, text };
}

export function fallbackNarration(packet) {
  const available = packet.verifiedFacts.filter(item => item.text), selected = []; let count = 0;
  for (const fact of available) { const size = words(fact.text).length; if (selected.length && count + size > packet.maximumWords) break; selected.push(fact); count += size; if (packet.function !== "SUMMARY" && selected.length >= 2 || packet.function === "SUMMARY" && count >= packet.minimumWords) break; }
  if (!selected.length) selected.push({ factId: "fallback-scene", text: "The scene continues to develop." });
  const text = selected.map(item => item.text.replace(/[.!?]?$/, ".")).join(" "), limited = words(text).slice(0, packet.maximumWords).join(" ");
  return { text: limited, claims: selected.filter(item => item.factId !== "fallback-scene").map(item => ({ surfaceText: item.text, supportType: "VERIFIED_FACT", supportIds: [item.factId] })), mentionedSubjectIds: [...packet.thread.subjectIds], usedInterpretationIds: [], usedPredictionIds: [], wordCount: words(limited).length, fallback: true };
}

export class TopicMemory {
  constructor(maximum = 40) { this.maximum = maximum; this.items = []; }
  remember(topic, atMs) { const normalized = normalize(topic); if (!normalized) return; this.items = this.items.filter(item => item.topic !== normalized); this.items.push({ topic: normalized, atMs }); if (this.items.length > this.maximum) this.items.splice(0, this.items.length - this.maximum); }
  recent(atMs, windowMs = 180000) { return this.items.filter(item => atMs - item.atMs <= windowMs).map(item => item.topic); }
}

export class NarrationQueue {
  constructor({ maximumReady = 1, maximumSpeculative = 1 } = {}) { this.maximumReady = maximumReady; this.maximumSpeculative = maximumSpeculative; this.nowPlaying = null; this.ready = []; this.generating = []; this.history = []; }
  begin(request) { if (this.generating.length >= this.maximumSpeculative) return false; this.generating.push({ ...request, status: "GENERATING" }); return true; }
  readyItem(requestId, item) { this.generating = this.generating.filter(entry => entry.requestId !== requestId); if (this.ready.length >= this.maximumReady) this.cancel(this.ready[0].requestId, "replaced"); this.ready.push({ ...item, requestId, status: "READY_NEXT" }); return this.ready.at(-1); }
  play(nowMs) { const item = this.ready.shift(); if (!item) return null; this.nowPlaying = { ...item, status: "NOW_PLAYING", audioStartedAtMs: nowMs }; return this.nowPlaying; }
  finish(nowMs) { if (!this.nowPlaying) return null; const item = { ...this.nowPlaying, status: "COMPLETED", audioEndedAtMs: nowMs }; this.history.push(item); this.nowPlaying = null; return item; }
  cancel(requestId, reason = "cancelled") { const collections = [this.ready, this.generating]; for (const collection of collections) { const index = collection.findIndex(item => item.requestId === requestId); if (index >= 0) { const [item] = collection.splice(index, 1); this.history.push({ ...item, status: "CANCELLED", reason }); return item; } } return null; }
  expire(nowMs) { for (const item of [...this.ready, ...this.generating]) if (Number.isFinite(item.expiresAtMs) && item.expiresAtMs < nowMs) this.cancel(item.requestId, "expired"); }
  pauseForHuman(active) { this.humanSpeaking = Boolean(active); }
}
