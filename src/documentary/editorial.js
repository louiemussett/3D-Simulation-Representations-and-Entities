import { EDITORIAL_CLASSES, SHOT_PHASES } from "./schemas.js";

const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

export function calculateEditorialActivity(input = {}) {
  const weights = { visualActivity: .12, eventActivity: .18, storyDevelopment: .2, systemicChange: .12, explanatoryPotential: .1, emotionalRelevance: .08, characterImportance: .07, narrationValue: .05, cameraQuality: .04, protectedContext: .04 };
  const breakdown = {}; let score = 0;
  for (const [key, weight] of Object.entries(weights)) { breakdown[key] = clamp01(input[key]) * weight; score += breakdown[key]; }
  return { score: clamp01(score), breakdown };
}

export class EditorialWindowTracker {
  constructor({ recorder, idFactory, sampleIntervalMs = 500, minimumWindowMs = 3000, mergeGapMs = 1800 } = {}) { this.recorder = recorder; this.idFactory = idFactory; this.sampleIntervalMs = sampleIntervalMs; this.minimumWindowMs = minimumWindowMs; this.mergeGapMs = mergeGapMs; this.current = null; this.lastSampleMs = -Infinity; this.completed = []; }
  classify(input = {}) { const { score, breakdown } = calculateEditorialActivity(input); let classification = "ACTIVE"; if (input.majorHighlight) classification = "MAJOR_HIGHLIGHT"; else if (input.highlight || score >= .72) classification = "HIGHLIGHT"; else if (input.protectedContext >= .55 || input.quietMeaningful) classification = "QUIET_KEEP"; else if (score < .13) classification = "STAGNANT_REMOVE"; else if (score < .28) classification = "STAGNANT_COMPRESS"; return { classification, score, breakdown, reasons: Object.entries(input).filter(([, value]) => Number(value) > .55 || value === true).map(([key]) => key) }; }
  sample(input = {}, atMs = this.recorder.time()) { if (atMs - this.lastSampleMs < this.sampleIntervalMs) return this.current; this.lastSampleMs = atMs; const result = this.classify(input); if (!this.current) this.current = { windowId: this.idFactory.next("window"), startMs: atMs, endMs: null, ...result, samples: 1 }; else if (this.current.classification === result.classification) { this.current.endMs = atMs; this.current.score = (this.current.score * this.current.samples + result.score) / (this.current.samples + 1); this.current.samples += 1; this.current.reasons = [...new Set([...this.current.reasons, ...result.reasons])]; } else { this.close(atMs); this.current = { windowId: this.idFactory.next("window"), startMs: atMs, endMs: null, ...result, samples: 1 }; } return this.current; }
  close(atMs = this.recorder.time()) { if (!this.current) return null; this.current.endMs = Math.max(this.current.startMs, atMs); if (this.current.endMs - this.current.startMs >= this.minimumWindowMs || ["HIGHLIGHT", "MAJOR_HIGHLIGHT"].includes(this.current.classification)) { const previous = this.completed.at(-1); if (previous && previous.classification === this.current.classification && this.current.startMs - previous.endMs <= this.mergeGapMs) { previous.endMs = this.current.endMs; previous.samples += this.current.samples; previous.reasons = [...new Set([...previous.reasons, ...this.current.reasons])]; } else this.completed.push({ ...this.current }); const saved = this.completed.at(-1); this.recorder.write("editorial_window", { ...saved }); } const closed = this.current; this.current = null; return closed; }
}

export class MetadataReplayBuffer {
  constructor({ maximumDurationMs = 120000, maximumRecords = 4000 } = {}) { this.maximumDurationMs = maximumDurationMs; this.maximumRecords = maximumRecords; this.records = []; }
  push(record) { this.records.push(record); const cutoff = record.recordingTimeMs - this.maximumDurationMs; while (this.records.length > this.maximumRecords || this.records[0]?.recordingTimeMs < cutoff) this.records.shift(); }
  window(startMs, endMs) { return this.records.filter(record => record.recordingTimeMs >= startMs && record.recordingTimeMs <= endMs); }
  describeReplay({ sourceStartMs, sourceEndMs, presentationStartMs }) { return { replayId: `replay-${Math.round(presentationStartMs)}`, sourceStartMs, sourceEndMs, presentationStartMs, durationMs: Math.max(0, sourceEndMs - sourceStartMs), labelledLive: false, records: this.window(sourceStartMs, sourceEndMs).map(record => record.recordId) }; }
}

