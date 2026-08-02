import test from "node:test";
import assert from "node:assert/strict";
import { compactTrace, formatTrace, TRACE_HISTORY_LIMIT } from "../src/trace-data.js";

const record = (tick) => ({ tick, contacts: 2, primary: null, drive: "rest", actionKey: "rest", deltas: { energy: 0, hydration: 0, health: 0 }, entityIndicator: .5, viability: .5, mismatch: 0, feedback: "suppressed", capabilityFlags: 0 });
test("compact trace history remains bounded", () => { let history = []; for (let tick = 0; tick < 100; tick++) history = compactTrace(record(tick), history); assert.equal(history.length, TRACE_HISTORY_LIMIT); assert.equal(history[0].tick, 68); });
test("human readable trace is generated on demand", () => { const stored = record(1); assert.equal(stored.trace, undefined); assert.match(formatTrace(stored).join(" "), /Action: rest/); });
