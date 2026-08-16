/**
 * Allocation-light deterministic min heap.
 *
 * The caller supplies a comparator.  Equal comparator values retain insertion
 * order so replacing an Array#sort queue never introduces platform-dependent
 * routing or pathfinding ties.
 */
export class StableMinHeap {
  constructor(compare = (left, right) => left - right) {
    if (typeof compare !== "function") throw new TypeError("StableMinHeap requires a comparator");
    this.compare = compare;
    this.items = [];
    this.sequence = 0;
  }

  get size() { return this.items.length; }

  clear() { this.items.length = 0; this.sequence = 0; }

  push(value) {
    const entry = { value, sequence: this.sequence++ };
    const items = this.items;
    let index = items.length;
    items.push(entry);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this._compareEntries(items[parent], entry) <= 0) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = entry;
    return value;
  }

  peek() { return this.items[0]?.value; }

  pop() {
    const items = this.items;
    if (!items.length) return undefined;
    const first = items[0].value;
    const tail = items.pop();
    if (!items.length) return first;
    let index = 0;
    while (true) {
      const left = index * 2 + 1;
      if (left >= items.length) break;
      const right = left + 1;
      const child = right < items.length && this._compareEntries(items[right], items[left]) < 0 ? right : left;
      if (this._compareEntries(tail, items[child]) <= 0) break;
      items[index] = items[child];
      index = child;
    }
    items[index] = tail;
    return first;
  }

  _compareEntries(left, right) { return this.compare(left.value, right.value) || left.sequence - right.sequence; }
}
