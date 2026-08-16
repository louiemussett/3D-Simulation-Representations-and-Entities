const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const wrapAngle = angle => Math.atan2(Math.sin(angle), Math.cos(angle));

export function cameraRelativeMovement(input, cameraYaw) {
  const forward = clamp(Number(input.forward) || 0, -1, 1), right = clamp(Number(input.right) || 0, -1, 1);
  const length = Math.hypot(forward, right);
  if (length < 1e-4) return null;
  const normal = Math.max(1, length), localForward = forward / normal, localRight = right / normal;
  const x = Math.sin(cameraYaw) * localForward - Math.cos(cameraYaw) * localRight;
  const z = Math.cos(cameraYaw) * localForward + Math.sin(cameraYaw) * localRight;
  return { x, z, magnitude: Math.min(1, length), heading: Math.atan2(x, z) };
}

export function turnTowards(current, desired, maxRadians) {
  const difference = wrapAngle(desired - current);
  return wrapAngle(current + clamp(difference, -Math.max(0, maxRadians), Math.max(0, maxRadians)));
}

export class EmbodiedInput {
  constructor() { this.keys = new Set(); this.lookX = 0; this.lookY = 0; this.zoom = 0; this.sprint = false; }
  setKey(code, down) { if (down) this.keys.add(code); else this.keys.delete(code); this.sprint = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight"); }
  addLook(dx, dy) { this.lookX += Number(dx) || 0; this.lookY += Number(dy) || 0; }
  addZoom(delta) { this.zoom += Number(delta) || 0; }
  clear() { this.keys.clear(); this.lookX = this.lookY = this.zoom = 0; this.sprint = false; }
  sample() {
    const frame = { forward: (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0), right: (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0), headYaw: (this.keys.has("ArrowLeft") ? 1 : 0) - (this.keys.has("ArrowRight") ? 1 : 0), headPitch: (this.keys.has("ArrowDown") ? 1 : 0) - (this.keys.has("ArrowUp") ? 1 : 0), sprint: this.sprint, lookX: this.lookX, lookY: this.lookY, zoom: this.zoom };
    this.lookX = this.lookY = this.zoom = 0;
    return frame;
  }
}
