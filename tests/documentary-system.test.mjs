import test from "node:test";
import assert from "node:assert/strict";
import { BoundedTimeline, DocumentaryClock, DocumentaryIdFactory, DocumentaryRecorder, DocumentarySystem, EditorialWindowTracker, NarrationQueue, ShotStateMachine, StoryThreadManager, buildNarrationPacket, createDocumentaryRecord, fallbackNarration, renderControlledAccount, validateDocumentaryRecord, validateNarrationResult } from "../src/documentary/system.js";

const clock = () => { let now = 0; return { now: () => now, advance: value => { now += value; } }; };

test("canonical records validate and bounded timeline deduplicates", () => {
  const record = createDocumentaryRecord({ sessionId: "s1", recordId: "e1", recordType: "documentary_event", recordingTimeMs: 12, simulationTime: { tick: 2 }, payload: { type: "birth", state: "CONFIRMED", subjectIds: ["a"] } });
  assert.equal(validateDocumentaryRecord(record).valid, true);
  const timeline = new BoundedTimeline({ maximum: 2 });
  assert.equal(timeline.append(record), true); assert.equal(timeline.append(record), false);
  timeline.append({ ...record, recordId: "e2" }); timeline.append({ ...record, recordId: "e3" });
  assert.deepEqual(timeline.records.map(item => item.recordId), ["e2", "e3"]); assert.equal(timeline.dropped, 1);
});

test("documentary clock sync never moves session time backwards", () => {
  const time = clock(), session = new DocumentaryClock(time.now); session.start(0); time.advance(1000); assert.equal(session.elapsedMs(), 1000); session.applySync(900, time.now(), 1); assert.equal(session.elapsedMs(), 1000); time.advance(300); assert.equal(session.elapsedMs(), 1200);
});

test("story threads develop, rank, go dormant and preserve identity", () => {
  const time = clock(), sessionClock = new DocumentaryClock(time.now); sessionClock.start(); const ids = new DocumentaryIdFactory("test"), timeline = new BoundedTimeline(), recorder = new DocumentaryRecorder({ sessionId: "s1", clock: sessionClock, simulationTime: () => ({ tick: 1 }), timeline, idFactory: ids }), manager = new StoryThreadManager({ recorder, idFactory: ids, inactivityMs: 100, archiveMs: 1000 });
  const first = recorder.write("documentary_event", { type: "separation", state: "CONFIRMED", subjectIds: ["a", "b"], importance: .7 }), thread = manager.createFromEvent(first, { correlationKey: "family-a" }); assert.equal(thread.status, "CANDIDATE");
  time.advance(10); const second = recorder.write("documentary_event", { type: "distance_increasing", state: "CONFIRMED", subjectIds: ["a", "b"], importance: .8 }); assert.equal(manager.develop(thread.threadId, second).threadId, thread.threadId); assert.equal(thread.status, "DEVELOPING"); assert.equal(manager.ranked()[0].thread.threadId, thread.threadId);
  time.advance(150); manager.update(); assert.equal(thread.status, "DORMANT");
});

test("editorial classifier protects quiet context and separates empty footage", () => {
  const time = clock(), sessionClock = new DocumentaryClock(time.now); sessionClock.start(); const ids = new DocumentaryIdFactory("test"), recorder = new DocumentaryRecorder({ sessionId: "s1", clock: sessionClock, simulationTime: () => ({}), timeline: new BoundedTimeline(), idFactory: ids }), editorial = new EditorialWindowTracker({ recorder, idFactory: ids, sampleIntervalMs: 0, minimumWindowMs: 0 });
  assert.equal(editorial.classify({}).classification, "STAGNANT_REMOVE"); assert.equal(editorial.classify({ protectedContext: .8, quietMeaningful: true }).classification, "QUIET_KEEP"); assert.equal(editorial.classify({ majorHighlight: true }).classification, "MAJOR_HIGHLIGHT");
});

test("shot grammar holds outcome and consequence in order", () => {
  const shot = new ShotStateMachine(); assert.equal(shot.advance({}), "ESTABLISH"); assert.equal(shot.advance({}), "TRACK"); assert.equal(shot.advance({ outcome: true }), "HOLD_OUTCOME"); assert.equal(shot.advance({ reaction: true }), "REACTION"); assert.equal(shot.advance({ consequence: true }), "CONSEQUENCE"); assert.equal(shot.advance({ release: true }), "RELEASE");
});

