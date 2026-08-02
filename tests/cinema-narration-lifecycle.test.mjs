import test from "node:test";
import assert from "node:assert/strict";
import { CinemaNarrationLifecycle } from "../src/cinema-narration-lifecycle.js";

test("late narration results cannot cross a Cinema session boundary", () => {
  const lifecycle = new CinemaNarrationLifecycle();
  const first = lifecycle.begin();
  lifecycle.registerRequest("overview-1");
  lifecycle.invalidate();
  assert.equal(lifecycle.consumeRequest("overview-1"), undefined);
  assert.equal(lifecycle.current(first), false);
  const second = lifecycle.begin();
  assert.notEqual(second, first);
});

test("invalidating Cinema cancels delayed narration work", () => {
  let nextId = 0;
  const scheduled = new Map();
  const lifecycle = new CinemaNarrationLifecycle({
    setTimeoutFn: callback => { const id = ++nextId; scheduled.set(id, callback); return id; },
    clearTimeoutFn: id => scheduled.delete(id)
  });
  const generation = lifecycle.begin();
  let played = false;
  lifecycle.schedule(() => { played = true; }, 1000, generation);
  assert.equal(scheduled.size, 1);
  lifecycle.invalidate();
  assert.equal(scheduled.size, 0);
  assert.equal(played, false);
});
