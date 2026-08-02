export class FixedTrailBuffer {
  constructor(capacity = 16) { this.capacity = capacity; this.positions = new Float32Array(capacity * 3); this.times = new Float64Array(capacity); this.count = 0; this.lastX = NaN; this.lastZ = NaN; }
  sample(x, y, z, time) {
    if (x === this.lastX && z === this.lastZ) return false;
    if (this.count === this.capacity) {
      this.positions.copyWithin(0, 3); this.times.copyWithin(0, 1); this.count -= 1;
    }
    const offset = this.count * 3; this.positions[offset] = x; this.positions[offset + 1] = y; this.positions[offset + 2] = z; this.times[this.count] = time; this.count += 1; this.lastX = x; this.lastZ = z; return true;
  }
  expire(before) {
    let remove = 0; while (remove < this.count && this.times[remove] < before) remove += 1;
    if (!remove) return false;
    this.positions.copyWithin(0, remove * 3, this.count * 3); this.times.copyWithin(0, remove, this.count); this.count -= remove;
    if (!this.count) { this.lastX = NaN; this.lastZ = NaN; }
    return true;
  }
}

export function updateTrailGeometry(geometry, attribute, trail) {
  attribute.needsUpdate = true; geometry.setDrawRange(0, trail.count); return geometry;
}
