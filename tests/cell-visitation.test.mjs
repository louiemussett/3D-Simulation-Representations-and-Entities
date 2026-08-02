import test from "node:test";
import assert from "node:assert/strict";
import { visitNearbyCells } from "../src/cell-visitation.js";

test("direct visitation preserves the former z-then-x traversal order", () => {
  const seen = [];
  visitNearbyCells({ x: 0, z: 0 }, 2, 4, (x, z) => ({ x, z }), (cell) => seen.push(`${cell.x},${cell.z}`));
  assert.deepEqual(seen, ["0,-2", "-1,-1", "0,-1", "1,-1", "-2,0", "-1,0", "0,0", "1,0", "2,0", "-1,1", "0,1", "1,1", "0,2"]);
});

test("direct visitation creates no intermediate cell array", () => {
  let visits = 0;
  assert.equal(visitNearbyCells({ x: 1, z: 1 }, 1, 5, (x, z) => ({ x, z }), () => { visits += 1; }), undefined);
  assert.equal(visits, 5);
});
