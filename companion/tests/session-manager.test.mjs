import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionManager, confined } from "../src/session-manager.js";
import { ExportManager } from "../src/export-manager.js";

const record = id => ({ schemaVersion: 1, sessionId: "run-test", recordId: id, recordType: "documentary_event", recordingTimeMs: 10, simulationTime: { tick: 1 }, createdAtUtc: new Date().toISOString(), source: "test", payload: { type: "birth", state: "CONFIRMED", subjectIds: ["a"] }, evidence: [] });

test("session writer is append-only, idempotent and finalizes", async () => {
  const root = await mkdtemp(join(tmpdir(), "doc-session-")), manager = new SessionManager({ sessionsDir: root }); await manager.initialise(); const session = await manager.start({ sessionId: "run-test", metadata: { title: "Test" } });
  assert.deepEqual(await manager.append(session.id, "batch-1", [record("a")]), { accepted: 1, duplicate: false }); assert.deepEqual(await manager.append(session.id, "batch-1", [record("a")]), { accepted: 0, duplicate: true });
  await manager.stop(session.id); const lines = (await readFile(join(session.root, "timeline", "events.jsonl"), "utf8")).trim().split("\n"); assert.equal(lines.length, 1); assert.ok((await readdir(session.root)).includes(".complete"));
});

test("session paths cannot escape their configured root", async () => {
  const root = await mkdtemp(join(tmpdir(), "doc-confine-")); assert.throws(() => confined(root, "..", "escape"), /escapes/);
});

test("finalized sessions produce non-destructive editing exports", async () => {
  const root = await mkdtemp(join(tmpdir(), "doc-export-")), manager = new SessionManager({ sessionsDir: root }); await manager.initialise(); const session = await manager.start({ sessionId: "run-export", metadata: { title: "Export" } }), editorial = { ...record("window"), sessionId: session.id, recordType: "editorial_window", payload: { windowId: "w1", classification: "HIGHLIGHT", startMs: 1000, endMs: 3000, score: .9, reasons: ["birth"] } }; await manager.append(session.id, "batch-export", [editorial]); const finalized = await manager.stop(session.id), result = await new ExportManager().generate(finalized); assert.equal(result.highlights, 1); const roughCut = JSON.parse(await readFile(join(session.root, "editing", "rough-cut-plan.json"), "utf8")); assert.equal(roughCut.sourceUnmodified, true); assert.equal(roughCut.segments[0].classification, "HIGHLIGHT"); assert.match(await readFile(join(session.root, "reports", "editing-report.html"), "utf8"), /Editing report/);
});