export class ShotStateMachine {
  constructor() { this.phase = "ACQUIRE"; this.history = []; }
  reset(reason = "new-shot") { this.phase = "ACQUIRE"; this.history = [{ phase: this.phase, reason }]; return this.phase; }
  advance(context = {}) { const index = SHOT_PHASES.indexOf(this.phase); let next = this.phase; if (context.emergency && index < SHOT_PHASES.indexOf("TRACK")) next = "TRACK"; else if (context.outcome) next = "HOLD_OUTCOME"; else if (context.reaction && index < SHOT_PHASES.indexOf("REACTION")) next = "REACTION"; else if (context.consequence && index < SHOT_PHASES.indexOf("CONSEQUENCE")) next = "CONSEQUENCE"; else if (context.release) next = "RELEASE"; else next = SHOT_PHASES[Math.min(SHOT_PHASES.length - 1, index + 1)]; if (next !== this.phase) { this.phase = next; this.history.push({ phase: next, reason: context.reason || "grammar-advance" }); } return this.phase; }
}

export class DocumentaryPortfolioDirector {
  constructor({ recorder, idFactory, minimumTenureMs = 8000, cooldownMs = 3500, handoffMargin = .12 } = {}) { this.recorder = recorder; this.idFactory = idFactory; this.minimumTenureMs = minimumTenureMs; this.cooldownMs = cooldownMs; this.handoffMargin = handoffMargin; this.active = null; this.lastCutAtMs = -Infinity; }
  choose(ranked, { emergency = false, forcedThreadId = null, nowMs = this.recorder.time() } = {}) { const alternatives = ranked.map(item => ({ threadId: item.thread.threadId, score: item.total, breakdown: item.breakdown })); let selected = forcedThreadId ? ranked.find(item => item.thread.threadId === forcedThreadId) : ranked[0]; if (!selected) return null; const activeRank = this.active ? ranked.find(item => item.thread.threadId === this.active.threadId) : null, tenure = nowMs - (this.active?.startedAtMs ?? -Infinity), cooldown = nowMs - this.lastCutAtMs < this.cooldownMs; if (activeRank && !emergency && !forcedThreadId && (tenure < this.minimumTenureMs || cooldown || selected.total < activeRank.total + this.handoffMargin)) selected = activeRank; const changed = selected.thread.threadId !== this.active?.threadId; const interruptionLevel = emergency ? "EMERGENCY_OVERRIDE" : changed && this.active ? "FULL_HANDOFF" : changed ? "PREVIEW" : "BACKGROUND_UPDATE"; const decision = { decisionId: this.idFactory.next("camera"), status: "REQUESTED", threadId: selected.thread.threadId, previousThreadId: this.active?.threadId || null, reason: forcedThreadId ? "operator-force-follow" : emergency ? "emergency-override" : changed ? "ranked-handoff" : "narrative-inertia", interruptionLevel, score: selected.total, scoreBreakdown: selected.breakdown, alternatives, selectedAtMs: nowMs };
    if (changed) { this.active = { threadId: selected.thread.threadId, startedAtMs: nowMs }; this.lastCutAtMs = nowMs; } this.recorder.write("camera_decision", decision, { evidence: selected.thread.evidenceIds }); return decision;
  }
}

export function cameraFeasibility(input = {}) {
  const occlusion = clamp01(input.occlusion), dispersion = clamp01(input.dispersion), travel = clamp01(input.cameraTravel), framing = clamp01(input.framing ?? .7), readability = clamp01(input.readability ?? .7), leadTime = clamp01(input.leadTime ?? .5), score = clamp01(framing * .27 + readability * .27 + leadTime * .16 + (1 - occlusion) * .16 + (1 - dispersion) * .08 + (1 - travel) * .06); return { score, safe: score >= .32 && occlusion < .85, reasons: [occlusion > .6 && "occlusion", dispersion > .7 && "subject-dispersion", travel > .7 && "camera-travel", framing < .3 && "framing", readability < .3 && "readability"].filter(Boolean) };
}
