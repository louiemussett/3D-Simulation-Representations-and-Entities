import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const sessionsRoot = process.env.DOCUMENTARY_SESSIONS_DIR || "B:\\LivingLaboratory\\DocumentarySessions";
async function latestSession() { const entries = await readdir(sessionsRoot, { withFileTypes: true }); const directories = await Promise.all(entries.filter(entry => entry.isDirectory()).map(async entry => ({ path: join(sessionsRoot, entry.name), changed: (await stat(join(sessionsRoot, entry.name))).mtimeMs }))); return directories.sort((a, b) => b.changed - a.changed)[0]?.path; }
const root = resolve(process.argv[2] || await latestSession() || "");
if (!root) throw new Error(`No documentary session found beneath ${sessionsRoot}`);
const manifest = JSON.parse(await readFile(join(root, "session.json"), "utf8"));
let complete = false; try { await stat(join(root, ".complete")); complete = true; } catch {}
const timelineRoot = join(root, "timeline"); let timelineFiles = []; try { timelineFiles = (await readdir(timelineRoot)).filter(name => name.endsWith(".jsonl")); } catch {}
const counts = {}, ids = new Set(), duplicateRecordIds = []; let invalidLines = 0;
for (const name of timelineFiles) { const lines = (await readFile(join(timelineRoot, name), "utf8")).split(/\r?\n/).filter(Boolean); counts[name] = lines.length; for (const line of lines) try { const record = JSON.parse(line); if (record.recordId && ids.has(record.recordId)) duplicateRecordIds.push(record.recordId); if (record.recordId) ids.add(record.recordId); } catch { invalidLines += 1; } }
let narrationFiles = []; try { narrationFiles = (await readdir(join(root, "narration"))).filter(name => name.endsWith(".wav")); } catch {}
const checks = { completionMarker: complete, terminalStatus: ["COMPLETE", "ABANDONED"].includes(manifest.status), timelinePresent: timelineFiles.length > 0, validJsonl: invalidLines === 0, uniqueRecordIds: duplicateRecordIds.length === 0, recordingCaptured: manifest.recording !== undefined, narrationAssetsPresent: narrationFiles.length > 0 };
const report = { auditedAtUtc: new Date().toISOString(), sessionId: manifest.sessionId || basename(root), root, manifest, counts, narrationFiles, duplicateRecordIds, invalidLines, checks, passed: Object.entries(checks).filter(([key]) => key !== "narrationAssetsPresent").every(([, value]) => value) };
await writeFile(join(root, "reports", "commissioning-audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.passed ? 0 : 1;