test("narration validator rejects invented state, numbers and forbidden claims", () => {
  const packet = buildNarrationPacket({ requestId: "r1", thread: { threadId: "t1", phase: "ESCALATION", subjectIds: ["mara"] }, verifiedFacts: [{ factId: "f1", text: "Mara is 620 metres from the herd", subjectIds: ["mara"], evidenceIds: ["e1"] }], forbiddenClaims: ["Mara abandoned the herd"], minimumWords: 1, maximumWords: 30, deadlineMs: 1000 });
  const safe = { text: "Mara is 620 metres from the herd.", claims: [{ supportType: "VERIFIED_FACT", supportIds: ["f1"] }], mentionedSubjectIds: ["mara"] };
  assert.equal(validateNarrationResult(safe, packet, { nowMs: 10, knownSubjects: new Map([["mara", {}]]) }).valid, true);
  const unsafe = { ...safe, text: "Mara deliberately abandoned the herd and is frightened, 900 metres away." };
  const errors = validateNarrationResult(unsafe, packet, { nowMs: 10, knownSubjects: new Map([["mara", {}]]) }).errors.join(" "); assert.match(errors, /unsupported-number/); assert.match(errors, /unsupported-internal-state/);
  assert.match(fallbackNarration(packet).text, /620/);
});

test("narration queue is bounded and stale work is cancelled", () => {
  const queue = new NarrationQueue({ maximumReady: 1, maximumSpeculative: 1 }); assert.equal(queue.begin({ requestId: "a", expiresAtMs: 5 }), true); assert.equal(queue.begin({ requestId: "b" }), false); queue.readyItem("a", { text: "one", expiresAtMs: 5 }); queue.readyItem("b", { text: "two", expiresAtMs: 10 }); assert.equal(queue.ready.length, 1); assert.equal(queue.ready[0].requestId, "b"); queue.expire(11); assert.equal(queue.ready.length, 0);
});

test("chapter narration packets preserve time, provenance and a controlled account", () => {
  const developments = [
    { factId: "later", text: "The herd reached water", atMs: 200, source: "authoritative-event", epistemicStatus: "MEASURED_SIMULATION", subjectIds: ["h1"] },
    { factId: "earlier", text: "The herd crossed the plain", atMs: 100, source: "authoritative-event", epistemicStatus: "VISUALLY_OBSERVABLE", subjectIds: ["h1"] }
  ];
  const packet = buildNarrationPacket({ requestId: "summary-1", function: "SUMMARY", thread: { subjectIds: ["h1"], phase: "REFLECTION" }, verifiedFacts: developments, verifiedDevelopments: developments, chapterWindow: { startMs: 100, endMs: 200 }, perspective: { narratorAccess: "OMNISCIENT_SIMULATION" }, minimumWords: 5, maximumWords: 40 });
  assert.equal(packet.task, "render_longitudinal_documentary_overview");
  assert.deepEqual(packet.verifiedDevelopments.map(item => item.factId), ["earlier", "later"]);
  assert.equal(packet.verifiedDevelopments[0].epistemicStatus, "VISUALLY_OBSERVABLE");
  assert.equal(packet.controlledAccount, "The herd crossed the plain.\nThe herd reached water.");
  assert.equal(renderControlledAccount(developments), "The herd reached water.\nThe herd crossed the plain.");
});

test("validator rejects unsupported deterministic outcome framing", () => {
  const packet = buildNarrationPacket({ requestId: "summary-2", function: "SUMMARY", thread: { subjectIds: ["h1"] }, verifiedFacts: [{ factId: "f1", text: "The herd is moving", subjectIds: ["h1"] }], minimumWords: 3, maximumWords: 30 });
  const result = { text: "Everything now depends on the herd reaching water.", claims: [{ surfaceText: "Everything now depends", supportType: "VERIFIED_FACT", supportIds: ["f1"] }], mentionedSubjectIds: ["h1"] };
  assert.equal(validateNarrationResult(result, packet).valid, false);
  assert.ok(validateNarrationResult(result, packet).errors.includes("unsupported-outcome-framing"));
});

test("system observes authoritative events and degrades without companion", async () => {
  const sim = { seed: 42, tick: 1, day: 1, animals: [{ id: "a", speciesId: "grazer" }] }, system = new DocumentarySystem({ simulation: () => sim, companion: { url: "ws://127.0.0.1:1" } }); await system.initialise(); system.start({ recordingMode: "metadata" }); const observed = system.observe("birth", { subjectIds: ["a"], importance: .9, facts: [{ claim: "A was born", level: "DIRECT" }] }); assert.equal(observed.thread.subjectIds[0], "a"); assert.equal(system.health().threads, 1); const result = system.stop(); assert.equal(result.status, "COMPLETE"); system.client.close();
});
